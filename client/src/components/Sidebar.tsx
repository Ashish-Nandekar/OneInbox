import { Link, useLocation } from 'react-router-dom';
import { Mail, MessageCircle, Settings, LogOut, Menu, Plus, Instagram, Search, Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { useAppStore } from '../stores/appStore';
import { integrationsApi } from '../api/integrations';

// WhatsApp icon component (Lucide doesn't have WhatsApp)
const WhatsAppIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

export default function Sidebar() {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);

  // Fetch connected accounts
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: integrationsApi.getAccounts,
    refetchInterval: 10000, // Refetch every 10 seconds
    retry: 3, // Retry failed requests
    retryDelay: 1000, // Wait 1 second between retries
  });

  const hasGmail = accounts.some((acc) => acc.provider === 'gmail');
  const hasTelegram = accounts.some((acc) => acc.provider === 'telegram');
  const hasWhatsApp = false; // Placeholder
  const hasInstagram = false; // Placeholder

  const handleLogout = () => {
    clearAuth();
  };

  const handleConnectGmail = async () => {
    try {
      const authUrl = await integrationsApi.getGmailAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to get Gmail auth URL:', error);
      alert('Failed to connect Gmail. Please try again.');
    }
  };

  const handleConnectTelegram = () => {
    const botToken = prompt('Enter your Telegram Bot Token (from @BotFather):');
    if (botToken) {
      integrationsApi
        .connectTelegram(botToken)
        .then(() => {
          alert('Telegram bot connected successfully!');
          window.location.reload();
        })
        .catch((error) => {
          console.error('Failed to connect Telegram:', error);
          alert('Failed to connect Telegram. Please check your bot token.');
        });
    }
  };

  const isActive = (path: string) => {
    return location.pathname === `/app${path}`;
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">OneInbox</h1>
          <button
            onClick={toggleSidebar}
            className="btn-icon"
            title="Toggle conversation list"
            aria-label="Toggle conversation list"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <div className="space-y-1">
          <Link
            to="/app"
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive('') || isActive('/conversation/')
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <MessageCircle size={18} />
            <span>All Messages</span>
          </Link>

          <Link
            to="/app/search"
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive('/search')
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Search size={18} />
            <span>Search</span>
          </Link>

          <Link
            to="/app/notifications"
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive('/notifications')
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Bell size={18} />
            <span>Notifications</span>
          </Link>

          <Link
            to="/app/settings"
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive('/settings')
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Settings size={18} />
            <span>Settings</span>
          </Link>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="px-3 mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
            Connected Accounts
          </div>
          <div className="space-y-1">
            {/* Gmail */}
            {hasGmail ? (
              <Link
                to="/app/provider/gmail"
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Mail size={16} />
                <span>Gmail</span>
                <span className="ml-auto w-2 h-2 bg-green-500 rounded-full" title="Connected" aria-label="Connected"></span>
              </Link>
            ) : (
              <button
                onClick={handleConnectGmail}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors"
              >
                <Mail size={16} />
                <span>Connect Gmail</span>
                <Plus size={14} className="ml-auto" />
              </button>
            )}

            {/* Telegram */}
            {hasTelegram ? (
              <Link
                to="/app/provider/telegram"
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <MessageCircle size={16} />
                <span>Telegram</span>
                <span className="ml-auto w-2 h-2 bg-green-500 rounded-full" title="Connected" aria-label="Connected"></span>
              </Link>
            ) : (
              <button
                onClick={handleConnectTelegram}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors"
              >
                <MessageCircle size={16} />
                <span>Connect Telegram</span>
                <Plus size={14} className="ml-auto" />
              </button>
            )}

            {/* WhatsApp - Placeholder */}
            {hasWhatsApp ? (
              <Link
                to="/app/provider/whatsapp"
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <WhatsAppIcon size={16} />
                <span>WhatsApp</span>
                <span className="ml-auto w-2 h-2 bg-green-500 rounded-full" title="Connected" aria-label="Connected"></span>
              </Link>
            ) : (
              <button
                disabled
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-400 rounded-lg cursor-not-allowed"
                title="Coming soon"
              >
                <WhatsAppIcon size={16} />
                <span>WhatsApp</span>
                <span className="ml-auto text-xs">Soon</span>
              </button>
            )}

            {/* Instagram - Placeholder */}
            {hasInstagram ? (
              <Link
                to="/app/provider/instagram"
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Instagram size={16} />
                <span>Instagram</span>
                <span className="ml-auto w-2 h-2 bg-green-500 rounded-full" title="Connected" aria-label="Connected"></span>
              </Link>
            ) : (
              <button
                disabled
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-400 rounded-lg cursor-not-allowed"
                title="Coming soon"
              >
                <Instagram size={16} />
                <span>Instagram</span>
                <span className="ml-auto text-xs">Soon</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-gray-200 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-600 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="ml-2 btn-icon"
            title="Logout"
            aria-label="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
