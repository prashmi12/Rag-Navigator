
import React, { useState } from 'react';
import { Lang } from './utils/i18n';
import Toast from './components/Toast';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import { DocumentFile, Message } from './types';
import { ragService } from './services/geminiService';
import { generateId } from './utils/fileProcessor';

const App: React.FC = () => {
    const [lang, setLang] = useState<Lang>('en');
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);
  // Global notification system
  const notify = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

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

    try {
      const assistantMessageId = generateId();
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        text: '',
        timestamp: Date.now()
      }]);

      let fullSummary = '';
      const stream = ragService.summarizeDocs(docsToSummarize);
      for await (const chunk of stream) {
        fullSummary += chunk;
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId ? { ...msg, text: fullSummary } : msg
        ));
      }
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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 flex-row">
      <Sidebar 
        documents={documents} 
        onDocumentsChange={setDocuments}
        onSummarize={handleSummarize}
        isProcessing={isTyping}
        lang={lang}
        setLang={setLang}
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
      {/* Example: fire notifications for demo events */}
      {/* <button onClick={() => notify('This is a global notification!', 'info')}>Test Notification</button> */}
    </div>
  );
};

export default App;
