import { useEffect, useState, useRef } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { documentApi } from '../../services/api';
import { connectSocket, joinDocument, leaveDocument, sendTextChange, saveDocument, getSocket } from '../../services/socket';
import { Save, Users, ArrowLeft, Share2, Sparkles } from 'lucide-react';

interface User {
  userId: string;
  userName: string;
  cursorPosition?: any;
}

interface CollaborativeEditorProps {
  documentId: string;
  onBack: () => void;
  onOpenAI: () => void;
}

export const CollaborativeEditor = ({ documentId, onBack, onOpenAI }: CollaborativeEditorProps) => {
  const [document, setDocument] = useState<any>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [lastSaved, setLastSaved] = useState<string>('');
  const quillRef = useRef<ReactQuill>(null);
  const isRemoteChange = useRef(false);

  useEffect(() => {
    let mounted = true;

    const loadDocument = async () => {
      try {
        const data = await documentApi.getById(documentId);
        if (!mounted) return;

        setDocument(data.document);
        setTitle(data.document.title);
        setContent(JSON.stringify(data.document.content));
        setLoading(false);

        const socket = connectSocket();
        joinDocument(documentId);

        socket.on('user-joined', ({ userName, users }) => {
          console.log(`${userName} joined`);
          setActiveUsers(users);
        });

        socket.on('user-left', ({ userName }) => {
          console.log(`${userName} left`);
        });

        socket.on('text-change', ({ delta, userName }) => {
          console.log(`Text change from ${userName}`);
          if (quillRef.current) {
            const quill = quillRef.current.getEditor();
            isRemoteChange.current = true;
            quill.updateContents(delta);
            isRemoteChange.current = false;
          }
        });

        socket.on('cursor-move', ({ userName, position }) => {
          console.log(`Cursor move from ${userName}`);
        });

        socket.on('document-saved', ({ timestamp }) => {
          setLastSaved(new Date(timestamp).toLocaleTimeString());
          setSaving(false);
        });

      } catch (error: any) {
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
    };
  }, [documentId]);

  const handleContentChange = (value: string, delta: any, source: any) => {
    if (source === 'user' && !isRemoteChange.current) {
      setContent(value);

      if (quillRef.current) {
        const quill = quillRef.current.getEditor();
        const contents = quill.getContents();
        sendTextChange(documentId, delta, contents);
      }
    }
  };

  const handleSave = async (isAutoSave = false) => {
    if (!isAutoSave) {
      setSaving(true);
    }

    try {
      let contentObj;
      try {
        if (quillRef.current) {
          const quill = quillRef.current.getEditor();
          contentObj = quill.getContents();
        } else {
          contentObj = content ? JSON.parse(content) : { ops: [] };
        }
      } catch {
        contentObj = { ops: [] };
      }

      await documentApi.update(documentId, {
        title,
        content: contentObj,
      });

      saveDocument(documentId);

      if (!isAutoSave) {
        setLastSaved(new Date().toLocaleTimeString());
      }
    } catch (error: any) {
      console.error('Error saving document:', error);
      if (!isAutoSave) {
        alert(error.message || 'Failed to save document');
      }
    } finally {
      if (!isAutoSave) {
        setSaving(false);
      }
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
    } catch (error: any) {
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

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ align: [] }],
      ['link'],
      ['clean'],
    ],
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
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
              <button
                onClick={handleShare}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
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
              value={content}
              onChange={handleContentChange}
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
