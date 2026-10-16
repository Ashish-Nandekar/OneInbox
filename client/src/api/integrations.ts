import { apiClient } from './client';
import { ConnectedAccount } from '../types';

export const integrationsApi = {
  getAccounts: async () => {
    const response = await apiClient.get<{ success: boolean; data: ConnectedAccount[] }>('/integrations/accounts');
    return response.data.data;
  },

  disconnectAccount: async (id: string) => {
    await apiClient.delete(`/integrations/accounts/${id}`);
  },

  getGmailAuthUrl: async () => {
    const response = await apiClient.get<{ success: boolean; data: { authUrl: string } }>('/integrations/gmail/auth');
    return response.data.data.authUrl;
  },

  connectTelegram: async (botToken: string) => {
    const response = await apiClient.post<{ success: boolean; data: ConnectedAccount }>('/integrations/telegram', {
      botToken,
    });
    return response.data.data;
  },

  syncGmail: async (accountId: string) => {
    await apiClient.post(`/integrations/gmail/sync/${accountId}`);
  },
};

