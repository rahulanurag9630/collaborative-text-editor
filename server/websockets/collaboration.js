import { verifyToken } from '../config/jwt.js';
import { User } from '../models/User.js';
import { Document } from '../models/Document.js';
import { Permission } from '../models/Permission.js';
import { ActiveSession } from '../models/ActiveSession.js';

const activeUsers = new Map();
const documentUsers = new Map();

export const setupCollaboration = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return next(new Error('Invalid token'));
      }

      const user = await User.findById(decoded.userId).select('_id email name');
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = String(user._id);
      socket.userName = user.name;
      socket.userEmail = user.email;

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userName} (${socket.id})`);

    socket.on('join-document', async ({ documentId }) => {
      try {
        const document = await Document.findById(documentId).select('ownerId');
        if (!document) {
          socket.emit('error', { message: 'Document not found' });
          return;
        }

        let hasAccess = String(document.ownerId) === socket.userId;
        if (!hasAccess) {
          const permission = await Permission.findOne({ documentId, userId: socket.userId }).select('_id');
          hasAccess = !!permission;
        }

        if (!hasAccess) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        socket.join(documentId);
        socket.currentDocument = documentId;

        if (!documentUsers.has(documentId)) {
          documentUsers.set(documentId, new Set());
        }
        documentUsers.get(documentId).add(socket.id);

        activeUsers.set(socket.id, {
          userId: socket.userId,
          userName: socket.userName,
          documentId,
          cursorPosition: null,
        });

        await ActiveSession.create({ documentId, userId: socket.userId, socketId: socket.id, cursorPosition: {} });

        const users = Array.from(documentUsers.get(documentId))
          .map(socketId => activeUsers.get(socketId))
          .filter(Boolean);

        io.to(documentId).emit('user-joined', {
          userId: socket.userId,
          userName: socket.userName,
          users,
        });

        console.log(`User ${socket.userName} joined document ${documentId}`);
      } catch (error) {
        console.error('Error joining document:', error);
        socket.emit('error', { message: 'Failed to join document' });
      }
    });

    socket.on('text-change', async ({ documentId, delta, content }) => {
      try {
        if (socket.currentDocument !== documentId) {
          return;
        }

        socket.to(documentId).emit('text-change', {
          delta,
          userId: socket.userId,
          userName: socket.userName,
        });

        await Document.findByIdAndUpdate(documentId, { content, updated_at: new Date() });

      } catch (error) {
        console.error('Error handling text change:', error);
      }
    });

    socket.on('cursor-move', ({ documentId, position }) => {
      if (socket.currentDocument !== documentId) {
        return;
      }

      const userInfo = activeUsers.get(socket.id);
      if (userInfo) {
        userInfo.cursorPosition = position;
      }

      socket.to(documentId).emit('cursor-move', {
        userId: socket.userId,
        userName: socket.userName,
        position,
      });
    });

    socket.on('document-save', async ({ documentId }) => {
      try {
        await Document.findByIdAndUpdate(documentId, { lastSavedAt: new Date() });

        socket.emit('document-saved', {
          timestamp: new Date().toISOString(),
        });

        // Broadcast update notification so others can refresh latest state if needed
        socket.to(documentId).emit('document-updated', { documentId });
      } catch (error) {
        console.error('Error saving document:', error);
        socket.emit('error', { message: 'Failed to save document' });
      }
    });

    socket.on('leave-document', async ({ documentId }) => {
      await handleLeaveDocument(socket, documentId, io);
    });

    socket.on('disconnect', async () => {
      const documentId = socket.currentDocument;
      if (documentId) {
        await handleLeaveDocument(socket, documentId, io);
      }
      console.log(`User disconnected: ${socket.userName} (${socket.id})`);
    });
  });
};

async function handleLeaveDocument(socket, documentId, io) {
  try {
    if (documentUsers.has(documentId)) {
      documentUsers.get(documentId).delete(socket.id);

      if (documentUsers.get(documentId).size === 0) {
        documentUsers.delete(documentId);
      }
    }

    activeUsers.delete(socket.id);

    await ActiveSession.deleteMany({ socketId: socket.id });

    socket.leave(documentId);

    io.to(documentId).emit('user-left', {
      userId: socket.userId,
      userName: socket.userName,
    });

    socket.currentDocument = null;
  } catch (error) {
    console.error('Error leaving document:', error);
  }
}
