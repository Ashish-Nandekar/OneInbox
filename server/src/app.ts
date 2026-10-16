import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config/env';
import { connectDatabase } from './utils/db';
import authRoutes from './routes/auth.routes';
import integrationsRoutes from './routes/integrations.routes';
import conversationsRoutes from './routes/conversations.routes';
import { setupSocketHandlers } from './sockets/socketHandler';
import { gmailSyncManager } from './sync/GmailSyncManager';
import { telegramPollingManager } from './sync/TelegramPollingManager';

const app = express();
const httpServer = createServer(app);

// Socket.IO setup
export const io = new Server(httpServer, {
  cors: {
    origin: config.urls.client,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Setup Socket.IO handlers
setupSocketHandlers(io);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline needed for React dev
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", config.urls.client],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Needed for some integrations
}));
app.use(cors({
  origin: config.urls.client,
  credentials: true,
}));

// Rate limiting - More lenient for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs (increased from 100)
  message: { 
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
    }
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please slow down and try again in a few minutes.',
      },
    });
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Limit auth attempts (increased from 10)
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later.',
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many login attempts. Please wait 15 minutes before trying again.',
      },
    });
  },
});

// Rate limiter for message sending
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 messages per minute
  message: {
    success: false,
    error: {
      code: 'MESSAGE_RATE_LIMIT_EXCEEDED',
      message: 'Too many messages sent, please slow down.',
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'MESSAGE_RATE_LIMIT_EXCEEDED',
        message: 'You are sending messages too quickly. Please wait a moment before sending more.',
      },
    });
  },
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Body parsers with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes (with message rate limiting)
app.use('/api/auth', authRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/conversations', conversationsRoutes);

// Apply message rate limiter to send message endpoint
app.use('/api/conversations/:id/messages', messageLimiter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    },
  });
});

// Start server
async function start() {
  try {
    // Connect to database
    await connectDatabase();

    // Initialize sync managers
    await gmailSyncManager.initializeAllAccounts();
    await telegramPollingManager.initializeAllAccounts();

    // Start HTTP server
    httpServer.listen(config.port, () => {
      console.log(`ðŸš€ Server running on ${config.urls.server}`);
      console.log(`ðŸ“¡ Socket.IO ready`);
      console.log(`ðŸ“§ Gmail sync manager initialized`);
      console.log(`ðŸ’¬ Telegram polling manager initialized`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  // Stop all sync managers
  gmailSyncManager.stopAll();
  telegramPollingManager.stopAll();
  
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Global error handlers to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
  console.error('Promise:', promise);
  // Log to error monitoring service (e.g., Sentry) in production
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Log to error monitoring service
  // Perform graceful shutdown
  gmailSyncManager.stopAll();
  telegramPollingManager.stopAll();
  
  httpServer.close(() => {
    console.log('Server closed due to uncaught exception');
    process.exit(1);
  });
  
  // Force exit after 5 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error('Forced shutdown after uncaught exception');
    process.exit(1);
  }, 5000);
});

start();







