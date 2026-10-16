import { Provider, ConnectedAccount } from '@prisma/client';
import {
  UnifiedMessage,
  UnifiedConversation,
  OutgoingMessage,
  ConnectedAccountResult,
  SyncResult,
  SendMessageResult,
} from '../types';

export interface MessagingProvider {
  readonly providerType: Provider;

  /**
   * Connect a new account with provider-specific configuration
   */
  connectAccount(config: unknown): Promise<ConnectedAccountResult>;

  /**
   * Disconnect an account
   */
  disconnectAccount(account: ConnectedAccount): Promise<void>;

  /**
   * Synchronize messages and conversations for an account
   */
  sync(account: ConnectedAccount, userId: string): Promise<SyncResult>;

  /**
   * Get conversations for an account
   */
  getConversations(account: ConnectedAccount, userId: string): Promise<UnifiedConversation[]>;

  /**
   * Get messages for a specific conversation
   */
  getMessages(
    account: ConnectedAccount,
    externalConversationId: string,
    userId: string
  ): Promise<UnifiedMessage[]>;

  /**
   * Send a message to a conversation
   */
  sendMessage(
    account: ConnectedAccount,
    conversation: UnifiedConversation,
    message: OutgoingMessage,
    userId: string
  ): Promise<SendMessageResult>;

  /**
   * Validate provider-specific credentials
   */
  validateCredentials(credentials: string): Promise<boolean>;
}
