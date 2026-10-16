import { Telegraf } from 'telegraf';
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
import { prisma } from '../../utils/db';

interface TelegramCredentials {
  botToken: string;
}

export class TelegramProvider implements MessagingProvider {
  readonly providerType = Provider.telegram;

  private getBot(credentials: TelegramCredentials) {
    return new Telegraf(credentials.botToken);
  }

  async connectAccount(config: unknown): Promise<ConnectedAccountResult> {
    if (typeof config !== 'object' || config === null || !('botToken' in config)) {
      throw new Error('Invalid Telegram configuration');
    }

    const { botToken } = config as { botToken: string };

    if (!botToken || typeof botToken !== 'string') {
      throw new Error('Bot token is required');
    }

    // Validate bot token using getMe
    const bot = new Telegraf(botToken);
    
    try {
      const me = await bot.telegram.getMe();

      const credentials: TelegramCredentials = {
        botToken,
      };

      return {
        displayName: me.username || me.first_name,
        externalAccountId: me.id.toString(),
        encryptedCredential: JSON.stringify(credentials),
      };
    } catch (error) {
      console.error('Telegram bot validation failed:', error);
      throw new Error('Invalid bot token');
    }
  }

  async disconnectAccount(account: ConnectedAccount): Promise<void> {
    // No special cleanup needed for Telegram
    console.log(`Disconnecting Telegram account: ${account.displayName}`);
  }

  async sync(account: ConnectedAccount, userId: string): Promise<SyncResult> {
    // Telegram sync is handled by the polling service
    // This method is called for manual sync triggers
    return {
      conversationsCreated: 0,
      conversationsUpdated: 0,
      messagesCreated: 0,
    };
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
      provider: Provider.telegram,
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
      platform: Provider.telegram,
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
    const credentials = JSON.parse(decrypt(account.encryptedCredential)) as TelegramCredentials;
    const bot = this.getBot(credentials);

    try {
      const chatId = conversation.externalConversationId;

      const sentMessage = await bot.telegram.sendMessage(chatId, message.content);

      return {
        providerMessageId: sentMessage.message_id.toString(),
        timestamp: new Date(sentMessage.date * 1000),
        status: MessageStatus.sent,
      };
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      throw new Error('Failed to send message');
    }
  }

  async validateCredentials(credentials: string): Promise<boolean> {
    try {
      const creds = JSON.parse(decrypt(credentials)) as TelegramCredentials;
      const bot = this.getBot(creds);
      
      await bot.telegram.getMe();
      return true;
    } catch (error) {
      return false;
    }
  }

  async sendNewMessage(
    account: ConnectedAccount,
    message: { chatId: string; content: string },
    userId: string
  ): Promise<{
    messageId: string;
    conversationId: string;
    timestamp: Date;
  }> {
    const credentials = JSON.parse(decrypt(account.encryptedCredential)) as TelegramCredentials;
    const bot = this.getBot(credentials);

    try {
      // Send the message
      const sentMessage = await bot.telegram.sendMessage(message.chatId, message.content);

      const timestamp = new Date(sentMessage.date * 1000);

      // Get chat info
      const chat = sentMessage.chat;
      const conversationTitle =
        chat.type === 'private'
          ? `${chat.first_name || ''}${chat.last_name ? ' ' + chat.last_name : ''}`
          : chat.title || 'Telegram Chat';

      // Create or find conversation
      const conversation = await prisma.conversation.upsert({
        where: {
          userId_connectedAccountId_externalConversationId: {
            userId,
            connectedAccountId: account.id,
            externalConversationId: message.chatId,
          },
        },
        create: {
          userId,
          connectedAccountId: account.id,
          externalConversationId: message.chatId,
          title: conversationTitle,
          lastMessagePreview: message.content.substring(0, 100),
          lastActivityAt: timestamp,
        },
        update: {
          lastMessagePreview: message.content.substring(0, 100),
          lastActivityAt: timestamp,
        },
      });

      // Get bot info for sender details
      const botInfo = await bot.telegram.getMe();

      // Create message record
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          providerMessageId: sentMessage.message_id.toString(),
          senderExternalId: botInfo.id.toString(),
          senderName: botInfo.first_name,
          senderUsername: botInfo.username,
          content: message.content,
          type: 'text',
          direction: 'outgoing',
          status: 'sent',
          timestamp,
          metadata: {
            chatType: chat.type,
            chatId: chat.id,
          },
        },
      });

      // Emit via Socket.IO
      try {
        const { io } = require('../app');
        io.to(`user:${userId}`).emit('conversation:updated', {
          conversationId: conversation.id,
        });
      } catch (error) {
        console.error('Failed to emit socket event:', error);
      }

      return {
        messageId: sentMessage.message_id.toString(),
        conversationId: conversation.id,
        timestamp,
      };
    } catch (error) {
      console.error('Error sending new Telegram message:', error);
      throw new Error('Failed to send Telegram message');
    }
  }

  // Helper method to process incoming Telegram updates
  async processUpdate(account: ConnectedAccount, userId: string, update: any): Promise<void> {
    if (!update.message) {
      return;
    }

    const message = update.message;
    const chat = message.chat;
    const from = message.from;

    // Create or update conversation
    const conversationTitle = 
      chat.type === 'private' 
        ? `${from.first_name}${from.last_name ? ' ' + from.last_name : ''}`
        : chat.title || 'Telegram Chat';

    const conversation = await prisma.conversation.upsert({
      where: {
        userId_connectedAccountId_externalConversationId: {
          userId,
          connectedAccountId: account.id,
          externalConversationId: chat.id.toString(),
        },
      },
      create: {
        userId,
        connectedAccountId: account.id,
        externalConversationId: chat.id.toString(),
        title: conversationTitle,
        lastMessagePreview: message.text?.substring(0, 100) || '(Media)',
        lastActivityAt: new Date(message.date * 1000),
      },
      update: {
        lastMessagePreview: message.text?.substring(0, 100) || '(Media)',
        lastActivityAt: new Date(message.date * 1000),
        unreadCount: { increment: 1 },
      },
    });

    // Messages received via polling are ALWAYS incoming (from other users to your bot)
    // Outgoing messages (that you send) are created via sendMessage() before polling sees them
    const isOutgoing = false;

    // Create or update message to avoid duplicates
    try {
      await prisma.message.upsert({
        where: {
          conversationId_providerMessageId: {
            conversationId: conversation.id,
            providerMessageId: message.message_id.toString(),
          },
        },
        update: {}, // Don't update if exists
        create: {
          conversationId: conversation.id,
          providerMessageId: message.message_id.toString(),
          senderExternalId: from.id.toString(),
          senderName: `${from.first_name}${from.last_name ? ' ' + from.last_name : ''}`,
          senderUsername: from.username,
          content: message.text || '(Media message)',
          type: 'text',
          direction: isOutgoing ? 'outgoing' : 'incoming',
          status: 'sent',
          timestamp: new Date(message.date * 1000),
          metadata: {
            chatType: chat.type,
            chatId: chat.id,
          },
        },
      });
    } catch (error: any) {
      console.error('Error upserting Telegram message:', error);
    }
  }

  private async getBotInfo(account: ConnectedAccount) {
    const credentials = JSON.parse(decrypt(account.encryptedCredential)) as TelegramCredentials;
    const bot = this.getBot(credentials);
    return await bot.telegram.getMe();
  }
}
