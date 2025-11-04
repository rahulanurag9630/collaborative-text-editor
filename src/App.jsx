import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { LoginForm } from './components/Auth/LoginForm.jsx';
import { RegisterForm } from './components/Auth/RegisterForm.jsx';
import { DocumentList } from './components/Documents/DocumentList.jsx';
import { CollaborativeEditor } from './components/Editor/CollaborativeEditor.jsx';
import { AIAssistant } from './components/AI/AIAssistant.jsx';
import { LogOut, FileText } from 'lucide-react';

function AppContent() {
  const { user, loading, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(true);
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center">
        {showLogin ? (
          <LoginForm onToggleForm={() => setShowLogin(false)} />
        ) : (
          <RegisterForm onToggleForm={() => setShowLogin(true)} />
        )}
      </div>
    );
  }

  if (selectedDocumentId) {
    return (
      <>
        <CollaborativeEditor
          documentId={selectedDocumentId}
          onBack={() => setSelectedDocumentId(null)}
          onOpenAI={() => setShowAIAssistant(true)}
        />
        {showAIAssistant && (
          <AIAssistant onClose={() => setShowAIAssistant(false)} />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Collaborative Editor
                </h1>
                <p className="text-sm text-gray-500">Real-time editing with AI assistance</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        <DocumentList
          onSelectDocument={setSelectedDocumentId}
          onCreateDocument={() => {}}
        />
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;


