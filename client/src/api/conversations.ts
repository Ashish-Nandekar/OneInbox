import { apiClient } from './client';
import { Conversation, Message } from '../types';

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
};
