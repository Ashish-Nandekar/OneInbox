import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/db';
import { providerManager } from '../providers/ProviderManager';
import { MessageDirection, MessageStatus } from '@prisma/client';
import { io } from '../app';

const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
});

export class ConversationsController {
  // Get all conversations for the user
  async getConversations(req: Request, res: Response) {
    try {
      const userId = req.user!.id;

      const conversations = await prisma.conversation.findMany({
        where: { userId },
        include: {
          connectedAccount: {
            select: {
              provider: true,
              displayName: true,
            },
          },
        },
        orderBy: {
          lastActivityAt: 'desc',
        },
      });

      res.json({
        success: true,
        data: conversations,
      });
    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch conversations',
        },
      });
    }
  }

  // Get single conversation
  async getConversation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const conversation = await prisma.conversation.findFirst({
        where: {
          id,
          userId,
        },
        include: {
          connectedAccount: {
            select: {
              provider: true,
              displayName: true,
            },
          },
        },
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Conversation not found',
          },
        });
      }

      res.json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      console.error('Get conversation error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch conversation',
        },
      });
    }
  }

  // Get messages for a conversation
  async getMessages(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Verify conversation belongs to user
      const conversation = await prisma.conversation.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Conversation not found',
          },
        });
      }

      const messages = await prisma.message.findMany({
        where: {
          conversationId: id,
        },
        orderBy: {
          timestamp: 'asc',
        },
      });

      res.json({
        success: true,
        data: messages,
      });
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch messages',
        },
      });
    }
  }

  // Send a message
  async sendMessage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const { content } = sendMessageSchema.parse(req.body);

      // Get conversation with account info
      const conversation = await prisma.conversation.findFirst({
        where: {
          id,
          userId,
        },
        include: {
          connectedAccount: true,
        },
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Conversation not found',
          },
        });
      }

      // Create pending message
      const pendingMessage = await prisma.message.create({
        data: {
          conversationId: id,
          providerMessageId: `pending_${Date.now()}`,
          senderExternalId: conversation.connectedAccount.externalAccountId,
          senderName: conversation.connectedAccount.displayName,
          content,
          type: conversation.connectedAccount.provider === 'gmail' ? 'email' : 'text',
          direction: MessageDirection.outgoing,
          status: MessageStatus.pending,
          timestamp: new Date(),
        },
      });

      // Emit pending message via Socket.IO
      io.to(`user:${userId}`).emit('message:new', {
        conversationId: id,
        message: pendingMessage,
      });

      // Send via provider
      try {
        const provider = providerManager.getProvider(conversation.connectedAccount.provider);

        const result = await provider.sendMessage(
          conversation.connectedAccount,
          {
            id: conversation.id,
            provider: conversation.connectedAccount.provider,
            connectedAccountId: conversation.connectedAccountId,
            externalConversationId: conversation.externalConversationId,
            title: conversation.title,
            avatarUrl: conversation.avatarUrl || undefined,
            lastMessagePreview: conversation.lastMessagePreview || undefined,
            lastActivityAt: conversation.lastActivityAt,
            unreadCount: conversation.unreadCount,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
          },
          { content },
          userId
        );

        // Update message with actual provider message ID
        const sentMessage = await prisma.message.update({
          where: { id: pendingMessage.id },
          data: {
            providerMessageId: result.providerMessageId,
            status: result.status,
            timestamp: result.timestamp,
          },
        });

        // Update conversation
        await prisma.conversation.update({
          where: { id },
          data: {
            lastMessagePreview: content.substring(0, 100),
            lastActivityAt: result.timestamp,
          },
        });

        // Emit success via Socket.IO
        io.to(`user:${userId}`).emit('message:sent', {
          conversationId: id,
          message: sentMessage,
        });

        res.status(201).json({
          success: true,
          data: sentMessage,
        });
      } catch (error) {
        // Update message status to failed
        const failedMessage = await prisma.message.update({
          where: { id: pendingMessage.id },
          data: {
            status: MessageStatus.failed,
          },
        });

        // Emit failure via Socket.IO
        io.to(`user:${userId}`).emit('message:failed', {
          conversationId: id,
          message: failedMessage,
        });

        throw error;
      }
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

      console.error('Send message error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SEND_FAILED',
          message: error instanceof Error ? error.message : 'Failed to send message',
        },
      });
    }
  }

  // Mark conversation as read
  async markAsRead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Verify conversation belongs to user
      const conversation = await prisma.conversation.findFirst({
        where: { id, userId },
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          },
        });
      }

      // Reset unread count
      await prisma.conversation.update({
        where: { id },
        data: { unreadCount: 0 },
      });

      // Emit update via Socket.IO
      io.to(`user:${userId}`).emit('conversation:read', { conversationId: id });

      res.json({
        success: true,
        data: { id, unreadCount: 0 },
      });
    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to mark conversation as read',
        },
      });
    }
  }

  // Delete conversation
  async deleteConversation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Verify conversation belongs to user
      const conversation = await prisma.conversation.findFirst({
        where: { id, userId },
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          },
        });
      }

      // Delete conversation (cascade deletes messages)
      await prisma.conversation.delete({
        where: { id },
      });

      // Emit update via Socket.IO
      io.to(`user:${userId}`).emit('conversation:deleted', { conversationId: id });

      res.json({
        success: true,
        data: { id },
      });
    } catch (error) {
      console.error('Delete conversation error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to delete conversation',
        },
      });
    }
  }
}

export const conversationsController = new ConversationsController();
