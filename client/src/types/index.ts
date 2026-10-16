export interface User {
  id: string;
  name: string;
  email: string;
}

export interface ConnectedAccount {
  id: string;
  provider: 'gmail' | 'telegram';
  displayName: string;
  status: 'connected' | 'disconnected' | 'error';
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  lastMessagePreview?: string;
  lastActivityAt: string;
  unreadCount: number;
  avatarUrl?: string;
  connectedAccount: {
    provider: 'gmail' | 'telegram';
    displayName: string;
  };
}

export interface Message {
  id: string;
  conversationId: string;
  providerMessageId: string;
  senderName: string;
  senderAddress?: string;
  senderUsername?: string;
  content: string;
  type: 'text' | 'email' | 'unknown';
  direction: 'incoming' | 'outgoing';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  createdAt: string;
}
