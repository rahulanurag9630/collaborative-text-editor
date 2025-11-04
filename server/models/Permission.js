import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['viewer', 'editor'], required: true },
    grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    grantedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

permissionSchema.index({ documentId: 1, userId: 1 }, { unique: true });

export const Permission = mongoose.models.Permission || mongoose.model('Permission', permissionSchema);


