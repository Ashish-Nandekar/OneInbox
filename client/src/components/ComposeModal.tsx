import { useState, useEffect } from 'react';
import { X, Send, Mail, MessageCircle, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { integrationsApi } from '../api/integrations';
import { conversationsApi } from '../api/conversations';
import { showSuccessNotification, showErrorNotification } from '../utils/notifications';
import { ConnectedAccount } from '../types';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ComposeModal({ isOpen, onClose }: ComposeModalProps) {
  const [provider, setProvider] = useState<'gmail' | 'telegram' | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Fetch connected accounts
  const { data: accounts = [] } = useQuery<ConnectedAccount[]>({
    queryKey: ['connected-accounts'],
    queryFn: integrationsApi.getAccounts,
    enabled: isOpen,
  });

  const gmailAccounts = accounts.filter((acc) => acc.provider === 'gmail');
  const telegramAccounts = accounts.filter((acc) => acc.provider === 'telegram');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setProvider(null);
      setSelectedAccountId('');
      setTo('');
      setSubject('');
      setContent('');
      setIsSending(false);
    }
  }, [isOpen]);

  // Auto-select account when provider changes
  useEffect(() => {
    if (provider === 'gmail' && gmailAccounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(gmailAccounts[0].id);
    } else if (provider === 'telegram' && telegramAccounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(telegramAccounts[0].id);
    }
  }, [provider, gmailAccounts, telegramAccounts, selectedAccountId]);

  const handleSend = async () => {
    if (!selectedAccountId || !to || !content) {
      showErrorNotification('Please fill in all required fields');
      return;
    }

    setIsSending(true);

    try {
      await conversationsApi.composeMessage({
        accountId: selectedAccountId,
        to,
        subject: provider === 'gmail' ? subject : undefined,
        content,
      });

      showSuccessNotification(
        provider === 'gmail' ? 'Email sent successfully!' : 'Message sent successfully!'
      );
      onClose();
    } catch (error: any) {
      console.error('Failed to send message:', error);
      showErrorNotification(
        error.response?.data?.error?.message || 'Failed to send message'
      );
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">New Message</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSending}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Provider Selection */}
          {!provider && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Choose a platform to send from:</p>
              
              {gmailAccounts.length > 0 && (
                <button
                  onClick={() => setProvider('gmail')}
                  className="w-full flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <Mail className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-900">Gmail</div>
                    <div className="text-sm text-gray-500">
                      Send email to {gmailAccounts.length} connected account{gmailAccounts.length > 1 ? 's' : ''}
                    </div>
                  </div>
                </button>
              )}

              {telegramAccounts.length > 0 && (
                <button
                  onClick={() => setProvider('telegram')}
                  className="w-full flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-900">Telegram</div>
                    <div className="text-sm text-gray-500">
                      Send message to {telegramAccounts.length} connected bot{telegramAccounts.length > 1 ? 's' : ''}
                    </div>
                  </div>
                </button>
              )}

              {gmailAccounts.length === 0 && telegramAccounts.length === 0 && (
                <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">No accounts connected</p>
                    <p>Connect a Gmail or Telegram account in Settings to send messages.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Compose Form */}
          {provider && (
            <div className="space-y-4">
              {/* Account Selection (if multiple) */}
              {provider === 'gmail' && gmailAccounts.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Account
                  </label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={isSending}
                  >
                    {gmailAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {provider === 'telegram' && telegramAccounts.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Bot
                  </label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={isSending}
                  >
                    {telegramAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* To Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {provider === 'gmail' ? 'To (Email Address)' : 'To (Chat ID)'}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder={
                    provider === 'gmail'
                      ? 'recipient@example.com'
                      : 'Telegram Chat ID (e.g., 123456789)'
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  disabled={isSending}
                />
                {provider === 'telegram' && (
                  <p className="mt-1 text-xs text-gray-500">
                    You can get the chat ID by sending /start to your bot
                  </p>
                )}
              </div>

              {/* Subject (Gmail only) */}
              {provider === 'gmail' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Email subject"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={isSending}
                  />
                </div>
              )}

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message<span className="text-red-500 ml-1">*</span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Type your message here..."
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  disabled={isSending}
                />
              </div>

              {/* Back Button */}
              <button
                onClick={() => setProvider(null)}
                className="text-sm text-gray-600 hover:text-gray-900"
                disabled={isSending}
              >
                ← Change platform
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {provider && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              disabled={isSending}
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={isSending || !to || !content}
              className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
