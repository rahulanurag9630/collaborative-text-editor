# Quick Start Guide

Get the Collaborative Text Editor running locally in 5 minutes!

## Prerequisites

- Node.js 18 or higher
- Supabase account (free tier works)
- Google Gemini API key (free tier available)

## Step 1: Get API Keys

### Supabase Setup (2 minutes)

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Create a new project
4. Wait for project to initialize (~2 minutes)
5. Go to Project Settings → API
6. Copy:
   - Project URL (looks like: `https://xxxxx.supabase.co`)
   - anon public key (starts with `eyJ...`)

The database schema is already created automatically via migrations!

### Google Gemini API Key (1 minute)

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the API key

## Step 2: Configure Environment

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
JWT_SECRET=create_a_random_32_character_secret_here
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**Important**: Generate a secure JWT secret (minimum 32 characters). You can use:
```bash
openssl rand -base64 32
```

## Step 3: Install Dependencies

```bash
npm install
```

This will install all required packages for both frontend and backend.

## Step 4: Start the Application

Open two terminal windows:

**Terminal 1 - Start Backend Server:**
```bash
npm run server
```

You should see:
```
Server running on port 3001
Environment: development
```

**Terminal 2 - Start Frontend:**
```bash
npm run dev
```

You should see:
```
  VITE v5.4.8  ready in 500 ms

  ➜  Local:   http://localhost:5173/
```

## Step 5: Test the Application

### Test 1: User Registration

1. Open http://localhost:5173 in your browser
2. Click "Sign Up"
3. Enter:
   - Name: Test User
   - Email: test@example.com
   - Password: password123
4. Click "Sign Up"
5. You should be logged in automatically

### Test 2: Create a Document

1. Click "New Document" button
2. You should see the editor
3. Type some text
4. The title will auto-update
5. Click "Save" - you should see "Last saved: [time]"

### Test 3: Real-time Collaboration

1. Open a second browser window (or incognito)
2. Register a different user (e.g., test2@example.com)
3. In the first window, click "Share"
4. Enter: test2@example.com, choose "Editor"
5. In the second window, refresh - you should see the shared document
6. Open it and type - changes should appear in both windows in real-time!

### Test 4: AI Assistant

1. Open a document
2. Click "AI Assistant" button
3. Type or paste some text
4. Click "Grammar Check" - AI will analyze the text
5. Try other features:
   - Enhance: Improves text quality
   - Summarize: Creates a brief summary
   - Complete: Continues your text
   - Suggestions: Gets writing ideas

## Troubleshooting

### Backend won't start

**Error: Missing Supabase environment variables**
- Check that `.env` file exists
- Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set

**Error: Port 3001 already in use**
```bash
# Find and kill the process
lsof -ti:3001 | xargs kill -9
# Then restart: npm run server
```

### Frontend won't start

**Error: Port 5173 already in use**
```bash
# Kill the process and restart
lsof -ti:5173 | xargs kill -9
npm run dev
```

### Can't register users

**Error: Failed to create user**
- Check backend console for detailed error
- Verify Supabase connection
- Database migrations should run automatically

### AI features not working

**Error: AI service not configured**
- Verify GEMINI_API_KEY is set in `.env`
- Check you're within Google AI free tier limits
- Try again in a minute (rate limiting)

### WebSocket connection failed

**Error: Socket connection error**
- Ensure backend is running on port 3001
- Check browser console for detailed errors
- Try refreshing the page

## Testing Checklist

Use this checklist to verify everything works:

- [ ] Backend starts without errors
- [ ] Frontend loads in browser
- [ ] Can register new user
- [ ] Can log in with existing user
- [ ] Can create new document
- [ ] Can edit document
- [ ] Can save document manually
- [ ] Auto-save works (wait 30 seconds)
- [ ] Can share document with email
- [ ] Second user can see shared document
- [ ] Real-time collaboration works (both users editing)
- [ ] AI Assistant opens
- [ ] AI Grammar Check works
- [ ] AI Enhance works
- [ ] AI Summarize works
- [ ] Can log out
- [ ] Can log back in

## Quick Commands Reference

```bash
# Install dependencies
npm install

# Start backend server
npm run server

# Start frontend development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Type check
npm run typecheck
```

## Default Ports

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- WebSocket: ws://localhost:3001

## Sample Test Users

For testing, you can create multiple users:

```
User 1:
- Email: alice@example.com
- Password: password123

User 2:
- Email: bob@example.com
- Password: password123
```

## What to Test

### Basic Features
1. User registration and login
2. Creating documents
3. Editing and saving
4. Deleting documents

### Collaboration Features
1. Share document with another user
2. Both users edit simultaneously
3. Changes appear in real-time
4. User presence indicators

### AI Features
1. Grammar checking on various texts
2. Text enhancement
3. Summarization of long text
4. Auto-completion
5. Writing suggestions

## Performance Testing

### Test Auto-save
1. Create a document
2. Make changes
3. Wait 30 seconds
4. Check browser console for "Text change" logs
5. Refresh page - changes should persist

### Test Multiple Users
1. Open 3-5 browser windows
2. Have all users join same document
3. All users should see each other's changes
4. Check for lag or delays

## Next Steps

Once everything works:

1. Read the full README.md for detailed documentation
2. Check DEPLOYMENT.md for AWS deployment guide
3. Explore the codebase structure
4. Try building new features
5. Deploy to production

## Getting Help

If you encounter issues:

1. Check the console logs (browser and terminal)
2. Review the Troubleshooting section above
3. Verify all environment variables are set
4. Ensure both frontend and backend are running
5. Check Supabase dashboard for database errors

## Security Notes for Development

- Never commit `.env` file to git
- Use different JWT secrets for dev and production
- Don't use test users in production
- Keep API keys secure

## Success!

If all tests pass, congratulations! You now have a fully functional collaborative text editor with AI assistance running locally.

Ready to deploy? Check out DEPLOYMENT.md for AWS EC2 deployment instructions.

Happy coding!
