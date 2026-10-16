import { useEffect } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../api/socket';

export function useSocket() {
  useEffect(() => {
    connectSocket();

    return () => {
      disconnectSocket();
    };
  }, []);

  return getSocket();
}

export function useSocketEvent(event: string, handler: (data: any) => void) {
  useEffect(() => {
    const socket = getSocket();
    
    if (socket) {
      socket.on(event, handler);

      return () => {
        socket.off(event, handler);
      };
    }
  }, [event, handler]);
}
