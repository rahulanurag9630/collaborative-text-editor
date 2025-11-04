import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    title: { type: String, default: 'Untitled Document' },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: Object, default: { ops: [] } },
    lastSavedAt: { type: Date },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const Document = mongoose.models.Document || mongoose.model('Document', documentSchema);


