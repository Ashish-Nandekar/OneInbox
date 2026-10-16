import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, MessageCircle, Instagram, Users, Send, CheckCheck, Clock, Loader2 } from 'lucide-react';
import { conversationsApi } from '../api/conversations';
import { integrationsApi } from '../api/integrations';
import { formatRelativeTime } from '../utils/date';

// WhatsApp icon component
const WhatsAppIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

export default function ProviderPage() {
  const { provider } = useParams<{ provider: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: integrationsApi.getAccounts,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: conversationsApi.getConversations,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => conversationsApi.markAllReadByProvider(provider!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Filter conversations by provider
  const providerConversations = conversations.filter(
    (conv) => conv.connectedAccount.provider === provider
  );

  const providerAccount = accounts.find((acc) => acc.provider === provider);

  // Get provider info
  const getProviderInfo = () => {
    switch (provider) {
      case 'gmail':
        return {
          name: 'Gmail',
          icon: <Mail size={24} />,
          color: 'red',
          description: 'Manage your Gmail conversations',
        };
      case 'telegram':
        return {
          name: 'Telegram',
          icon: <MessageCircle size={24} />,
          color: 'blue',
          description: 'Manage your Telegram bot messages',
        };
      case 'whatsapp':
        return {
          name: 'WhatsApp',
          icon: <WhatsAppIcon size={24} />,
          color: 'green',
          description: 'WhatsApp Business integration coming soon',
        };
      case 'instagram':
        return {
          name: 'Instagram',
          icon: <Instagram size={24} />,
          color: 'pink',
          description: 'Instagram DM integration coming soon',
        };
      default:
        return {
          name: 'Unknown',
          icon: <MessageCircle size={24} />,
          color: 'gray',
          description: 'Provider information',
        };
    }
  };

  const providerInfo = getProviderInfo();
  const isComingSoon = provider === 'whatsapp' || provider === 'instagram';

  // Calculate stats
  const totalUnread = providerConversations.reduce(
    (sum, conv) => sum + (conv.unreadCount || 0),
    0
  );

  const handleMarkAllRead = async () => {
    if (totalUnread === 0) {
      alert('No unread messages');
      return;
    }
    
    if (confirm(`Mark all ${totalUnread} messages as read?`)) {
      try {
        await markAllReadMutation.mutateAsync();
      } catch (error) {
        alert('Failed to mark messages as read');
      }
    }
  };

  const handleConversationClick = (conversationId: string) => {
    navigate(`/app/conversation/${conversationId}`);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-6 bg-white">
        <div className="flex items-center space-x-4 mb-4">
          <div className={`provider-icon provider-icon-${provider === 'gmail' ? 'gmail' : provider === 'telegram' ? 'telegram' : 'gmail'}`}>
            {providerInfo.icon}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{providerInfo.name}</h1>
            <p className="text-sm text-gray-600">{providerInfo.description}</p>
          </div>
        </div>

        {!isComingSoon && providerAccount && (
          <div className="flex items-center space-x-2 text-sm">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="text-gray-700">Connected as {providerAccount.displayName}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
        {isComingSoon ? (
          // Coming Soon View
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <div className="provider-icon provider-icon-gmail mx-auto mb-4">
                {providerInfo.icon}
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Coming Soon</h2>
              <p className="text-sm text-gray-600 mb-6">
                {providerInfo.name} integration is currently under development. Stay tuned for updates!
              </p>
              <div className="bg-indigo-50 rounded-lg p-4 text-left">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Planned Features:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Send and receive messages</li>
                  <li>• Real-time notifications</li>
                  <li>• Message search and filtering</li>
                  <li>• Media attachments support</li>
                  <li>• Multi-account support</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          // Active Provider View
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Conversations</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-1">
                      {providerConversations.length}
                    </p>
                  </div>
                  <Users className="text-gray-400" size={24} />
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Unread Messages</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-1">{totalUnread}</p>
                  </div>
                  <CheckCheck className="text-gray-400" size={24} />
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Messages</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-1">{providerConversations.length * 3}</p>
                  </div>
                  <Send className="text-gray-400" size={24} />
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Avg Response</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-1">2m</p>
                  </div>
                  <Clock className="text-gray-400" size={24} />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={handleMarkAllRead}
                  disabled={totalUnread === 0 || markAllReadMutation.isPending}
                  className="btn-secondary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {markAllReadMutation.isPending ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <CheckCheck size={18} />
                  )}
                  <span>Mark All Read {totalUnread > 0 && `(${totalUnread})`}</span>
                </button>
                <button
                  onClick={() => navigate('/app/search')}
                  className="btn-secondary flex items-center justify-center space-x-2"
                >
                  <MessageCircle size={18} />
                  <span>Search in {providerInfo.name}</span>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Conversations</h2>
              {providerConversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="mx-auto mb-3 text-gray-400" size={48} />
                  <p className="text-sm text-gray-600">No conversations yet</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Conversations will appear here once you start messaging
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {providerConversations.slice(0, 10).map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => handleConversationClick(conv.id)}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-gray-200"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className={`provider-icon ${provider === 'gmail' ? 'provider-icon-gmail' : 'provider-icon-telegram'}`}>
                          {providerInfo.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {conv.title}
                          </p>
                          <p className="text-xs text-gray-600 truncate">
                            {conv.lastMessagePreview || 'No messages yet'}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatRelativeTime(new Date(conv.lastActivityAt))}
                          </p>
                        </div>
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="px-2 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-full">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
