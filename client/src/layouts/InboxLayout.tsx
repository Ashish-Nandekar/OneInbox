import { ReactNode, useState } from 'react';
import { Plus } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ConversationList from '../components/ConversationList';
import ReconnectionBanner from '../components/ReconnectionBanner';
import { ComposeModal } from '../components/ComposeModal';
import { useAppStore } from '../stores/appStore';

interface InboxLayoutProps {
  children: ReactNode;
}

export default function InboxLayout({ children }: InboxLayoutProps) {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Global Reconnection Banner */}
      <ReconnectionBanner />
      
      {/* Sidebar */}
      <Sidebar />

      {/* Conversation List with Compose Button */}
      {sidebarOpen && (
        <div className="w-88 bg-white border-r border-gray-200 flex flex-col shrink-0 relative">
          <ConversationList />
          
          {/* Floating Compose Button - Bottom of Conversation List */}
          <button
            onClick={() => setIsComposeOpen(true)}
            className="absolute bottom-6 right-6 w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center group z-10"
            title="Compose new message"
          >
            <Plus className="h-6 w-6" />
            <span className="absolute right-full mr-3 px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Compose
            </span>
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>

      {/* Compose Modal */}
      <ComposeModal isOpen={isComposeOpen} onClose={() => setIsComposeOpen(false)} />
    </div>
  );
}

