import { create } from 'zustand';

interface AppState {
  selectedConversationId: string | null;
  sidebarOpen: boolean;
  setSelectedConversationId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedConversationId: null,
  sidebarOpen: true,
  setSelectedConversationId: (id) => set({ selectedConversationId: id }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
