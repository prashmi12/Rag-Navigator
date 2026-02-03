
import React, { useState, useEffect } from 'react';
import { Lang } from './utils/i18n';
import Toast from './components/Toast';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import { DocumentFile, Message } from './types';
import { ragService } from './services/geminiService';
import { generateId } from './utils/fileProcessor';
import { storageService } from './utils/storageService';
import { analyticsService } from './utils/analyticsService';

const App: React.FC = () => {
    const [lang, setLang] = useState<Lang>('en');
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  // Global notification system
  const notify = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  // Load session on app mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        const session = await storageService.loadSession();
        if (session && session.documents.length > 0) {
          setDocuments(session.documents);
          setMessages(session.messages);
          notify('Session restored from last visit', 'success');
        }
      } catch (error) {
        console.error('Failed to load session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  // Auto-save session whenever documents or messages change
  useEffect(() => {
    if (!isLoading && (documents.length > 0 || messages.length > 0)) {
      const saveSession = async () => {
        try {
          await storageService.saveSession(documents, messages);
        } catch (error) {
          console.error('Failed to save session:', error);
        }
      };

      // Debounce save to avoid too frequent writes
      const timer = setTimeout(saveSession, 1000);
      return () => clearTimeout(timer);
    }
  }, [documents, messages, isLoading]);

  // Track document uploads and deletions
  useEffect(() => {
    if (!isLoading) {
      analyticsService.trackDocumentUpload(documents.length);
    }
  }, [documents.length, isLoading]);

  const handleSummarize = async (docsToSummarize: DocumentFile[]) => {
    if (isTyping || docsToSummarize.length === 0) return;
    if (docsToSummarize.length === 0) {
      setToast({ message: 'No documents selected for summarization.', type: 'info' });
      return;
    }

    const summaryRequestText = docsToSummarize.length === 1 
      ? `Generate a summary for "${docsToSummarize[0].name}"`
      : `Generate a collective summary for ${docsToSummarize.length} documents`;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      text: summaryRequestText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    const startTime = Date.now();

    try {
      const assistantMessageId = generateId();
      let fullSummary = '';
      let tokensUsed = 0;
      let messageAdded = false;
      
      const stream = ragService.summarizeDocs(docsToSummarize);
      for await (const chunk of stream) {
        fullSummary += chunk;
        tokensUsed += chunk.length * 1.3; // Rough estimate: ~1.3 tokens per character
        
        // Only add message to state after first chunk arrives
        if (!messageAdded) {
          setMessages(prev => [...prev, {
            id: assistantMessageId,
            role: 'assistant',
            text: fullSummary,
            timestamp: Date.now()
          }]);
          messageAdded = true;
        } else {
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId ? { ...msg, text: fullSummary } : msg
          ));
        }
      }

      // Track analytics
      const responseTime = (Date.now() - startTime) / 1000;
      analyticsService.trackSummarize(docsToSummarize.length, Math.ceil(tokensUsed));
    } catch (error: any) {
      console.error("Summarization failed", error);
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        text: error?.message || "I encountered an error while trying to summarize your document(s).",
        timestamp: Date.now()
      }]);
      let errorMsg = 'Summarization failed. Please try again.';
      if (error?.message) {
        if (error.message.includes('API key is missing')) errorMsg = 'Gemini API key is missing or invalid.';
        else if (error.message.includes('quota')) errorMsg = 'API quota exceeded. Please check your Gemini account.';
        else errorMsg = error.message;
      }
      setToast({ message: errorMsg, type: 'error' });
    } finally {
      setIsTyping(false);
    }
  };

  // Clear all data and history
  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear all documents and chat history? This cannot be undone.')) {
      return;
    }

    try {
      await storageService.clearAllSessions();
      setDocuments([]);
      setMessages([]);
      notify('All data cleared successfully', 'success');
    } catch (error) {
      console.error('Failed to clear history:', error);
      notify('Failed to clear history', 'error');
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 flex-row">
      <Sidebar 
        documents={documents} 
        onDocumentsChange={setDocuments}
        onSummarize={handleSummarize}
        isProcessing={isTyping}
        lang={lang}
        setLang={setLang}
        onClearHistory={handleClearHistory}
        onShowAnalytics={() => setShowAnalytics(true)}
      />
      <main className="flex-1 h-full">
        {documents.length > 0 ? (
          <ChatWindow 
            documents={documents} 
            messages={messages}
            setMessages={setMessages}
            isTyping={isTyping}
            setIsTyping={setIsTyping}
            lang={lang}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-900">
            <div className="max-w-md w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 animate-pulse"></div>
                <div className="relative bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-2xl">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-blue-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.691.385a4 4 0 01-1.347.47l-2.094.313a2 2 0 01-2.247-1.474l-.333-1.13a2 2 0 01.127-1.275L6.183 9.08a2 2 0 01.996-1.104l2.673-1.336a2 2 0 011.66 0l2.673 1.336a2 2 0 01.996 1.104l.872 2.115a2 2 0 01.127 1.275l-.333 1.13a2 2 0 01-2.247 1.474l-2.094.313a4 4 0 01-1.347-.47l-.691-.385a6 6 0 00-3.86-.517l-2.387.477a2 2 0 00-1.022.547l-1.16 1.16a2 2 0 01-2.828 0l-1.16-1.16a2 2 0 00-1.022-.547z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="space-y-4">
                <h2 className="text-4xl font-extrabold text-white tracking-tight">
                  Gemini <span className="text-blue-500">RAG</span> Navigator
                </h2>
                <p className="text-slate-400 text-lg leading-relaxed">
                  Upload your technical docs, research papers, or large datasets to start a conversation with context. 
                  Get precise answers powered by Gemini 3's advanced reasoning.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-left">
                <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-800">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-slate-200">Instant Context</h4>
                  <p className="text-sm text-slate-500">Gemini processes your documents to understand structure and content.</p>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-800">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04a11.357 11.357 0 00-1.026 5.49c0 3.003 1.203 5.723 3.162 7.74a11.785 11.785 0 007.03 3.674c3.427-1.12 6.347-3.418 8.017-6.52a11.392 11.392 0 001.018-4.894 11.285 11.285 0 00-1.016-5.308z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-slate-200">Strictly Grounded</h4>
                  <p className="text-sm text-slate-500">Answers are strictly derived from your uploaded information.</p>
                </div>
              </div>
              <div className="pt-4">
                <button 
                   onClick={() => document.querySelector('input[type="file"]')?.dispatchEvent(new MouseEvent('click'))}
                   className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-900/30 transition-all hover:-translate-y-1 active:scale-95"
                >
                  Upload My First Document
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      <AnalyticsDashboard 
        lang={lang} 
        isOpen={showAnalytics} 
        onClose={() => setShowAnalytics(false)} 
      />
      {/* Example: fire notifications for demo events */}
      {/* <button onClick={() => notify('This is a global notification!', 'info')}>Test Notification</button> */}
    </div>
  );
};

export default App;
