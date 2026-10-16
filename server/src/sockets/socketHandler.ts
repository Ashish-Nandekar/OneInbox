import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { JWTPayload } from '../types';

export function setupSocketHandlers(io: Server) {
  // Socket.IO authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const payload = jwt.verify(token, config.jwt.secret) as JWTPayload;
      (socket as any).userId = payload.id;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    console.log(`User connected: ${userId}`);

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId}`);
    });

    // Optional: Handle client ping
    socket.on('ping', () => {
      socket.emit('pong');
    });
  });
}
