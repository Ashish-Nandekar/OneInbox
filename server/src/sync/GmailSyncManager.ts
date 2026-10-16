import { Provider } from '@prisma/client';
import { prisma } from '../utils/db';
import { GmailProvider } from '../providers/gmail/GmailProvider';
import { lockManager } from '../utils/lock';
import { config } from '../config/env';
import { io } from '../app';

interface SyncInstance {
  accountId: string;
  userId: string;
  intervalId: NodeJS.Timeout;
}

export class GmailSyncManager {
  private syncInstances: Map<string, SyncInstance> = new Map();
  private gmailProvider: GmailProvider;

  constructor() {
    this.gmailProvider = new GmailProvider();
  }

  async startSync(accountId: string, userId: string) {
    // Don't start if already syncing
    if (this.syncInstances.has(accountId)) {
      console.log(`Already syncing for account ${accountId}`);
      return;
    }

    const account = await prisma.connectedAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.provider !== Provider.gmail) {
      throw new Error('Invalid Gmail account');
    }

    const instance: SyncInstance = {
      accountId,
      userId,
      intervalId: null as any,
    };

    // Start syncing
    const sync = async () => {
      try {
        await this.syncAccount(accountId, userId);
      } catch (error) {
        console.error(`Gmail sync error for account ${accountId}:`, error);
        
        // Update sync state with error
        await prisma.syncState.upsert({
          where: { connectedAccountId: accountId },
          create: {
            connectedAccountId: accountId,
            status: 'error',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
          update: {
            status: 'error',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    };

    // Sync immediately, then on interval
    sync();
    instance.intervalId = setInterval(sync, config.sync.gmailSyncInterval);

    this.syncInstances.set(accountId, instance);
    console.log(`Started Gmail sync for account ${accountId}`);
  }

  stopSync(accountId: string) {
    const instance = this.syncInstances.get(accountId);
    
    if (instance) {
      clearInterval(instance.intervalId);
      this.syncInstances.delete(accountId);
      console.log(`Stopped Gmail sync for account ${accountId}`);
    }
  }

  stopAll() {
    for (const [accountId] of this.syncInstances) {
      this.stopSync(accountId);
    }
  }

  private async syncAccount(accountId: string, userId: string) {
    const lockKey = `gmail-sync-${accountId}`;
    
    // Skip if already syncing
    if (lockManager.isLocked(lockKey)) {
      console.log(`Sync already in progress for account ${accountId}, skipping`);
      return;
    }
    
    // Acquire lock
    const release = await lockManager.acquire(lockKey);
    
    try {
      const account = await prisma.connectedAccount.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        return;
      }

      // Update sync state to syncing
      await prisma.syncState.upsert({
        where: { connectedAccountId: accountId },
        create: {
          connectedAccountId: accountId,
          status: 'syncing',
        },
        update: {
          status: 'syncing',
        },
      });

      const result = await this.gmailProvider.sync(account, userId);

      // Update sync state
      await prisma.syncState.update({
        where: { connectedAccountId: accountId },
        data: {
          status: 'idle',
          lastSyncedAt: new Date(),
          errorMessage: null,
        },
      });

      // Emit Socket.IO events if new messages
      if (result.messagesCreated > 0) {
        io.to(`user:${userId}`).emit('sync:completed', {
          accountId,
          provider: 'gmail',
          messagesCreated: result.messagesCreated,
        });

        io.to(`user:${userId}`).emit('conversations:updated');
      }

      console.log(`Gmail sync completed for ${accountId}:`, result);
    } catch (error) {
      throw error;
    } finally {
      release();
    }
  }

  async triggerManualSync(accountId: string, userId: string) {
    await this.syncAccount(accountId, userId);
  }

  async initializeAllAccounts() {
    console.log('Initializing Gmail sync for all accounts...');

    const accounts = await prisma.connectedAccount.findMany({
      where: {
        provider: Provider.gmail,
        status: 'connected',
      },
    });

    for (const account of accounts) {
      try {
        await this.startSync(account.id, account.userId);
      } catch (error) {
        console.error(`Failed to start sync for account ${account.id}:`, error);
      }
    }

    console.log(`Started sync for ${accounts.length} Gmail accounts`);
  }
}

export const gmailSyncManager = new GmailSyncManager();
