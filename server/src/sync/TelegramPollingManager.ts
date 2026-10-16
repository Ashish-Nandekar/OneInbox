import { Telegraf } from 'telegraf';
import { Provider } from '@prisma/client';
import { prisma } from '../utils/db';
import { decrypt } from '../utils/crypto';
import { TelegramProvider } from '../providers/telegram/TelegramProvider';
import { lockManager } from '../utils/lock';
import { config } from '../config/env';
import { io } from '../app';

interface TelegramCredentials {
  botToken: string;
}

interface PollingInstance {
  accountId: string;
  userId: string;
  bot: Telegraf;
  offset: number;
  intervalId: NodeJS.Timeout;
}

export class TelegramPollingManager {
  private pollingInstances: Map<string, PollingInstance> = new Map();
  private telegramProvider: TelegramProvider;

  constructor() {
    this.telegramProvider = new TelegramProvider();
  }

  async startPolling(accountId: string, userId: string) {
    // Don't start if already polling
    if (this.pollingInstances.has(accountId)) {
      console.log(`Already polling for account ${accountId}`);
      return;
    }

    const account = await prisma.connectedAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.provider !== Provider.telegram) {
      throw new Error('Invalid Telegram account');
    }

    const credentials = JSON.parse(decrypt(account.encryptedCredential)) as TelegramCredentials;
    const bot = new Telegraf(credentials.botToken);

    // Get initial offset from sync state
    let syncState = await prisma.syncState.findUnique({
      where: { connectedAccountId: accountId },
    });

    if (!syncState) {
      syncState = await prisma.syncState.create({
        data: {
          connectedAccountId: accountId,
          cursor: '0',
          status: 'idle',
        },
      });
    }

    const initialOffset = parseInt(syncState.cursor || '0', 10);

    const instance: PollingInstance = {
      accountId,
      userId,
      bot,
      offset: initialOffset,
      intervalId: null as any,
    };

    // Start polling
    const poll = async () => {
      try {
        await this.pollUpdates(instance);
      } catch (error) {
        console.error(`Telegram polling error for account ${accountId}:`, error);
        
        // Update sync state with error
        await prisma.syncState.update({
          where: { connectedAccountId: accountId },
          data: {
            status: 'error',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    };

    // Poll immediately, then on interval
    poll();
    instance.intervalId = setInterval(poll, config.sync.telegramPollInterval);

    this.pollingInstances.set(accountId, instance);
    console.log(`Started Telegram polling for account ${accountId}`);
  }

  stopPolling(accountId: string) {
    const instance = this.pollingInstances.get(accountId);
    
    if (instance) {
      clearInterval(instance.intervalId);
      this.pollingInstances.delete(accountId);
      console.log(`Stopped Telegram polling for account ${accountId}`);
    }
  }

  stopAll() {
    for (const [accountId] of this.pollingInstances) {
      this.stopPolling(accountId);
    }
  }

  private async pollUpdates(instance: PollingInstance) {
    const lockKey = `telegram-poll-${instance.accountId}`;
    
    if (lockManager.isLocked(lockKey)) {
      return;
    }
    
    const release = await lockManager.acquire(lockKey);
    
    try {
      const { bot, accountId, userId } = instance;

      const updates = await bot.telegram.getUpdates(
        instance.offset,
        100,
        0,
        []
      );

      if (updates.length === 0) {
        return;
      }

      for (const update of updates) {
        try {
          await this.telegramProvider.processUpdate(
            await prisma.connectedAccount.findUniqueOrThrow({
              where: { id: accountId },
            }),
            userId,
            update
          );

          if ('message' in update && update.message) {
            io.to(`user:${userId}`).emit('message:new', {
              accountId,
              provider: 'telegram',
              chatId: update.message.chat.id,
            });
          }

          instance.offset = update.update_id + 1;
        } catch (error) {
          console.error('Error processing Telegram update:', error);
        }
      }

      await prisma.syncState.update({
        where: { connectedAccountId: accountId },
        data: {
          cursor: instance.offset.toString(),
          lastSyncedAt: new Date(),
          status: 'idle',
          errorMessage: null,
        },
      });
    } finally {
      release();
    }
  }

  async initializeAllAccounts() {
    console.log('Initializing Telegram polling for all accounts...');

    const accounts = await prisma.connectedAccount.findMany({
      where: {
        provider: Provider.telegram,
        status: 'connected',
      },
    });

    for (const account of accounts) {
      try {
        await this.startPolling(account.id, account.userId);
      } catch (error) {
        console.error(`Failed to start polling for account ${account.id}:`, error);
      }
    }

    console.log(`Started polling for ${accounts.length} Telegram accounts`);
  }
}

export const telegramPollingManager = new TelegramPollingManager();



