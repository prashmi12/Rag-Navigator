
import React, { useState, useRef, useEffect } from 'react';
import { Message, DocumentFile } from '../types';
import { ragService } from '../services/geminiService';
import { generateId } from '../utils/fileProcessor';

import { Lang, translations } from '../utils/i18n';

interface ChatWindowProps {
  documents: DocumentFile[];
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  isTyping: boolean;
  setIsTyping: React.Dispatch<React.SetStateAction<boolean>>;
  lang: Lang;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  documents, 
  messages, 
  setMessages, 
  isTyping, 
  setIsTyping, 
  lang
}) => {
  const [answerLang, setAnswerLang] = useState<Lang>(lang);
  const [input, setInput] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (documents.length > 0 && !isInitialized) {
      const init = async () => {
        setIsTyping(true);
        try {
          await ragService.initializeChat(documents);
          setIsInitialized(true);
          if (messages.length === 0) {
            setMessages([
              {
                id: generateId(),
                role: 'assistant',
                text: answerLang === 'hi'
                  ? `मैंने ${documents.length} दस्तावेज़ों का विश्लेषण किया है। मैं आपकी किस प्रकार सहायता कर सकता हूँ?`
                  : `I've analyzed ${documents.length} document(s). How can I help you today?`,
                timestamp: Date.now()
              }
            ]);
          }
        } catch (error) {
          console.error("Initialization failed", error);
        } finally {
          setIsTyping(false);
        }
      };
      init();
    }
  }, [documents, isInitialized]);

  // Re-initialize if documents change significantly
  useEffect(() => {
    if (isInitialized && documents.length > 0) {
      ragService.initializeChat(documents);
    }
  }, [documents, isInitialized]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !isInitialized || isTyping) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      text: input.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      let fullResponse = '';
      const assistantMessageId = generateId();
      let messageAdded = false;
      
      // Instruct LLM to reply in the selected language
      const prompt = lang === 'hi'
        ? userMessage.text + '\nउत्तर हिंदी में दें।'
        : userMessage.text;
      const stream = ragService.sendMessageStream(prompt);
      for await (const chunk of stream) {
        fullResponse += chunk;
        
        // Only add message to state after first chunk arrives
        if (!messageAdded) {
          setMessages(prev => [...prev, {
            id: assistantMessageId,
            role: 'assistant',
            text: fullResponse,
            timestamp: Date.now()
          }]);
          messageAdded = true;
        } else {
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId ? { ...msg, text: fullResponse } : msg
          ));
        }
      }
    } catch (error) {
      console.error("Chat Error:", error);
      const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        text: errorMsg,
        timestamp: Date.now()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-slate-800 flex items-center px-6 bg-slate-900/80 backdrop-blur-md z-10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-100">RAG Chat Assistant</h1>
            <div className="flex items-center space-x-1">
              <span className={`w-2 h-2 rounded-full ${isInitialized ? 'bg-green-500' : 'bg-slate-600'}`}></span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                {isInitialized ? 'Active & Grounded' : 'Waiting for Docs'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-50">
            <div className="p-4 rounded-full bg-slate-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <p className="text-slate-400 font-medium">Upload documents to start the conversation</p>
          </div>
        ) : (
          messages.map((msg) => {
            // Don't display empty assistant messages (they appear as blank dots)
            if (msg.role === 'assistant' && !msg.text.trim()) {
              return null;
            }
            return (
            <div 
              key={msg.id} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] flex ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3`}>
                <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${msg.role === 'user' ? 'bg-slate-700 ml-3' : 'bg-blue-600/20 mr-3'}`}>
                  {msg.role === 'user' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )}
                </div>
                <div className={`p-4 rounded-2xl ${
                  msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-900/20' 
                  : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700 shadow-sm'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text || (isTyping && '...')}</p>
                </div>
              </div>
            </div>
            );
          })
        )}
        {isTyping && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
           <div className="flex justify-start">
             <div className="max-w-[80%] flex items-start space-x-3">
               <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center mr-3">
                 <div className="animate-pulse w-2 h-2 bg-blue-400 rounded-full"></div>
               </div>
               <div className="p-4 rounded-2xl bg-slate-800 text-slate-400 rounded-tl-none border border-slate-700 italic text-sm">
                 Processing request...
               </div>
             </div>
           </div>
        )}
      </div>

      {/* Input */}
      <div className="p-6 bg-slate-900 border-t border-slate-800">
        <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!isInitialized || isTyping}
            placeholder={isInitialized ? "Ask a question about your documents..." : "Please upload documents first..."}
            className="w-full bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-2xl py-4 pl-6 pr-24 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || !isInitialized || isTyping}
            className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white rounded-xl px-6 transition-all shadow-lg shadow-blue-900/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
        <p className="text-center text-[10px] text-slate-500 mt-3 font-medium uppercase tracking-widest">
          Powered by Gemini 3 Pro & RAG Engine
        </p>
      </div>
    </div>
  );
};

export default ChatWindow;
