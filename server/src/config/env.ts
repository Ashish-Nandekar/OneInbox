import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '../../../.env') });

export const config = {
  port: process.env.PORT || 3000,
  
  database: {
    url: process.env.DATABASE_URL!,
  },
  
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: '7d',
  },
  
  encryption: {
    key: process.env.ENCRYPTION_KEY!,
  },
  
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
  },
  
  urls: {
    client: process.env.CLIENT_URL || 'http://localhost:5173',
    server: process.env.SERVER_URL || 'http://localhost:3000',
  },
  
  sync: {
    telegramPollInterval: parseInt(process.env.TELEGRAM_POLL_INTERVAL || '5', 10) * 1000,
    gmailSyncInterval: parseInt(process.env.GMAIL_SYNC_INTERVAL || '30', 10) * 1000,
  },
};

// Validate required env vars
const required = [
  'DATABASE_URL',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
];

for (const key of required) {
  if (!process.env[key]) {
    console.warn(`Warning: ${key} is not set in environment variables`);
  }
}
