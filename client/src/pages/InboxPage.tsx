import { Routes, Route } from 'react-router-dom';
import InboxLayout from '../layouts/InboxLayout';
import ConversationView from '../components/ConversationView';
import SettingsPage from './SettingsPage';
import ProviderPage from './ProviderPage';
import NotificationsPage from './NotificationsPage';
import SearchPage from './SearchPage';
import { useSocket } from '../hooks/useSocket';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useEffect } from 'react';
import { requestNotificationPermission, notifyNewMessage } from '../utils/notifications';

export default function InboxPage() {
  // Initialize socket connection
  useSocket();

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Listen for new messages and show notifications
  useEffect(() => {
    const handleNewMessage = (data: any) => {
      if (document.hidden) {
        // Only show notification if tab is not active
        notifyNewMessage(
          data.senderName || 'Someone',
          data.preview || 'New message',
          data.provider || 'telegram'
        );
      }
    };

    // This will be handled via Socket.IO in the layout
    window.addEventListener('new-message', handleNewMessage as EventListener);

    return () => {
      window.removeEventListener('new-message', handleNewMessage as EventListener);
    };
  }, []);

  return (
    <InboxLayout>
      <ErrorBoundary><Routes>
        <Route path="/" element={<EmptyState />} />
        <Route path="/conversation/:id" element={<ConversationView />} />
        <Route path="/provider/:provider" element={<ProviderPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes></ErrorBoundary>
    </InboxLayout>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full bg-white">
      <div className="text-center px-6">
        <h2 className="text-base font-semibold text-gray-900 mb-2">
          Select a conversation
        </h2>
        <p className="text-sm text-gray-600">
          Choose a conversation from the list to view messages
        </p>
      </div>
    </div>
  );
}

