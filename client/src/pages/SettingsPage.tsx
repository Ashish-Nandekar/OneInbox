import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, MessageCircle, Trash2, Plus } from 'lucide-react';
import { integrationsApi } from '../api/integrations';
import { useAuthStore } from '../stores/authStore';
import { showSuccessNotification, showErrorNotification } from '../utils/notifications';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: integrationsApi.getAccounts,
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => integrationsApi.disconnectAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      showSuccessNotification('Account disconnected successfully');
    },
    onError: () => {
      showErrorNotification('Failed to disconnect account');
    },
  });

  const handleConnectGmail = async () => {
    try {
      const authUrl = await integrationsApi.getGmailAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      showErrorNotification('Failed to connect Gmail. Please try again.');
    }
  };

  const handleConnectTelegram = () => {
    const botToken = prompt('Enter your Telegram Bot Token (from @BotFather):');
    if (botToken) {
      integrationsApi
        .connectTelegram(botToken)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['accounts'] });
          showSuccessNotification('Telegram bot connected successfully!');
        })
        .catch(() => {
          showErrorNotification('Failed to connect Telegram. Please check your bot token.');
        });
    }
  };

  const handleDisconnect = (id: string, displayName: string) => {
    if (confirm(`Disconnect ${displayName}? All conversations will be deleted.`)) {
      disconnectMutation.mutate(id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4 bg-white">
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* User Profile Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <p className="text-sm text-gray-900">{user?.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-sm text-gray-900">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Connected Accounts Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Connected Accounts</h2>

            {isLoading ? (
              <p className="text-sm text-gray-600">Loading accounts...</p>
            ) : (
              <div className="space-y-6">
                {/* Gmail Accounts */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Mail className="text-gray-700" size={18} />
                      <h3 className="font-medium text-gray-900">Gmail</h3>
                    </div>
                    <button
                      onClick={handleConnectGmail}
                      className="px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
                    >
                      <Plus size={16} />
                      <span>Connect Gmail</span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    {accounts
                      .filter((a) => a.provider === 'gmail')
                      .map((account) => (
                        <div
                          key={account.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                              <Mail size={18} className="text-red-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{account.displayName}</p>
                              <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                                Gmail
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDisconnect(account.id, account.displayName)}
                            disabled={disconnectMutation.isPending}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Disconnect account"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    {accounts.filter((a) => a.provider === 'gmail').length === 0 && (
                      <p className="text-sm text-gray-500 italic">No Gmail accounts connected</p>
                    )}
                  </div>
                </div>

                {/* Telegram Accounts */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <MessageCircle className="text-gray-700" size={18} />
                      <h3 className="font-medium text-gray-900">Telegram</h3>
                    </div>
                    <button
                      onClick={handleConnectTelegram}
                      className="px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
                    >
                      <Plus size={16} />
                      <span>Connect Telegram</span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    {accounts
                      .filter((a) => a.provider === 'telegram')
                      .map((account) => (
                        <div
                          key={account.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <MessageCircle size={18} className="text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">@{account.displayName}</p>
                              <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                Telegram
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDisconnect(account.id, account.displayName)}
                            disabled={disconnectMutation.isPending}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Disconnect account"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    {accounts.filter((a) => a.provider === 'telegram').length === 0 && (
                      <p className="text-sm text-gray-500 italic">No Telegram bots connected</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* About Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">About OneInbox</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <p>Version 1.0.0</p>
              <p>Unified messaging platform for Gmail and Telegram</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

