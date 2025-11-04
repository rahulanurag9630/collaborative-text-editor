import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { documentValidation, shareValidation, objectIdValidation } from '../middleware/validation.js';
import { apiLimiter } from '../middleware/rateLimit.js';
import { Document } from '../models/Document.js';
import { Permission } from '../models/Permission.js';
import { User } from '../models/User.js';
import { io } from '../index.js';

const router = express.Router();

router.use(authenticate);
router.use(apiLimiter);

router.get('/', async (req, res) => {
  try {
    const ownedDocs = await Document.find({ ownerId: req.user.id })
      .select('_id title created_at updated_at')
      .sort({ updated_at: -1 });

    const sharedPerms = await Permission.find({ userId: req.user.id })
      .populate('documentId', '_id title created_at updated_at ownerId')
      .sort({ grantedAt: -1 });

    const formattedSharedDocs = sharedPerms
      .filter(p => p.documentId)
      .map(p => ({
        id: String(p.documentId._id),
        title: p.documentId.title,
        created_at: p.documentId.created_at,
        updated_at: p.documentId.updated_at,
        role: p.role,
        is_shared: true,
      }));

    const ownedFormatted = ownedDocs.map(doc => ({
      id: String(doc._id),
      title: doc.title,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      role: 'owner',
      is_shared: false,
    }));

    res.json({ documents: [...ownedFormatted, ...formattedSharedDocs] });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

router.post('/', documentValidation, async (req, res) => {
  try {
    const { title = 'Untitled Document' } = req.body;
    const doc = await Document.create({ title, ownerId: req.user.id, content: { ops: [] } });
    res.status(201).json({ document: { id: String(doc._id), title: doc.title, created_at: doc.created_at, updated_at: doc.updated_at } });
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

router.get('/:id', objectIdValidation, async (req, res) => {
  try {
    const { id } = req.params;
    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    let role = 'owner';
    if (String(document.ownerId) !== req.user.id) {
      const permission = await Permission.findOne({ documentId: id, userId: req.user.id }).select('role');
      if (!permission) {
        return res.status(403).json({ error: 'Access denied' });
      }
      role = permission.role;
    }

    const safeTitle = (document.title && document.title.trim().length > 0) ? document.title : 'Untitled Document';
    const safeContent = (document.content && Array.isArray(document.content.ops)) ? document.content : { ops: [] };
    res.json({ document: { id: String(document._id), title: safeTitle, content: safeContent, created_at: document.created_at, updated_at: document.updated_at, role } });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

router.put('/:id', objectIdValidation, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const document = await Document.findById(id).select('ownerId title content created_at updated_at');
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    let hasAccess = String(document.ownerId) === req.user.id;
    if (!hasAccess) {
      const permission = await Permission.findOne({ documentId: id, userId: req.user.id }).select('role');
      hasAccess = permission && permission.role === 'editor';
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = {};
    if (typeof title === 'string') {
      const trimmed = title.trim();
      if (trimmed.length > 0 && trimmed !== 'Untitled Document') {
        updates.title = trimmed;
      }
    }
    if (content && typeof content === 'object' && Array.isArray(content.ops)) {
      updates.content = content;
    }

    // If no valid updates, return current document without broadcasting
    if (Object.keys(updates).length === 0) {
      const safeTitle = (document.title && document.title.trim().length > 0) ? document.title : 'Untitled Document';
      const safeContent = (document.content && Array.isArray(document.content.ops)) ? document.content : { ops: [] };
      return res.json({ document: { id: String(document._id), title: safeTitle, content: safeContent, created_at: document.created_at, updated_at: document.updated_at } });
    }

    const updatedDoc = await Document.findByIdAndUpdate(id, updates, { new: true });
    const safeTitle = (updatedDoc.title && updatedDoc.title.trim().length > 0) ? updatedDoc.title : 'Untitled Document';
    const safeContent = (updatedDoc.content && Array.isArray(updatedDoc.content.ops)) ? updatedDoc.content : { ops: [] };
    const payload = { id: String(updatedDoc._id), title: safeTitle, content: safeContent, created_at: updatedDoc.created_at, updated_at: updatedDoc.updated_at };
    // Notify all collaborators to refresh state
    io.to(id).emit('document-updated', { document: payload });
    res.json({ document: payload });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

router.delete('/:id', objectIdValidation, async (req, res) => {
  try {
    const { id } = req.params;
    const document = await Document.findById(id).select('ownerId');
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (String(document.ownerId) !== req.user.id) {
      return res.status(403).json({ error: 'Only the owner can delete this document' });
    }

    await Document.findByIdAndDelete(id);
    await Permission.deleteMany({ documentId: id });
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

router.post('/:id/share', objectIdValidation, shareValidation, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role } = req.body;

    const document = await Document.findById(id).select('ownerId title');
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (String(document.ownerId) !== req.user.id) {
      return res.status(403).json({ error: 'Only the owner can share this document' });
    }

    const targetUser = await User.findOne({ email }).select('_id email');
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (String(targetUser._id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot share document with yourself' });
    }

    const permission = await Permission.findOneAndUpdate(
      { documentId: id, userId: targetUser._id },
      { role, grantedBy: req.user.id },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ message: 'Document shared successfully', permission: { id: String(permission._id), role: permission.role } });
  } catch (error) {
    console.error('Error sharing document:', error);
    res.status(500).json({ error: 'Failed to share document' });
  }
});

router.get('/:id/permissions', objectIdValidation, async (req, res) => {
  try {
    const { id } = req.params;
    const document = await Document.findById(id).select('ownerId');
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (String(document.ownerId) !== req.user.id) {
      return res.status(403).json({ error: 'Only the owner can view permissions' });
    }

    const permissions = await Permission.find({ documentId: id }).populate('userId', '_id email name');
    res.json({ permissions: permissions.map(p => ({ id: String(p._id), role: p.role, granted_at: p.grantedAt, user: { id: String(p.userId._id), email: p.userId.email, name: p.userId.name } })) });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

export default router;
