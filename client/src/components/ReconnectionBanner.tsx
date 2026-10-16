import { useState } from 'react';
import { AlertCircle, X, RefreshCw } from 'lucide-react';
import { useSocketEvent } from '../hooks/useSocket';
import { integrationsApi } from '../api/integrations';

interface ReconnectionEvent {
  accountId: string;
  provider: string;
  displayName: string;
  message: string;
}

export default function ReconnectionBanner() {
  const [reconnectionNeeded, setReconnectionNeeded] = useState<ReconnectionEvent | null>(null);

  useSocketEvent('account:needs_reconnection', (data: ReconnectionEvent) => {
    console.log('Account needs reconnection:', data);
    setReconnectionNeeded(data);
  });

  const handleReconnect = async () => {
    if (!reconnectionNeeded) return;

    try {
      if (reconnectionNeeded.provider === 'gmail') {
        const authUrl = await integrationsApi.getGmailAuthUrl();
        window.location.href = authUrl;
      } else if (reconnectionNeeded.provider === 'telegram') {
        const botToken = prompt('Enter your Telegram Bot Token (from @BotFather):');
        if (botToken) {
          await integrationsApi.connectTelegram(botToken);
          setReconnectionNeeded(null);
        }
      }
    } catch (error) {
      console.error('Reconnection failed:', error);
      alert('Failed to reconnect. Please try again from Settings.');
    }
  };

  const handleDismiss = () => {
    setReconnectionNeeded(null);
  };

  if (!reconnectionNeeded) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-50 border-b-2 border-yellow-400 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              <AlertCircle className="text-yellow-600" size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-yellow-900">
                Connection Expired: {reconnectionNeeded.displayName}
              </h3>
              <p className="text-sm text-yellow-800 mt-0.5">
                {reconnectionNeeded.message}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={handleReconnect}
              className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors"
            >
              <RefreshCw size={16} />
              <span>Reconnect Now</span>
            </button>
            <button
              onClick={handleDismiss}
              className="p-2 text-yellow-600 hover:bg-yellow-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
