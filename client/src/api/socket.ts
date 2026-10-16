import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

let socket: Socket | null = null;

export function connectSocket() {
  if (socket?.connected) {
    return socket;
  }

  const token = useAuthStore.getState().token;

  if (!token) {
    console.warn('No auth token available for socket connection');
    return null;
  }

  socket = io('http://localhost:3000', {
    auth: {
      token,
    },
    // Reconnection configuration
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  // Connection event handlers
  socket.on('connect', () => {
    console.log('✅ Socket connected');
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
    if (reason === 'io server disconnect') {
      // Server disconnected, need to reconnect manually
      socket?.connect();
    }
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
    // Don't throw - just log and let reconnection handle it
  });

  socket.io.on('reconnect', (attemptNumber) => {
    console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
    // Trigger data refresh after reconnection
    window.dispatchEvent(new CustomEvent('socket:reconnected'));
  });

  socket.io.on('reconnect_attempt', (attemptNumber) => {
    // Only log every 5th attempt to reduce console noise
    if (attemptNumber % 5 === 0) {
      console.log(`🔄 Reconnection attempt #${attemptNumber}`);
    }
  });

  socket.io.on('reconnect_failed', () => {
    console.error('❌ Socket reconnection failed after maximum attempts');
    console.log('Please check if the server is running on http://localhost:3000');
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}
