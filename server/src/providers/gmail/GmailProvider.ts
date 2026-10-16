import { google } from 'googleapis';
import { Provider, ConnectedAccount, MessageStatus } from '@prisma/client';
import { MessagingProvider } from '../MessagingProvider';
import {
  UnifiedMessage,
  UnifiedConversation,
  OutgoingMessage,
  ConnectedAccountResult,
  SyncResult,
  SendMessageResult,
} from '../../types';
import { decrypt } from '../../utils/crypto';
import { config } from '../../config/env';
import { prisma } from '../../utils/db';

interface GmailCredentials {
  accessToken: string;
  refreshToken: string;
  expiryDate?: number;
}

export class GmailProvider implements MessagingProvider {
  readonly providerType = Provider.gmail;

  private getOAuth2Client(credentials: GmailCredentials) {
    const oauth2Client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );

    oauth2Client.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
      expiry_date: credentials.expiryDate,
    });

    return oauth2Client;
  }

  async connectAccount(authCode: unknown): Promise<ConnectedAccountResult> {
    if (typeof authCode !== 'string') {
      throw new Error('Invalid authorization code');
    }

    const oauth2Client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(authCode);
    
    if (!tokens.refresh_token) {
      throw new Error('No refresh token received');
    }

    oauth2Client.setCredentials(tokens);

    // Get user info
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });

    const credentials: GmailCredentials = {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date ?? undefined,
    };

    return {
      displayName: profile.data.emailAddress || 'Gmail Account',
      externalAccountId: profile.data.emailAddress || '',
      encryptedCredential: JSON.stringify(credentials),
    };
  }

  async disconnectAccount(account: ConnectedAccount): Promise<void> {
    // Optionally revoke token
    try {
      const credentials = JSON.parse(decrypt(account.encryptedCredential)) as GmailCredentials;
      const oauth2Client = this.getOAuth2Client(credentials);
      await oauth2Client.revokeCredentials();
    } catch (error) {
      console.error('Error revoking Gmail credentials:', error);
    }
  }

  async sync(account: ConnectedAccount, userId: string): Promise<SyncResult> {
    const credentials = JSON.parse(decrypt(account.encryptedCredential)) as GmailCredentials;
    const oauth2Client = this.getOAuth2Client(credentials);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    let conversationsCreated = 0;
    let conversationsUpdated = 0;
    let messagesCreated = 0;

    try {
      // Fetch recent threads (50 most recent)
      const threadsResponse = await gmail.users.threads.list({
        userId: 'me',
        maxResults: 50,
      });

      const threads = threadsResponse.data.threads || [];

      for (const thread of threads) {
        if (!thread.id) continue;

        // Get full thread details
        const threadData = await gmail.users.threads.get({
          userId: 'me',
          id: thread.id,
        });

        const messages = threadData.data.messages || [];
        if (messages.length === 0) continue;

        // Get last message for conversation preview
        const lastMessage = messages[messages.length - 1];
        const subject = this.getHeader(lastMessage, 'Subject') || '(No subject)';
        const from = this.getHeader(lastMessage, 'From') || 'Unknown';
        const to = this.getHeader(lastMessage, 'To') || '';
        const userEmail = account.externalAccountId.toLowerCase();
        
        // Determine conversation title based on direction
        let conversationTitle: string;
        if (from.toLowerCase().includes(userEmail)) {
          // Outgoing - show recipient
          conversationTitle = `To: ${this.extractName(to) || this.extractEmail(to)}`;
        } else {
          // Incoming - show sender name
          conversationTitle = this.extractName(from) || this.extractEmail(from) || 'Unknown Sender';
        }
        
        // Include subject in preview if different from sender
        const subjectPreview = subject !== '(No subject)' ? ` â€¢ ${subject}` : '';

        // Create or update conversation
        const conversation = await prisma.conversation.upsert({
          where: {
            userId_connectedAccountId_externalConversationId: {
              userId,
              connectedAccountId: account.id,
              externalConversationId: thread.id,
            },
          },
          create: {
            userId,
            connectedAccountId: account.id,
            externalConversationId: thread.id,
            title: conversationTitle,
            lastMessagePreview: this.getMessagePreview(lastMessage) + subjectPreview,
            lastActivityAt: new Date(parseInt(lastMessage.internalDate || '0')),
          },
          update: {
            title: conversationTitle,
            lastMessagePreview: this.getMessagePreview(lastMessage) + subjectPreview,
            lastActivityAt: new Date(parseInt(lastMessage.internalDate || '0')),
            unreadCount: { increment: 1 },
          },
        });

        const isNew = conversation.createdAt.getTime() === conversation.updatedAt.getTime();
        if (isNew) {
          conversationsCreated++;
        } else {
          conversationsUpdated++;
        }

        // Create messages
        for (const message of messages) {
          if (!message.id) continue;

          try {
            const from = this.getHeader(message, 'From') || 'Unknown';
            const to = this.getHeader(message, 'To') || '';
            const userEmail = account.externalAccountId.toLowerCase();

            // Determine direction
            const direction = from.toLowerCase().includes(userEmail) ? 'outgoing' : 'incoming';

            // Use upsert to avoid duplicate key errors
            await prisma.message.upsert({
              where: {
                conversationId_providerMessageId: {
                  conversationId: conversation.id,
                  providerMessageId: message.id,
                },
              },
              update: {}, // Don't update if exists
              create: {
                conversationId: conversation.id,
                providerMessageId: message.id,
                senderExternalId: from,
                senderName: this.extractName(from),
                senderAddress: this.extractEmail(from),
                content: this.getMessageBody(message),
                type: 'email',
                direction,
                status: 'sent',
                timestamp: new Date(parseInt(message.internalDate || '0')),
                metadata: {
                  subject: this.getHeader(message, 'Subject'),
                  to,
                  cc: this.getHeader(message, 'Cc'),
                },
              },
            });

            messagesCreated++;
          } catch (error: any) {
            // Message likely already exists
            if (!error.code || error.code !== 'P2002') {
              console.error('Error creating message:', error);
            }
          }
        }
      }

      return {
        conversationsCreated,
        conversationsUpdated,
        messagesCreated,
      };
    } catch (error) {
      console.error('Gmail sync error:', error);
      
      // Handle specific Gmail API errors
      if (error && typeof error === 'object' && 'code' in error) {
        const apiError = error as any;
        
        // Handle invalid_grant error (expired/revoked token)
        if (apiError.code === 400 && (apiError.message?.includes('invalid_grant') || apiError.error === 'invalid_grant')) {
          console.error(`❌ Gmail token expired or revoked for account ${account.id}. User needs to reconnect.`);
          
          // Emit socket event to notify user
          try {
            const { io } = require('../app');
            io.to(`user:${userId}`).emit('account:needs_reconnection', {
              accountId: account.id,
              provider: 'gmail',
              displayName: account.displayName,
              message: 'Your Gmail connection has expired. Please reconnect your account in Settings.',
            });
          } catch (socketError) {
            console.error('Failed to emit reconnection event:', socketError);
          }
          
          throw new Error('Gmail token expired. Please reconnect your account in Settings.');
        }
        
        if (apiError.code === 403 || apiError.status === 403) {
          console.error('Gmail API quota exceeded - will retry on next sync');
          // Don't throw - just log and continue
          return {
            conversationsCreated: 0,
            conversationsUpdated: 0,
            messagesCreated: 0,
          };
        }
        
        if (apiError.code === 401 || apiError.status === 401) {
          console.error('Gmail API authentication failed - token may be expired');
          // Mark account as needs reconnection
          await prisma.connectedAccount.update({
            where: { id: account.id },
            data: { status: 'error' },
          });
        }
      }
      
      throw new Error('Failed to sync Gmail account');
    }
  }

  async getConversations(account: ConnectedAccount, userId: string): Promise<UnifiedConversation[]> {
    const conversations = await prisma.conversation.findMany({
      where: {
        userId,
        connectedAccountId: account.id,
      },
      orderBy: {
        lastActivityAt: 'desc',
      },
    });

    return conversations.map(conv => ({
      id: conv.id,
      provider: Provider.gmail,
      connectedAccountId: conv.connectedAccountId,
      externalConversationId: conv.externalConversationId,
      title: conv.title,
      avatarUrl: conv.avatarUrl || undefined,
      lastMessagePreview: conv.lastMessagePreview || undefined,
      lastActivityAt: conv.lastActivityAt,
      unreadCount: conv.unreadCount,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    }));
  }

  async getMessages(
    account: ConnectedAccount,
    externalConversationId: string,
    userId: string
  ): Promise<UnifiedMessage[]> {
    const conversation = await prisma.conversation.findFirst({
      where: {
        userId,
        connectedAccountId: account.id,
        externalConversationId,
      },
      include: {
        messages: {
          orderBy: {
            timestamp: 'asc',
          },
        },
      },
    });

    if (!conversation) {
      return [];
    }

    return conversation.messages.map(msg => ({
      id: msg.id,
      conversationId: msg.conversationId,
      providerMessageId: msg.providerMessageId,
      platform: Provider.gmail,
      sender: {
        id: msg.senderExternalId,
        name: msg.senderName,
        address: msg.senderAddress || undefined,
        username: msg.senderUsername || undefined,
        avatarUrl: msg.senderAvatarUrl || undefined,
      },
      content: msg.content,
      type: msg.type,
      direction: msg.direction,
      status: msg.status,
      timestamp: msg.timestamp,
      metadata: msg.metadata as Record<string, unknown> | undefined,
    }));
  }

  async sendMessage(
    account: ConnectedAccount,
    conversation: UnifiedConversation,
    message: OutgoingMessage,
    userId: string
  ): Promise<SendMessageResult> {
    const credentials = JSON.parse(decrypt(account.encryptedCredential)) as GmailCredentials;
    const oauth2Client = this.getOAuth2Client(credentials);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    try {
      // Get original thread to extract email addresses
      const thread = await gmail.users.threads.get({
        userId: 'me',
        id: conversation.externalConversationId,
      });

      const lastMessage = thread.data.messages?.[thread.data.messages.length - 1];
      if (!lastMessage) {
        throw new Error('No messages in thread');
      }

      const to = this.getHeader(lastMessage, 'From');
      const subject = this.getHeader(lastMessage, 'Subject') || '';
      const messageId = this.getHeader(lastMessage, 'Message-ID');
      const references = this.getHeader(lastMessage, 'References') || '';

      // Build RFC-compliant email
      const email = [
        `To: ${to}`,
        `Subject: ${subject.startsWith('Re:') ? subject : 'Re: ' + subject}`,
        `In-Reply-To: ${messageId}`,
        `References: ${references} ${messageId}`.trim(),
        '',
        message.content,
      ].join('\r\n');

      // Encode in base64url
      const encodedMessage = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Send message
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
          threadId: conversation.externalConversationId,
        },
      });

      return {
        providerMessageId: response.data.id!,
        timestamp: new Date(),
        status: MessageStatus.sent,
      };
    } catch (error) {
      console.error('Error sending Gmail message:', error);
      throw new Error('Failed to send message');
    }
  }

  async validateCredentials(credentials: string): Promise<boolean> {
    try {
      const creds = JSON.parse(decrypt(credentials)) as GmailCredentials;
      const oauth2Client = this.getOAuth2Client(creds);
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      
      await gmail.users.getProfile({ userId: 'me' });
      return true;
    } catch (error) {
      return false;
    }
  }

  async sendNewEmail(
    account: ConnectedAccount,
    message: { to: string; subject?: string; content: string },
    userId: string
  ): Promise<{
    messageId: string;
    conversationId: string;
    threadId: string;
    timestamp: Date;
  }> {
    const credentials = JSON.parse(decrypt(account.encryptedCredential)) as GmailCredentials;
    const oauth2Client = this.getOAuth2Client(credentials);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    try {
      // Get sender email
      const profile = await gmail.users.getProfile({ userId: 'me' });
      const fromEmail = profile.data.emailAddress || '';

      // Build RFC-compliant email
      const email = [
        `From: ${fromEmail}`,
        `To: ${message.to}`,
        `Subject: ${message.subject || '(No Subject)'}`,
        '',
        message.content,
      ].join('\r\n');

      // Encode in base64url
      const encodedMessage = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Send message
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      const sentMessageId = response.data.id!;
      const threadId = response.data.threadId!;

      // Fetch the full message to get details
      const sentMessage = await gmail.users.messages.get({
        userId: 'me',
        id: sentMessageId,
      });

      const subject = this.getHeader(sentMessage.data, 'Subject') || '(No Subject)';
      const timestamp = new Date(parseInt(sentMessage.data.internalDate || '0'));

      // Create or find conversation
      const conversation = await prisma.conversation.upsert({
        where: {
          userId_connectedAccountId_externalConversationId: {
            userId,
            connectedAccountId: account.id,
            externalConversationId: threadId,
          },
        },
        create: {
          userId,
          connectedAccountId: account.id,
          externalConversationId: threadId,
          title: `To: ${message.to}`,
          lastMessagePreview: message.content.substring(0, 100),
          lastActivityAt: timestamp,
        },
        update: {
          lastMessagePreview: message.content.substring(0, 100),
          lastActivityAt: timestamp,
        },
      });

      // Create message record
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          providerMessageId: sentMessageId,
          senderExternalId: fromEmail,
          senderName: account.displayName,
          senderAddress: fromEmail,
          content: message.content,
          type: 'email',
          direction: 'outgoing',
          status: 'sent',
          timestamp,
          metadata: {
            subject,
            to: message.to,
          },
        },
      });

      // Emit via Socket.IO
      try {
        const { io } = require('../../app');
        io.to(`user:${userId}`).emit('conversation:updated', {
          conversationId: conversation.id,
        });
      } catch (error) {
        console.error('Failed to emit socket event:', error);
      }

      return {
        messageId: sentMessageId,
        conversationId: conversation.id,
        threadId,
        timestamp,
      };
    } catch (error: any) {
      console.error('Error sending new Gmail message:', error);
      
      // Provide specific error messages
      if (error.code === 400) {
        if (error.message?.includes('Invalid to header')) {
          throw new Error('Invalid email address. Please check the recipient email and try again.');
        } else if (error.message?.includes('recipient')) {
          throw new Error('Invalid recipient email address.');
        }
      } else if (error.code === 403 || error.code === 429) {
        throw new Error('Gmail API quota exceeded. Please wait a few minutes and try again.');
      } else if (error.code === 401) {
        throw new Error('Gmail authentication expired. Please reconnect your account in Settings.');
      } else if (error.message?.includes('invalid_grant')) {
        throw new Error('Gmail token expired. Please reconnect your account in Settings.');
      } else if (error.message?.includes('quota')) {
        throw new Error('Gmail quota exceeded. Please wait a few minutes before sending more emails.');
      }
      
      throw new Error('Failed to send email. Please check the recipient address and try again.');
    }
  }

  // Helper methods
  private getHeader(message: any, name: string): string | null {
    const headers = message.payload?.headers || [];
    const header = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
    return header?.value || null;
  }

  private getMessageBody(message: any): string {
    let htmlBody = '';
    let textBody = '';

    const getBody = (part: any): void => {
      if (part.mimeType === 'text/html' && part.body?.data) {
        htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.mimeType === 'text/plain' && part.body?.data) {
        textBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.parts) {
        part.parts.forEach(getBody);
      }
    };

    if (message.payload?.body?.data) {
      const decoded = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
      if (message.payload.mimeType === 'text/html') {
        htmlBody = decoded;
      } else {
        textBody = decoded;
      }
    } else if (message.payload?.parts) {
      message.payload.parts.forEach(getBody);
    }

    // Prefer HTML body, fallback to plain text, preserve line breaks in plain text
    if (htmlBody) {
      return htmlBody;
    } else if (textBody) {
      // Convert plain text to HTML with preserved formatting
      return textBody
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
    }
    
    return '(No content)';
  }

  private getMessagePreview(message: any): string {
    const body = this.getMessageBody(message);
    return body.substring(0, 100).replace(/\s+/g, ' ').trim();
  }

  private extractName(from: string): string {
    const match = from.match(/^"?([^"<]+)"?\s*</);
    return match ? match[1].trim() : from.split('@')[0];
  }

  private extractEmail(from: string): string {
    const match = from.match(/<([^>]+)>/);
    return match ? match[1] : from;
  }
}


