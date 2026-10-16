import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { Send, Mail, MessageCircle, AlertCircle, Trash2, MoreVertical } from 'lucide-react';
import { conversationsApi } from '../api/conversations';
import { useSocketEvent } from '../hooks/useSocket';
import { formatMessageTime } from '../utils/date';
import { sanitizeText } from '../utils/sanitize';

export default function ConversationView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversation } = useQuery({
    queryKey: ['conversation', id],
    queryFn: () => conversationsApi.getConversation(id!),
    enabled: !!id,
  });

  const { data: messages = [], refetch } = useQuery({
    queryKey: ['messages', id],
    queryFn: () => conversationsApi.getMessages(id!),
    enabled: !!id,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Mark as read when conversation is opened
  useEffect(() => {
    if (id) {
      conversationsApi.markAsRead(id).catch(console.error);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  }, [id, queryClient]);

  const sendMutation = useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
      conversationsApi.sendMessage(conversationId, content),
    onSuccess: () => {
      setMessageText('');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (conversationId: string) => conversationsApi.deleteConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      navigate('/app');
    },
  });

  const handleDelete = () => {
    if (id && confirm('Are you sure you want to delete this conversation?')) {
      deleteMutation.mutate(id);
    }
    setShowMenu(false);
  };

  // Listen for new messages via Socket.IO
  useSocketEvent('message:new', (data) => {
    if (data.conversationId === id) {
      refetch();
    }
  });

  useSocketEvent('message:sent', (data) => {
    if (data.conversationId === id) {
      refetch();
    }
  });

  useSocketEvent('message:failed', (data) => {
    if (data.conversationId === id) {
      refetch();
    }
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim() || !id || sendMutation.isPending) {
      return;
    }

    sendMutation.mutate({ conversationId: id, content: messageText.trim() });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-600">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`provider-icon ${conversation.connectedAccount.provider === 'gmail' ? 'provider-icon-gmail' : 'provider-icon-telegram'}`}>
              {conversation.connectedAccount.provider === 'gmail' ? (
                <Mail size={18} />
              ) : (
                <MessageCircle size={18} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-gray-900 truncate">
                {conversation.title}
              </h2>
              <p className="text-xs text-gray-600">
                <span className={`provider-badge ${conversation.connectedAccount.provider === 'gmail' ? 'provider-badge-gmail' : 'provider-badge-telegram'}`}>
                  {conversation.connectedAccount.provider === 'gmail' ? 'Gmail' : 'Telegram'}
                </span>
              </p>
            </div>
          </div>

          {/* Actions Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="btn-icon"
            >
              <MoreVertical size={20} />
            </button>
            
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    onClick={handleDelete}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                  >
                    <Trash2 size={16} />
                    <span>Delete Conversation</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-sm">No messages in this conversation yet</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-xl px-4 py-2.5 ${
                  message.direction === 'outgoing'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}
              >
                {message.direction === 'incoming' && (
                  <div className="text-xs font-medium mb-1 text-gray-700">
                    {message.senderName}
                  </div>
                )}
                <div className="text-sm whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: sanitizeText(message.content) }} />
                <div
                  className={`text-xs mt-1 flex items-center space-x-2 ${
                    message.direction === 'outgoing' ? 'text-primary-100' : 'text-gray-500'
                  }`}
                >
                  <span>{formatMessageTime(message.timestamp)}</span>
                  {message.status === 'pending' && <span>Sending...</span>}
                  {message.status === 'failed' && (
                    <span className="flex items-center space-x-1 text-red-500">
                      <AlertCircle size={12} />
                      <span>Failed</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSend} className="flex items-end space-x-2">
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={3}
            className="input-field resize-none"
            disabled={sendMutation.isPending}
          />
          <button
            type="submit"
            disabled={!messageText.trim() || sendMutation.isPending}
            className="btn-primary flex items-center space-x-2 h-[88px]"
          >
            <Send size={18} />
            <span>Send</span>
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

