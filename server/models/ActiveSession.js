import mongoose from 'mongoose';

const activeSessionSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    socketId: { type: String, required: true, index: true },
    cursorPosition: { type: Object, default: {} },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const ActiveSession = mongoose.models.ActiveSession || mongoose.model('ActiveSession', activeSessionSchema);


