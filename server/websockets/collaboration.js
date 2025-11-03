import { supabase } from '../config/supabase.js';
import { verifyToken } from '../config/jwt.js';

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

      const { data: user } = await supabase
        .from('users')
        .select('id, email, name')
        .eq('id', decoded.userId)
        .maybeSingle();

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user.id;
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
        const { data: document } = await supabase
          .from('documents')
          .select('owner_id')
          .eq('id', documentId)
          .maybeSingle();

        if (!document) {
          socket.emit('error', { message: 'Document not found' });
          return;
        }

        let hasAccess = document.owner_id === socket.userId;

        if (!hasAccess) {
          const { data: permission } = await supabase
            .from('document_permissions')
            .select('role')
            .eq('document_id', documentId)
            .eq('user_id', socket.userId)
            .maybeSingle();

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

        await supabase
          .from('active_sessions')
          .insert([{
            document_id: documentId,
            user_id: socket.userId,
            socket_id: socket.id,
            cursor_position: {},
          }]);

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

        await supabase
          .from('documents')
          .update({
            content,
            updated_at: new Date().toISOString(),
          })
          .eq('id', documentId);

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
        await supabase
          .from('documents')
          .update({ last_saved_at: new Date().toISOString() })
          .eq('id', documentId);

        socket.emit('document-saved', {
          timestamp: new Date().toISOString(),
        });
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

    await supabase
      .from('active_sessions')
      .delete()
      .eq('socket_id', socket.id);

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
