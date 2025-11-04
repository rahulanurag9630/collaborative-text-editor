import { io } from 'socket.io-client';
import { getAuthToken } from './api.js';

const SOCKET_URL = 'http://localhost:3001';

let socket = null;

export const connectSocket = () => {
  if (socket?.connected) return socket;

  const token = getAuthToken();
  if (!token) throw new Error('No authentication token available');

  socket = io(SOCKET_URL, { auth: { token }, autoConnect: true });

  socket.on('connect', () => console.log('Socket connected'));
  socket.on('disconnect', () => console.log('Socket disconnected'));
  socket.on('error', (error) => console.error('Socket error:', error));

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

export const joinDocument = (documentId) => {
  if (!socket) throw new Error('Socket not connected');
  socket.emit('join-document', { documentId });
};

export const leaveDocument = (documentId) => {
  if (!socket) return;
  socket.emit('leave-document', { documentId });
};

export const sendTextChange = (documentId, delta, content) => {
  if (!socket) return;
  socket.emit('text-change', { documentId, delta, content });
};

export const sendCursorMove = (documentId, position) => {
  if (!socket) return;
  socket.emit('cursor-move', { documentId, position });
};

export const saveDocument = (documentId) => {
  if (!socket) return;
  socket.emit('document-save', { documentId });
};


