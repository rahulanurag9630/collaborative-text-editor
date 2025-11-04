import { useEffect, useState, useRef } from 'react';
import ReactQuill from 'react-quill';
import Quill from 'quill';
import QuillCursors from 'quill-cursors';

if (typeof Quill !== 'undefined' && Quill.register) {
  Quill.register('modules/cursors', QuillCursors);
}

import 'react-quill/dist/quill.snow.css';
import { documentApi } from '../../services/api.js';
import { connectSocket, joinDocument, leaveDocument, sendTextChange, saveDocument } from '../../services/socket.js';
import { Save, Users, ArrowLeft, Share2, Sparkles } from 'lucide-react';

export const CollaborativeEditor = ({ documentId, onBack, onOpenAI }) => {
  const [document, setDocument] = useState(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [lastSaved, setLastSaved] = useState('');
  const quillRef = useRef(null);
  const isRemoteChange = useRef(false);
  const colorCacheRef = useRef({});

  useEffect(() => {
    let mounted = true;

    const loadDocument = async () => {
      try {
        const data = await documentApi.getById(documentId);
        if (!mounted) return;

        setDocument(data.document);
        setTitle(data.document.title && data.document.title.trim().length > 0 ? data.document.title : 'Untitled Document');
        setLoading(false);

        // Initialize editor contents from stored Delta
        if (quillRef.current) {
          const quill = quillRef.current.getEditor();
          const initial = (data.document.content && Array.isArray(data.document.content.ops)) ? data.document.content : { ops: [] };
          quill.setContents(initial);
        }

        const socket = connectSocket();
        joinDocument(documentId);

        socket.on('user-joined', ({ userName, users }) => {
          setActiveUsers(users);
        });

        socket.on('user-left', () => { });

        socket.on('text-change', ({ delta }) => {
          if (quillRef.current) {
            const quill = quillRef.current.getEditor();
            isRemoteChange.current = true;
            quill.updateContents(delta);
            isRemoteChange.current = false;
          }
        });

        socket.on('cursor-move', ({ userId, userName, position }) => {
          if (!quillRef.current) return;
          const quill = quillRef.current.getEditor();
          const cursors = quill.getModule('cursors');
          if (!cursors) return;
          if (!colorCacheRef.current[userId]) {
            colorCacheRef.current[userId] = colorFromUserId(userId);
            try { cursors.createCursor(userId, userName, colorCacheRef.current[userId]); } catch { }
          }
          const range = normalizeRange(position);
          if (range) {
            try { cursors.moveCursor(userId, range); } catch { }
          }
        });

        socket.on('document-saved', ({ timestamp }) => {
          setLastSaved(new Date(timestamp).toLocaleTimeString());
          setSaving(false);
        });

        socket.on('document-updated', async ({ document: docPayload, documentId: updatedId }) => {
          try {
            // Use payload if provided, otherwise refetch to ensure consistency
            if (docPayload && docPayload.id === documentId) {
              if (docPayload.title && docPayload.title.trim().length > 0 && docPayload.title !== 'Untitled Document') {
                setTitle(docPayload.title);
              }
              if (quillRef.current && docPayload.content && Array.isArray(docPayload.content.ops)) {
                const quill = quillRef.current.getEditor();
                isRemoteChange.current = true;
                quill.setContents(docPayload.content);
                isRemoteChange.current = false;
              }
            } else if (updatedId === documentId) {
              const data = await documentApi.getById(documentId);
              if (data.document.title && data.document.title.trim().length > 0) {
                setTitle(data.document.title);
              }
              if (quillRef.current && data.document.content && Array.isArray(data.document.content.ops)) {
                const quill = quillRef.current.getEditor();
                isRemoteChange.current = true;
                quill.setContents(data.document.content);
                isRemoteChange.current = false;
              }
            }
          } catch (e) {
            console.error('Failed to refresh updated document:', e);
          }
        });
      } catch (error) {
        console.error('Error loading document:', error);
        if (mounted) {
          alert(error.message || 'Failed to load document');
          onBack();
        }
      }
    };

    loadDocument();

    const autoSaveInterval = setInterval(() => {
      handleSave(true);
    }, 30000);

    return () => {
      mounted = false;
      clearInterval(autoSaveInterval);
      leaveDocument(documentId);
      const socket = connectSocket();
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('text-change');
      socket.off('cursor-move');
      socket.off('document-saved');
      socket.off('document-updated');
    };
  }, [documentId]);

  const handleContentChange = (value, delta, source) => {
    if (source === 'user' && !isRemoteChange.current && quillRef.current) {
      const quill = quillRef.current.getEditor();
      const contents = quill.getContents();
      sendTextChange(documentId, delta, contents);
    }
  };

  const handleSelectionChange = (range, source) => {
    if (source !== 'user') return;
    if (!range) return;
    sendCursorMove(documentId, range);
  };

  const handleSave = async (isAutoSave = false) => {
    if (!isAutoSave) setSaving(true);
    try {
      let contentObj = { ops: [] };
      if (quillRef.current) {
        const quill = quillRef.current.getEditor();
        contentObj = quill.getContents();
      }

      const safeTitle = (title && title.trim().length > 0) ? title.trim() : 'Untitled Document';
      if (!title || title.trim().length === 0) {
        setTitle(safeTitle);
      }
      await documentApi.update(documentId, { title: safeTitle, content: contentObj });
      saveDocument(documentId);
      if (!isAutoSave) setLastSaved(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error saving document:', error);
      if (!isAutoSave) alert(error.message || 'Failed to save document');
    } finally {
      if (!isAutoSave) setSaving(false);
    }
  };

  const handleShare = async () => {
    const email = prompt('Enter email address to share with:');
    if (!email) return;
    const roleChoice = confirm('Click OK for Editor access, Cancel for Viewer access');
    const role = roleChoice ? 'editor' : 'viewer';
    try {
      await documentApi.share(documentId, email, role);
      alert(`Document shared successfully with ${email} as ${role}`);
    } catch (error) {
      alert(error.message || 'Failed to share document');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading document...</div>
      </div>
    );
  }

  function normalizeRange(position) {
    if (!position) return null;
    const { index = 0, length = 0 } = position;
    if (typeof index !== 'number' || typeof length !== 'number') return null;
    return { index, length };
  }

  function colorFromUserId(id) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  }

  // Register cursors module once
  try { Quill.register('modules/cursors', QuillCursors); } catch { }

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ align: [] }],
      ['link'],
      ['clean'],
    ],
    cursors: {
      transformOnTextChange: true,
    },
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenAI}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              AI Assistant
            </button>

            {document?.role === 'owner' && (
              <button onClick={handleShare} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                <Share2 className="w-4 h-4" />
                Share
              </button>
            )}

            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-2xl font-semibold text-gray-800 border-none outline-none bg-transparent flex-1"
            placeholder="Untitled Document"
          />

          <div className="flex items-center gap-4 text-sm text-gray-500">
            {lastSaved && <span>Last saved: {lastSaved}</span>}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{activeUsers.length} online</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-5xl mx-auto px-6 py-6">
          <div className="bg-white rounded-lg shadow-sm h-full">
            <ReactQuill
              ref={quillRef}
              theme="snow"
              onChange={handleContentChange}
              onChangeSelection={handleSelectionChange}
              modules={modules}
              className="h-full"
              placeholder="Start typing..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};


