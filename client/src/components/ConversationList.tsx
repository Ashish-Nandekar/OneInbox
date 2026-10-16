import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Mail, MessageCircle, RefreshCw, Inbox, Search, X } from 'lucide-react';
import { conversationsApi } from '../api/conversations';
import { useSocketEvent } from '../hooks/useSocket';
import { formatDistanceToNow } from '../utils/date';
import { useState } from 'react';

type FilterType = 'all' | 'gmail' | 'telegram';

export default function ConversationList() {
  const navigate = useNavigate();
  const { id: selectedId } = useParams();
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey: ['conversations'],
    queryFn: conversationsApi.getConversations,
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 3,
    retryDelay: 1000,
  });

  // Listen for new messages via Socket.IO
  useSocketEvent('message:new', () => {
    refetch();
  });

  useSocketEvent('conversations:updated', () => {
    refetch();
  });

  useSocketEvent('sync:completed', () => {
    refetch();
  });

  const handleRefresh = () => {
    refetch();
  };

  const handleSelectConversation = (id: string) => {
    navigate(`/app/conversation/${id}`);
  };

  // Filter conversations based on selected filter
  const filteredConversations = conversations.filter((conv) => {
    if (filter === 'all') return true;
    if (filter === 'gmail') return conv.connectedAccount.provider === 'gmail';
    if (filter === 'telegram') return conv.connectedAccount.provider === 'telegram';
    return true;
  });

  // Apply search filter
  const searchedConversations = filteredConversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      conv.title.toLowerCase().includes(query) ||
      conv.lastMessagePreview?.toLowerCase().includes(query) ||
      conv.connectedAccount.displayName.toLowerCase().includes(query)
    );
  });

  const gmailCount = conversations.filter((c) => c.connectedAccount.provider === 'gmail').length;
  const telegramCount = conversations.filter((c) => c.connectedAccount.provider === 'telegram').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
          <p className="text-sm text-gray-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h2 className="text-base font-semibold text-gray-900">Messages</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 bg-white">
          <div className="text-center max-w-sm">
            <MessageCircle className="mx-auto mb-3 text-gray-400" size={48} />
            <h3 className="text-base font-semibold text-gray-900 mb-1">No conversations yet</h3>
            <p className="text-sm text-gray-600">
              Connect Gmail or Telegram to start receiving messages
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">Messages</h2>
          <button
            onClick={handleRefresh}
            className="btn-icon"
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 btn-icon p-1"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              filter === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Inbox size={16} />
            <span>All</span>
            <span className="text-xs text-gray-500">({conversations.length})</span>
          </button>

          <button
            onClick={() => setFilter('gmail')}
            className={`flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              filter === 'gmail'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Mail size={16} />
            <span>Gmail</span>
            <span className="text-xs text-gray-500">({gmailCount})</span>
          </button>

          <button
            onClick={() => setFilter('telegram')}
            className={`flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              filter === 'telegram'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MessageCircle size={16} />
            <span>Telegram</span>
            <span className="text-xs text-gray-500">({telegramCount})</span>
          </button>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {searchedConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-white">
            <MessageCircle className="mx-auto mb-3 text-gray-400" size={48} />
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              {searchQuery ? 'No matching conversations' : 'No conversations'}
            </h3>
            <p className="text-sm text-gray-600">
              {searchQuery
                ? 'Try a different search term'
                : filter === 'all'
                ? 'Connect Gmail or Telegram to start receiving messages'
                : `No ${filter} conversations yet`}
            </p>
          </div>
        ) : (
          searchedConversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => handleSelectConversation(conversation.id)}
            className={`w-full p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors text-left ${
              selectedId === conversation.id ? 'bg-primary-50 border-l-4 border-l-primary-600' : ''
            }`}
          >
            <div className="flex items-start space-x-3">
              {/* Provider Icon */}
              <div className={`provider-icon ${conversation.connectedAccount.provider === 'gmail' ? 'provider-icon-gmail' : 'provider-icon-telegram'}`}>
                {conversation.connectedAccount.provider === 'gmail' ? (
                  <Mail size={18} />
                ) : (
                  <MessageCircle size={18} />
                )}
              </div>

              {/* Conversation Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">
                    {conversation.title}
                  </h3>
                  <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                    {formatDistanceToNow(conversation.lastActivityAt)}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 truncate mb-1">
                  {conversation.lastMessagePreview || 'No messages yet'}
                </p>

                <div className="flex items-center justify-between">
                  <span className={`provider-badge ${conversation.connectedAccount.provider === 'gmail' ? 'provider-badge-gmail' : 'provider-badge-telegram'}`}>
                    {conversation.connectedAccount.provider === 'gmail' ? 'Gmail' : 'Telegram'}
                  </span>
                  {conversation.unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-primary-600 text-white text-xs font-medium rounded-full">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))
        )}
      </div>
    </div>
  );
}

