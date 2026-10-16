# OneInbox V1 - Unified Messaging Application

**A production-ready unified inbox for Telegram and Gmail**

OneInbox combines your Telegram and Gmail conversations into one powerful interface, letting you read and reply to messages from multiple platforms without switching apps.

## ✨ Features

- 🔐 **Secure Authentication** - JWT-based auth with bcrypt password hashing
- 📧 **Gmail Integration** - Full OAuth 2.0 flow with thread-aware replies
- 💬 **Telegram Bot API** - Real-time message polling and sending
- 📨 **Unified Inbox** - All conversations in one beautiful interface
- ⚡ **Real-time Updates** - Socket.IO for instant message delivery
- 🔄 **Auto-sync** - Gmail syncs every 30s, Telegram polls every 5s
- 🎨 **Modern UI** - Clean, responsive design with Tailwind CSS
- 🔒 **Security First** - Rate limiting, helmet, encrypted credentials
- 🏗️ **Provider Architecture** - Easy to add WhatsApp, Discord, etc.

## Architecture

```
Telegram ───┐
            │
Gmail ──────┤
            ↓
      Provider Adapters
            ↓
    Unified Message Model
            ↓
     OneInbox Backend
            ↓
       Unified Inbox
            ↓
      OneInbox Web App
```

## Project Structure

```
oneinbox/
├── client/                 # React frontend
│   ├── src/
│   │   ├── api/           # API client
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── stores/        # Zustand stores
│   │   └── types/         # TypeScript types
│   └── package.json
│
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── config/        # Configuration
│   │   ├── controllers/   # Route controllers
│   │   ├── middleware/    # Express middleware
│   │   ├── providers/     # Messaging providers
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── sockets/       # Socket.IO handlers
│   │   ├── sync/          # Sync managers
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utilities
│   └── package.json
│
├── prisma/
│   └── schema.prisma      # Database schema
│
├── docker-compose.yml     # PostgreSQL container
├── .env                   # Environment variables (DO NOT COMMIT)
└── .env.example          # Environment template
```

## Tech Stack

### Backend
- Node.js + Express
- TypeScript
- PostgreSQL + Prisma ORM
- Socket.IO (real-time)
- JWT authentication
- bcryptjs (password hashing)
- Google APIs (Gmail integration)
- Telegraf (Telegram Bot API)

### Frontend
- React 18
- TypeScript
- Vite
- TailwindCSS
- React Router
- TanStack Query (data fetching)
- Zustand (state management)
- Socket.IO Client
- Axios
- Lucide React (icons)

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** v18 or higher ([Download](https://nodejs.org/))
- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop/))
- **npm** (comes with Node.js)
- A **Gmail account** for testing
- A **Telegram account** for creating a bot

## 🚀 Quick Start

### 1. Install Dependencies

```powershell
# Install server dependencies
cd server
npm install

# Install client dependencies  
cd ../client
npm install

cd ..
```

> **Note:** If npm install times out due to OneDrive sync, try disabling OneDrive sync for the project folder temporarily.

### 2. Start PostgreSQL Database

**Important:** Start Docker Desktop first, then:

```powershell
docker compose up -d
```

Verify it's running:
```powershell
docker ps
```

You should see `oneinbox_postgres` running on port 5432.

### 3. Configure Google OAuth

The `.env` file already has generated `JWT_SECRET` and `ENCRYPTION_KEY`. Now add your Google credentials:

**Step-by-step Google Cloud setup:**

1. **Create Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Click "Select a project" > "New Project"
   - Name it "OneInbox" and click "Create"

2. **Enable Gmail API**
   - In the project, go to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click on it and press "Enable"

3. **Configure OAuth Consent Screen**
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "External" and click "Create"
   - Fill in:
     - App name: `OneInbox`
     - User support email: Your email
     - Developer contact: Your email
   - Click "Save and Continue"
   - Skip scopes, click "Save and Continue"
   - Add your email as a test user
   - Click "Save and Continue"

4. **Create OAuth Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: **Web application**
   - Name: `OneInbox Web Client`
   - Authorized redirect URIs: `http://localhost:3000/api/integrations/gmail/callback`
   - Click "Create"
   - **Copy the Client ID and Client Secret**

5. **Update .env file**
   ```env
   GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret-here
   ```

### 4. Initialize Database

```powershell
# Generate Prisma client
npx prisma generate

# Run migrations (from root directory)
cd server
npx prisma migrate dev --name init
```

You should see: ✔ Generated Prisma Client

### 5. Start the Application

**Terminal 1 - Start Backend:**
```powershell
cd server
npm run dev
```

Wait for:
- ✅ Database connected
- 🚀 Server running on http://localhost:3000
- 📡 Socket.IO ready

**Terminal 2 - Start Frontend:**
```powershell
cd client
npm run dev
```

Wait for:
- ➜ Local: http://localhost:5173/

### 6. Access OneInbox

Open your browser: **http://localhost:5173**

You should see the login page. Let's create your account!

## 📱 Using OneInbox

### First Time Setup

1. **Register Your Account**
   - Click "Register"
   - Enter your name, email, and password (min 6 characters)
   - Click "Create Account"

2. **Connect Gmail**
   - After login, you'll see the empty inbox
   - The sidebar shows "Connected" section
   - Click on the Accounts icon (gear) in the sidebar
   - Click "Connect Gmail"
   - Sign in with your Google account
   - Grant Gmail permissions
   - You'll be redirected back to OneInbox
   - Gmail starts syncing immediately (up to 50 recent threads)

3. **Connect Telegram Bot**
   
   First, create a bot:
   - Open Telegram and search for `@BotFather`
   - Send `/newbot`
   - Choose a name (e.g., "My OneInbox Bot")
   - Choose a username (e.g., "my_oneinbox_bot")
   - Copy the bot token (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
   
   Then in OneInbox:
   - Click "Connect Telegram"
   - Paste the bot token
   - Click "Connect"
   - Go to Telegram and message your bot
   - The conversation appears in OneInbox within 5 seconds!

### 💡 Important Notes

**Telegram Limitation:**
- V1 uses the Telegram Bot API (not MTProto user account API)
- You can only see messages sent TO your bot
- Your existing Telegram chats won't appear
- Users must message your bot first
- This is by design for V1 simplicity

**Gmail Sync:**
- Initial sync: 50 most recent threads
- Auto-sync: Every 30 seconds
- New emails appear automatically

### Using the Inbox

**View Conversations:**
- All Gmail threads and Telegram chats appear in one list
- Sorted by most recent activity
- Platform badges show Gmail (📧) or Telegram (💬)
- Click any conversation to open it

**Read & Reply:**
- Messages show in chat bubbles
- Your messages on the right (blue)
- Incoming messages on the left (gray)
- Type in the composer at the bottom
- Press Enter to send (Shift+Enter for new line)

**Gmail Replies:**
- Automatically preserve the email thread
- Includes proper `In-Reply-To` and `References` headers
- Maintains subject line with "Re:" prefix

**Real-time Updates:**
- New Telegram messages appear instantly
- Gmail syncs every 30 seconds
- No need to refresh!

## API Routes

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Accounts
- `GET /api/accounts` - List connected accounts
- `DELETE /api/accounts/:id` - Disconnect account

### Gmail Integration
- `GET /api/integrations/gmail/auth` - Start OAuth flow
- `GET /api/integrations/gmail/callback` - OAuth callback
- `POST /api/integrations/gmail/sync/:accountId` - Manual sync

### Telegram Integration
- `POST /api/integrations/telegram` - Connect bot
- `DELETE /api/integrations/telegram/:accountId` - Disconnect bot

### Conversations
- `GET /api/conversations` - List all conversations
- `GET /api/conversations/:id` - Get conversation details

### Messages
- `GET /api/conversations/:id/messages` - Get messages
- `POST /api/conversations/:id/messages` - Send message
- `POST /api/messages/:id/retry` - Retry failed message

## Database Schema

### User
- Authentication and profile

### ConnectedAccount
- Stores encrypted OAuth tokens and bot credentials
- Links users to Gmail/Telegram accounts

### Conversation
- Unified conversation model
- Maps to Gmail threads or Telegram chats

### Message
- Normalized message format
- Stores content from both providers

### SyncState
- Tracks synchronization cursors
- Prevents duplicate message processing

## Security Features

✅ **Password Hashing** - bcryptjs with salt rounds
✅ **JWT Authentication** - Secure token-based auth
✅ **Encrypted Credentials** - Provider tokens encrypted at rest
✅ **No Client-Side Secrets** - Tokens never sent to frontend
✅ **OAuth 2.0** - Secure Gmail authorization
✅ **Environment Variables** - Secrets in .env (gitignored)
✅ **CORS Protection** - Configured for localhost
✅ **Request Validation** - Zod schema validation

## Synchronization

### Gmail
- **Initial sync**: Fetches 50 most recent conversations
- **Periodic sync**: Every 30 seconds (configurable)
- **Method**: Polling Gmail API
- **Future**: Can be upgraded to Gmail push notifications + Pub/Sub

### Telegram
- **Method**: Long polling with `getUpdates`
- **Interval**: Every 5 seconds (configurable)
- **Offset tracking**: Prevents duplicate message processing
- **Real-time**: New messages appear immediately via Socket.IO

## Real-Time Updates

OneInbox uses Socket.IO for real-time updates:

- **message:new** - New message received
- **message:sent** - Message sent successfully
- **message:failed** - Message send failed
- **conversation:updated** - Conversation updated
- **account:connected** - Account connected
- **account:disconnected** - Account disconnected
- **sync:completed** - Sync completed
- **sync:failed** - Sync failed

## Known Limitations (V1)

### Not Implemented Yet
- ❌ WhatsApp, Instagram, Discord, Messenger
- ❌ File attachments
- ❌ Voice/video messages
- ❌ Message search
- ❌ Contact management
- ❌ Push notifications
- ❌ Mobile app
- ❌ End-to-end encryption between OneInbox users
- ❌ AI features

### Telegram Limitation
The V1 Telegram integration uses the Bot API, which:
- Requires users to message the bot first
- Cannot access existing personal Telegram conversations
- Only receives messages sent to the bot
- This is by design for V1 simplicity

A future version could implement MTProto client for full account access.

## Environment Variables Reference

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/oneinbox

# Authentication (auto-generated)
JWT_SECRET=<generated>
ENCRYPTION_KEY=<generated>

# Google OAuth (you must configure)
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/gmail/callback

# URLs
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:3000

# Sync Intervals (seconds)
TELEGRAM_POLL_INTERVAL=5
GMAIL_SYNC_INTERVAL=30
```

## Troubleshooting

### Database Connection Failed
- Ensure Docker Desktop is running
- Check if PostgreSQL container is running: `docker ps`
- Restart container: `docker compose restart`

### Gmail OAuth Not Working
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
- Check redirect URI matches Google Console exactly
- Ensure Gmail API is enabled in Google Cloud Console

### Telegram Bot Not Receiving Messages
- Verify bot token is correct
- Send `/start` to your bot on Telegram first
- Check server logs for polling errors

### Build Errors
- Delete `node_modules` and reinstall
- Run `npx prisma generate` in server directory
- Clear npm cache: `npm cache clean --force`

## Development Scripts

```bash
# Root
npm run dev              # Run both client and server
npm run build            # Build both projects

# Server
cd server
npm run dev              # Development with hot reload
npm run build            # Build TypeScript
npm run start            # Run production build
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio

# Client
cd client
npm run dev              # Development server
npm run build            # Production build
npm run preview          # Preview production build
```

## Testing Gmail Integration

1. Connect your Gmail account
2. Send yourself an email from another account
3. Wait up to 30 seconds for sync
4. Conversation appears in OneInbox inbox
5. Click to open and read
6. Reply from OneInbox
7. Check Gmail - reply should be in the thread

## Testing Telegram Integration

1. Connect your Telegram bot
2. Open Telegram and find your bot
3. Send a message to the bot
4. Message appears in OneInbox within 5 seconds
5. Reply from OneInbox
6. Check Telegram - reply should appear

## Production Deployment

### Environment Changes
- Set `NODE_ENV=production`
- Use production PostgreSQL database
- Configure production URLs
- Use proper SSL certificates
- Enable Gmail API production quotas
- Set up monitoring and logging

### Security Checklist
- ✅ Rotate JWT_SECRET and ENCRYPTION_KEY
- ✅ Use strong database passwords
- ✅ Enable HTTPS
- ✅ Configure CORS for production domains
- ✅ Set up rate limiting
- ✅ Enable request logging
- ✅ Configure firewall rules
- ✅ Regular security audits

## Contributing

This is V1 - a proof of concept. Future improvements:
- Additional providers (WhatsApp, Discord, etc.)
- File attachments
- Advanced search
- AI features
- Mobile applications
- Team collaboration

## License

Private project for training purposes.

## Support

For issues or questions:
1. Check this README
2. Review server logs
3. Check database connectivity
4. Verify environment variables
