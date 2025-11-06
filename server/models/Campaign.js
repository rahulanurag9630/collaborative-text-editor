import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        type: { type: String, enum: ['email', 'whatsapp'], required: true },
        description: { type: String, default: '' },
        status: { type: String, enum: ['draft', 'active', 'completed'], default: 'draft' },
        sent: { type: Number, default: 0 },
        replies: { type: Number, default: 0 },
        createdAt: { type: Date, default: Date.now },
    },
    { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const Campaign =
    mongoose.models.Campaign || mongoose.model('Campaign', campaignSchema);
