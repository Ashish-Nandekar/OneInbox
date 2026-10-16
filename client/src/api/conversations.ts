import { apiClient } from './client';
import { Conversation, Message } from '../types';

interface SearchResult {
  messageId: string;
  conversationId: string;
  conversationTitle: string;
  provider: string;
  senderName: string;
  content: string;
  timestamp: string;
  direction: string;
  snippet: string;
}

interface SearchResponse {
  query: string;
  totalResults: number;
  results: SearchResult[];
}

export const conversationsApi = {
  getConversations: async () => {
    const response = await apiClient.get<{ success: boolean; data: Conversation[] }>('/conversations');
    return response.data.data;
  },

  getConversation: async (id: string) => {
    const response = await apiClient.get<{ success: boolean; data: Conversation }>(`/conversations/${id}`);
    return response.data.data;
  },

  getMessages: async (conversationId: string) => {
    const response = await apiClient.get<{ success: boolean; data: Message[] }>(`/conversations/${conversationId}/messages`);
    return response.data.data;
  },

  sendMessage: async (conversationId: string, content: string) => {
    const response = await apiClient.post<{ success: boolean; data: Message }>(`/conversations/${conversationId}/messages`, {
      content,
    });
    return response.data.data;
  },

  markAsRead: async (conversationId: string) => {
    await apiClient.patch(`/conversations/${conversationId}/read`);
  },

  deleteConversation: async (conversationId: string) => {
    await apiClient.delete(`/conversations/${conversationId}`);
  },

  searchMessages: async (query: string, filters?: {
    provider?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }) => {
    const params = new URLSearchParams({ q: query });
    if (filters?.provider && filters.provider !== 'all') params.append('provider', filters.provider);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const response = await apiClient.get<{ success: boolean; data: SearchResponse }>(`/conversations/search?${params.toString()}`);
    return response.data.data;
  },

  markAllReadByProvider: async (provider: string) => {
    const response = await apiClient.post(`/conversations/provider/${provider}/mark-all-read`);
    return response.data.data;
  },
};
