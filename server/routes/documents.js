import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { documentValidation, shareValidation, uuidValidation } from '../middleware/validation.js';
import { apiLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

router.use(authenticate);
router.use(apiLimiter);

router.get('/', async (req, res) => {
  try {
    const { data: ownedDocs, error: ownedError } = await supabase
      .from('documents')
      .select('id, title, created_at, updated_at')
      .eq('owner_id', req.user.id)
      .order('updated_at', { ascending: false });

    if (ownedError) throw ownedError;

    const { data: sharedDocs, error: sharedError } = await supabase
      .from('document_permissions')
      .select('role, documents(id, title, created_at, updated_at, owner_id)')
      .eq('user_id', req.user.id)
      .order('granted_at', { ascending: false });

    if (sharedError) throw sharedError;

    const formattedSharedDocs = sharedDocs
      .filter(item => item.documents)
      .map(item => ({
        ...item.documents,
        role: item.role,
        is_shared: true,
      }));

    const allDocs = [
      ...ownedDocs.map(doc => ({ ...doc, role: 'owner', is_shared: false })),
      ...formattedSharedDocs,
    ];

    res.json({ documents: allDocs });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

router.post('/', documentValidation, async (req, res) => {
  try {
    const { title = 'Untitled Document' } = req.body;

    const { data: document, error } = await supabase
      .from('documents')
      .insert([{
        title,
        owner_id: req.user.id,
        content: { ops: [] },
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ document });
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

router.get('/:id', uuidValidation, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: document, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.owner_id !== req.user.id) {
      const { data: permission } = await supabase
        .from('document_permissions')
        .select('role')
        .eq('document_id', id)
        .eq('user_id', req.user.id)
        .maybeSingle();

      if (!permission) {
        return res.status(403).json({ error: 'Access denied' });
      }

      document.role = permission.role;
    } else {
      document.role = 'owner';
    }

    res.json({ document });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

router.put('/:id', uuidValidation, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    const { data: document } = await supabase
      .from('documents')
      .select('owner_id')
      .eq('id', id)
      .maybeSingle();

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    let hasAccess = document.owner_id === req.user.id;

    if (!hasAccess) {
      const { data: permission } = await supabase
        .from('document_permissions')
        .select('role')
        .eq('document_id', id)
        .eq('user_id', req.user.id)
        .maybeSingle();

      hasAccess = permission && permission.role === 'editor';
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;

    const { data: updatedDoc, error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ document: updatedDoc });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

router.delete('/:id', uuidValidation, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: document } = await supabase
      .from('documents')
      .select('owner_id')
      .eq('id', id)
      .maybeSingle();

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the owner can delete this document' });
    }

    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

router.post('/:id/share', uuidValidation, shareValidation, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role } = req.body;

    const { data: document } = await supabase
      .from('documents')
      .select('owner_id, title')
      .eq('id', id)
      .maybeSingle();

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the owner can share this document' });
    }

    const { data: targetUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot share document with yourself' });
    }

    const { data: permission, error } = await supabase
      .from('document_permissions')
      .upsert({
        document_id: id,
        user_id: targetUser.id,
        role,
        granted_by: req.user.id,
      }, { onConflict: 'document_id,user_id' })
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: 'Document shared successfully',
      permission,
    });
  } catch (error) {
    console.error('Error sharing document:', error);
    res.status(500).json({ error: 'Failed to share document' });
  }
});

router.get('/:id/permissions', uuidValidation, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: document } = await supabase
      .from('documents')
      .select('owner_id')
      .eq('id', id)
      .maybeSingle();

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the owner can view permissions' });
    }

    const { data: permissions, error } = await supabase
      .from('document_permissions')
      .select('id, role, granted_at, users(id, email, name)')
      .eq('document_id', id);

    if (error) throw error;

    res.json({ permissions });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

export default router;
