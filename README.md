# Collaborative Text Editor with AI Assistant

A real-time collaborative text editor built with React, Node.js, Socket.io, and Google Gemini AI. Multiple users can edit documents simultaneously with AI-powered writing assistance.

## Features

- **User Authentication**: Secure JWT-based authentication with registration and login
- **Real-time Collaboration**: Multiple users can edit documents simultaneously with live cursor tracking
- **Document Management**: Create, save, edit, and delete documents
- **Document Sharing**: Share documents with other users as viewers or editors
- **AI Writing Assistant**: Powered by Google Gemini
  - Grammar and style checking
  - Text enhancement
  - Summarization
  - Auto-completion
  - Writing suggestions
- **Auto-save**: Documents auto-save every 30 seconds
- **Rich Text Editor**: Full-featured editor with formatting options

## Technology Stack

### Frontend
- React 18 with TypeScript
- Quill.js for rich text editing
- Socket.io-client for real-time updates
- Tailwind CSS for styling
- Lucide React for icons

### Backend
- Node.js with Express
- Socket.io for WebSocket connections
- Supabase for database
- Google Gemini AI for AI features
- JWT for authentication
- bcryptjs for password hashing

### Database
- Supabase (PostgreSQL)
- Row Level Security (RLS) enabled
- Real-time session tracking

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- Supabase account
- Google Gemini API key

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_secret_key_minimum_32_characters
GEMINI_API_KEY=your_gemini_api_key
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 3. Get Supabase Credentials

1. Go to [Supabase](https://supabase.com)
2. Create a new project
3. Go to Project Settings > API
4. Copy the Project URL and anon public key

### 4. Get Google Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the API key

### 5. Database Setup

The database schema is already created via Supabase migrations. The application includes:
- Users table with authentication
- Documents table for storing content
- Document permissions for sharing
- Active sessions for collaboration tracking
- Row Level Security policies

### 6. Run the Application

Open two terminal windows:

**Terminal 1 - Backend Server:**
```bash
npm run server
```

**Terminal 2 - Frontend Development Server:**
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`
The backend API will be available at `http://localhost:3001`

## Usage Guide

### 1. Register an Account
- Open the application
- Click "Sign Up"
- Enter your name, email, and password
- Submit the form

### 2. Create a Document
- Click "New Document" button
- Enter a title
- Start typing in the editor

### 3. Collaborate in Real-time
- Share document with another user (using their email)
- Both users can edit simultaneously
- See live cursor positions and changes

### 4. Use AI Assistant
- Click "AI Assistant" button while editing
- Paste or type text
- Choose an AI action:
  - Grammar Check: Find grammar and style issues
  - Enhance: Improve text quality
  - Summarize: Get a brief summary
  - Complete: AI completes your text
  - Suggestions: Get writing ideas

### 5. Share Documents
- Click "Share" button (owner only)
- Enter recipient's email
- Choose role (Editor or Viewer)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Documents
- `GET /api/documents` - Get all user documents
- `POST /api/documents` - Create new document
- `GET /api/documents/:id` - Get specific document
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document
- `POST /api/documents/:id/share` - Share document
- `GET /api/documents/:id/permissions` - Get document permissions

### AI Assistant
- `POST /api/ai/grammar-check` - Check grammar
- `POST /api/ai/enhance` - Enhance text
- `POST /api/ai/summarize` - Summarize text
- `POST /api/ai/complete` - Complete text
- `POST /api/ai/suggestions` - Get suggestions

## WebSocket Events

### Client to Server
- `join-document` - Join document editing session
- `leave-document` - Leave document session
- `text-change` - Send text modifications
- `cursor-move` - Update cursor position
- `document-save` - Save document

### Server to Client
- `user-joined` - User joined document
- `user-left` - User left document
- `text-change` - Receive text changes
- `cursor-move` - Receive cursor updates
- `document-saved` - Save confirmation

## Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- Row Level Security on all database tables
- Rate limiting on API endpoints
- Input validation and sanitization
- Secure WebSocket connections
- Environment variable protection

## Project Structure

```
project/
├── server/
│   ├── config/          # Configuration files
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── websockets/      # Socket.io handlers
│   └── index.js         # Server entry point
├── src/
│   ├── components/      # React components
│   │   ├── Auth/        # Authentication components
│   │   ├── Documents/   # Document management
│   │   ├── Editor/      # Collaborative editor
│   │   └── AI/          # AI assistant
│   ├── contexts/        # React contexts
│   ├── services/        # API and socket services
│   └── App.tsx          # Main application
└── package.json
```

## Deployment Considerations

### AWS EC2 Deployment

1. Launch EC2 instance (Ubuntu 22.04 recommended)
2. Install Node.js 18+
3. Clone repository
4. Set environment variables
5. Install dependencies
6. Use PM2 for process management:
   ```bash
   npm install -g pm2
   pm2 start server/index.js --name collab-editor
   pm2 startup
   pm2 save
   ```
7. Configure nginx as reverse proxy
8. Set up SSL with Let's Encrypt
9. Configure security groups (ports 80, 443, SSH)

### Docker Deployment

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["node", "server/index.js"]
```

## Performance Optimization

- Auto-save runs every 30 seconds to reduce database writes
- Socket.io for efficient real-time updates
- Rate limiting to prevent abuse
- Database indexes for fast queries
- Connection pooling for Supabase

## Known Limitations

- Maximum 10 AI requests per minute per user
- Document size limited to 10MB
- Auto-save interval is 30 seconds
- WebSocket connections timeout after inactivity

## Troubleshooting

### Connection Issues
- Ensure backend server is running on port 3001
- Check CORS configuration in server
- Verify environment variables are set

### AI Features Not Working
- Verify GEMINI_API_KEY is set correctly
- Check Google AI Studio quota
- Review rate limiting settings

### Authentication Issues
- Ensure JWT_SECRET is set (minimum 32 characters)
- Check token expiration (default 7 days)
- Verify Supabase connection

## Future Improvements

- Version history and document rollback
- Comments and annotations
- Export to PDF/Word
- Offline editing support
- Mobile responsive improvements
- Dark mode
- Advanced text formatting
- File attachments

## License

MIT License

## Author

Built for WorkRadius AI Technologies - SDE Intern Assignment

## Support

For issues or questions, please check the troubleshooting section or contact support.
