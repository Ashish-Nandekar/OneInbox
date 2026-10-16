import { Request, Response } from 'express';
import { google } from 'googleapis';
import { z } from 'zod';
import { config } from '../config/env';
import { providerManager } from '../providers/ProviderManager';
import { prisma } from '../utils/db';
import { encrypt } from '../utils/crypto';
import { Provider } from '@prisma/client';
import { gmailSyncManager } from '../sync/GmailSyncManager';
import { telegramPollingManager } from '../sync/TelegramPollingManager';

const telegramConnectSchema = z.object({
  botToken: z.string().min(1, 'Bot token is required'),
});

export class IntegrationsController {
  // Gmail OAuth - Start flow
  async gmailAuth(req: Request, res: Response) {
    try {
      const oauth2Client = new google.auth.OAuth2(
        config.google.clientId,
        config.google.clientSecret,
        config.google.redirectUri
      );

      const state = Buffer.from(JSON.stringify({ userId: req.user!.id })).toString('base64');

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/gmail.modify',
        ],
        state,
        prompt: 'consent', // Force to get refresh token
      });

      res.json({
        success: true,
        data: { authUrl },
      });
    } catch (error) {
      console.error('Gmail auth error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GMAIL_AUTH_FAILED',
          message: 'Failed to generate Gmail authorization URL',
        },
      });
    }
  }

  // Gmail OAuth - Callback
  async gmailCallback(req: Request, res: Response) {
    try {
      const { code, state, error } = req.query;

      if (error) {
        return res.redirect(`${config.urls.client}/app?error=gmail_auth_failed`);
      }

      if (!code || !state) {
        return res.redirect(`${config.urls.client}/app?error=missing_params`);
      }

      // Decode state to get userId
      const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      const userId = stateData.userId;

      // Get Gmail provider
      const gmailProvider = providerManager.getProvider(Provider.gmail);

      // Connect account
      const accountResult = await gmailProvider.connectAccount(code as string);

      // Encrypt credentials
      const encryptedCredential = encrypt(accountResult.encryptedCredential);

      // Save to database
      const account = await prisma.connectedAccount.create({
        data: {
          userId,
          provider: Provider.gmail,
          displayName: accountResult.displayName,
          externalAccountId: accountResult.externalAccountId,
          encryptedCredential,
          status: 'connected',
        },
      });

      // Start Gmail sync
      await gmailSyncManager.startSync(account.id, userId);

      res.redirect(`${config.urls.client}/app?success=gmail_connected`);
    } catch (error) {
      console.error('Gmail callback error:', error);
      res.redirect(`${config.urls.client}/app?error=gmail_connection_failed`);
    }
  }

  // Telegram - Connect bot
  async telegramConnect(req: Request, res: Response) {
    try {
      const { botToken } = telegramConnectSchema.parse(req.body);
      const userId = req.user!.id;

      // Get Telegram provider
      const telegramProvider = providerManager.getProvider(Provider.telegram);

      // Connect account (validates bot token)
      const accountResult = await telegramProvider.connectAccount({ botToken });

      // Encrypt credentials
      const encryptedCredential = encrypt(accountResult.encryptedCredential);

      // Save to database
      const account = await prisma.connectedAccount.create({
        data: {
          userId,
          provider: Provider.telegram,
          displayName: accountResult.displayName,
          externalAccountId: accountResult.externalAccountId,
          encryptedCredential,
          status: 'connected',
        },
      });

      // Start Telegram polling
      await telegramPollingManager.startPolling(account.id, userId);

      res.status(201).json({
        success: true,
        data: {
          id: account.id,
          provider: account.provider,
          displayName: account.displayName,
          status: account.status,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0].message,
          },
        });
      }

      console.error('Telegram connect error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'TELEGRAM_CONNECTION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to connect Telegram bot',
        },
      });
    }
  }

  // Get all connected accounts
  async getAccounts(req: Request, res: Response) {
    try {
      const userId = req.user!.id;

      const accounts = await prisma.connectedAccount.findMany({
        where: { userId },
        select: {
          id: true,
          provider: true,
          displayName: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.json({
        success: true,
        data: accounts,
      });
    } catch (error) {
      console.error('Get accounts error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch accounts',
        },
      });
    }
  }

  // Disconnect account
  async disconnectAccount(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const account = await prisma.connectedAccount.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!account) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ACCOUNT_NOT_FOUND',
            message: 'Account not found',
          },
        });
      }

      // Stop sync/polling
      if (account.provider === Provider.gmail) {
        gmailSyncManager.stopSync(account.id);
      } else if (account.provider === Provider.telegram) {
        telegramPollingManager.stopPolling(account.id);
      }

      // Get provider and disconnect
      const provider = providerManager.getProvider(account.provider);
      await provider.disconnectAccount(account);

      // Update status
      await prisma.connectedAccount.update({
        where: { id },
        data: { status: 'disconnected' },
      });

      res.json({
        success: true,
        message: 'Account disconnected successfully',
      });
    } catch (error) {
      console.error('Disconnect account error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DISCONNECT_FAILED',
          message: 'Failed to disconnect account',
        },
      });
    }
  }

  // Manual sync for Gmail
  async syncGmail(req: Request, res: Response) {
    try {
      const { accountId } = req.params;
      const userId = req.user!.id;

      const account = await prisma.connectedAccount.findFirst({
        where: {
          id: accountId,
          userId,
          provider: Provider.gmail,
        },
      });

      if (!account) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ACCOUNT_NOT_FOUND',
            message: 'Gmail account not found',
          },
        });
      }

      await gmailSyncManager.triggerManualSync(accountId, userId);

      res.json({
        success: true,
        message: 'Gmail sync triggered',
      });
    } catch (error) {
      console.error('Gmail sync error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SYNC_FAILED',
          message: 'Failed to sync Gmail account',
        },
      });
    }
  }
}

export const integrationsController = new IntegrationsController();
