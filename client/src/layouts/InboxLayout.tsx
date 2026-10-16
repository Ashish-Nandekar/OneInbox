import { ReactNode } from 'react';
import Sidebar from '../components/Sidebar';
import ConversationList from '../components/ConversationList';
import { useAppStore } from '../stores/appStore';

interface InboxLayoutProps {
  children: ReactNode;
}

export default function InboxLayout({ children }: InboxLayoutProps) {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Conversation List */}
      {sidebarOpen && (
        <div className="w-88 bg-white border-r border-gray-200 flex flex-col shrink-0">
          <ConversationList />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>
    </div>
  );
}
