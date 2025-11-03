import { useEffect, useState } from 'react';
import { documentApi } from '../../services/api';
import { FileText, Plus, Trash2, Users } from 'lucide-react';

interface Document {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  role: string;
  is_shared?: boolean;
}

interface DocumentListProps {
  onSelectDocument: (id: string) => void;
  onCreateDocument: () => void;
}

export const DocumentList = ({ onSelectDocument, onCreateDocument }: DocumentListProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await documentApi.getAll();
      setDocuments(data.documents);
    } catch (err: any) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await documentApi.delete(id);
      setDocuments(docs => docs.filter(d => d.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete document');
    }
  };

  const handleCreate = async () => {
    try {
      const data = await documentApi.create();
      await loadDocuments();
      onCreateDocument();
      onSelectDocument(data.document.id);
    } catch (err: any) {
      alert(err.message || 'Failed to create document');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">My Documents</h2>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Document
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      {documents.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No documents yet</p>
          <button
            onClick={handleCreate}
            className="text-blue-600 hover:text-blue-700"
          >
            Create your first document
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map(doc => (
            <div
              key={doc.id}
              onClick={() => onSelectDocument(doc.id)}
              className="p-4 bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer border border-gray-200"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1">
                  <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <h3 className="font-semibold text-gray-800 truncate">
                    {doc.title}
                  </h3>
                </div>
                {doc.role === 'owner' && (
                  <button
                    onClick={(e) => handleDelete(doc.id, e)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                {doc.is_shared && (
                  <span className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded">
                    <Users className="w-3 h-3" />
                    Shared
                  </span>
                )}
                <span className="bg-gray-100 px-2 py-1 rounded capitalize">
                  {doc.role}
                </span>
              </div>

              <div className="mt-2 text-xs text-gray-400">
                Updated {new Date(doc.updated_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
