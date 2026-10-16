import { Provider, MessageType, MessageDirection, MessageStatus } from '@prisma/client';

export interface UnifiedMessage {
  id: string;
  conversationId: string;
  providerMessageId: string;
  platform: Provider;
  sender: {
    id: string;
    name: string;
    address?: string;
    username?: string;
    avatarUrl?: string;
  };
  content: string;
  type: MessageType;
  direction: MessageDirection;
  status: MessageStatus;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface UnifiedConversation {
  id: string;
  provider: Provider;
  connectedAccountId: string;
  externalConversationId: string;
  title: string;
  avatarUrl?: string;
  lastMessagePreview?: string;
  lastActivityAt: Date;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OutgoingMessage {
  content: string;
  replyToMessageId?: string;
}

export interface ConnectedAccountResult {
  displayName: string;
  externalAccountId: string;
  encryptedCredential: string;
}

export interface SyncResult {
  conversationsCreated: number;
  conversationsUpdated: number;
  messagesCreated: number;
  cursor?: string;
}

export interface SendMessageResult {
  providerMessageId: string;
  timestamp: Date;
  status: MessageStatus;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface JWTPayload extends AuthUser {
  iat: number;
  exp: number;
}
