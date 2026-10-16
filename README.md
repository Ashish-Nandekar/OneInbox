# OneInbox
**A unified inbox for Gmail and Telegram.** Read and reply to conversations from one interface without switching apps.

## Features
- Unified inbox with real-time updates via Socket.IO
- Gmail OAuth 2.0, thread-aware replies, and periodic sync
- Telegram Bot API messaging and polling
- JWT authentication, bcrypt password hashing, encrypted provider credentials
- Extensible provider architecture

## Tech Stack
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router, Zustand, TanStack Query
- **Backend:** Node.js, Express, TypeScript, Socket.IO
- **Database:** PostgreSQL, Prisma ORM
- **Integrations:** Gmail API, Telegram Bot API, Telegraf

## Architecture
```text
Gmail ────────┐
              ├─ Provider adapters ─ Unified message model
Telegram Bot ─┘                           │
                                          ▼
                                 Express + Socket.IO
                                          │
                                          ▼
                                     React app
```

## Requirements
- Node.js 18+ and npm
- Docker Desktop
- Google account and Telegram account

## Getting Started
**1. Install dependencies** (run from the project root):
```bash
cd server && npm install
cd ../client && npm install
cd ..
```
**2. Start PostgreSQL** (start Docker Desktop first):
```bash
docker compose up -d
```
**3. Configure `.env`** based on `.env.example`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/oneinbox
JWT_SECRET=your-strong-random-secret
ENCRYPTION_KEY=your-secure-encryption-key
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/gmail/callback
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:3000
TELEGRAM_POLL_INTERVAL=5
GMAIL_SYNC_INTERVAL=30
```
In [Google Cloud Console](https://console.cloud.google.com/), enable the Gmail API, configure OAuth consent, and create a **Web application** OAuth client. Add the redirect URI above exactly and add your account as a test user if needed. **Never commit `.env` or real tokens.**

**4. Set up the database and start the backend:**
```bash
cd server
npm run prisma:generate
npm run prisma:migrate
npm run dev
```
**5. Start the frontend** in a second terminal:
```bash
cd client
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) and register.

## Connect Accounts
- **Gmail:** Select **Connect Gmail** and complete Google authorization. Initial sync fetches up to 50 recent threads; polling runs every 30 seconds by default.
- **Telegram:** Create a bot with [`@BotFather`](https://t.me/BotFather) using `/newbot`, add its token in OneInbox, then message the bot.
> **Telegram limitation:** The Bot API cannot access personal Telegram chat history. Users must message the bot first.

## API Overview
- **Auth:** `POST /api/auth/register`, `/api/auth/login`, `/api/auth/logout`; `GET /api/auth/me`
- **Accounts:** `GET /api/accounts`; `DELETE /api/accounts/:id`
- **Gmail:** `GET /api/integrations/gmail/auth`, `/callback`; `POST /api/integrations/gmail/sync/:accountId`
- **Telegram:** `POST /api/integrations/telegram`
- **Conversations:** `GET /api/conversations`; `GET /api/conversations/:id/messages`; `POST /api/conversations/:id/messages`

## Limitations
No WhatsApp, Instagram, Discord, attachments, advanced search, push notifications, or mobile app yet. Gmail uses polling. V1 is a learning project and has not been independently security-audited.

## Troubleshooting
- **Database:** Check Docker Desktop and `docker ps`; restart with `docker compose restart`.
- **Gmail:** Verify the Gmail API is enabled and OAuth redirect URIs match exactly.
- **Telegram:** Check the bot token, message the bot, and review server logs.
- **Prisma:** Run `npm run prisma:generate` in `server` and verify `DATABASE_URL`.

## Production
Use strong secrets, HTTPS, production OAuth URLs, restricted CORS, monitoring, and a security review before public deployment.

## License: Private project for training and development purposes.
