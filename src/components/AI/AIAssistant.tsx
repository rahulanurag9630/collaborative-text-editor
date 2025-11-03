import { useState } from 'react';
import { aiApi } from '../../services/api';
import { Sparkles, Check, Wand2, FileText, Lightbulb, X } from 'lucide-react';

interface AIAssistantProps {
  onClose: () => void;
}

export const AIAssistant = ({ onClose }: AIAssistantProps) => {
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAction = async (action: string) => {
    if (!text.trim()) {
      setError('Please enter some text');
      return;
    }

    setLoading(true);
    setError('');
    setResult('');

    try {
      let data;
      switch (action) {
        case 'grammar':
          data = await aiApi.checkGrammar(text);
          setResult(data.suggestions);
          break;
        case 'enhance':
          data = await aiApi.enhanceText(text);
          setResult(data.enhancedText);
          break;
        case 'summarize':
          data = await aiApi.summarize(text);
          setResult(data.summary);
          break;
        case 'complete':
          data = await aiApi.complete(text);
          setResult(data.completion);
          break;
        case 'suggestions':
          data = await aiApi.getSuggestions(text);
          setResult(data.suggestions);
          break;
      }
    } catch (err: any) {
      setError(err.message || 'AI request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6" />
            <h2 className="text-xl font-bold">AI Writing Assistant</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter your text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Paste or type your text here..."
              disabled={loading}
            />
          </div>

          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">Choose an action:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <button
                onClick={() => handleAction('grammar')}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
              >
                <Check className="w-5 h-5" />
                <span className="text-sm font-medium">Grammar Check</span>
              </button>

              <button
                onClick={() => handleAction('enhance')}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 disabled:opacity-50 transition-colors"
              >
                <Wand2 className="w-5 h-5" />
                <span className="text-sm font-medium">Enhance</span>
              </button>

              <button
                onClick={() => handleAction('summarize')}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
              >
                <FileText className="w-5 h-5" />
                <span className="text-sm font-medium">Summarize</span>
              </button>

              <button
                onClick={() => handleAction('complete')}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-3 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 disabled:opacity-50 transition-colors"
              >
                <Sparkles className="w-5 h-5" />
                <span className="text-sm font-medium">Complete</span>
              </button>

              <button
                onClick={() => handleAction('suggestions')}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-3 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 disabled:opacity-50 transition-colors"
              >
                <Lightbulb className="w-5 h-5" />
                <span className="text-sm font-medium">Suggestions</span>
              </button>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3 text-blue-600">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span>AI is thinking...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {result && !loading && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Result:
              </label>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
                  {result}
                </pre>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(result);
                  alert('Copied to clipboard!');
                }}
                className="mt-3 text-sm text-blue-600 hover:text-blue-700"
              >
                Copy to clipboard
              </button>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            AI suggestions are powered by Google Gemini. Results may vary.
          </p>
        </div>
      </div>
    </div>
  );
};
