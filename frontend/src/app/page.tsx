'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import { api } from '@/services/api';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { Message } from '@/types';

export default function ChatbotDashboardPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeModalImage, setActiveModalImage] = useState<string | null>(null);

  // Initialize our custom real-time voice input hook
  const { isListening, transcript, error, startListening, stopListening } = useSpeechToText();

  // Keep the chat input field synchronized with the live voice transcript stream
  useEffect(() => {
    if (transcript) {
      setInputValue(transcript);
    }
  }, [transcript]);

  const handleMessageSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    // Turn off the microphone if the user submits while listening
    if (isListening) stopListening();

    const userPrompt = inputValue.trim();
    setInputValue('');

    const userMessage: Message = { id: uuidv4(), role: 'user', content: userPrompt };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const contextHistoryInput = messages.map((m) => ({ role: m.role, content: m.content }));
      const responseData = await api.sendChatMessage(userPrompt, contextHistoryInput);

      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: responseData.answer,
        citations: responseData.citations,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: uuidv4(), role: 'assistant', content: 'Connection timeout. Failed to fetch an answer.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVoiceListeningMode = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-6xl mx-auto p-4">
      <header className="flex justify-between items-center border-b pb-4 mb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Agentic RAG Intelligent Studio</h1>
          <p className="text-xs text-slate-500 font-medium">Powered by ultra-low latency Cerebras Inference pipelines & Local Vector Databases</p>
        </div>
        <Link href="/upload" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-md transition">
          Bulk Upload Vault
        </Link>
      </header>

      {/* Main Chat Display Canvas */}
      <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 p-4 overflow-y-auto mb-4 space-y-4 shadow-inner">
        {error && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-lg font-medium">
            Voice Status Note: {error}
          </div>
        )}

        {messages.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <p className="text-lg font-semibold">Knowledge base initialized.</p>
            <p className="text-sm">Ask a question or click the mic button to speak your query directly.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm border ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white border-indigo-700 rounded-br-none' 
                : 'bg-white text-slate-800 border-slate-200 rounded-bl-none'
            }`}>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>

            {msg.citations && msg.citations.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-3 max-w-[85%]">
                {msg.citations.map((cite, index) => {
                  const absoluteThumbUrl = api.getThumbnailUrl(cite.image_path);
                  return (
                    <div 
                      key={index} 
                      onClick={() => setActiveModalImage(absoluteThumbUrl)}
                      className="group flex items-center gap-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg p-1.5 pr-3 shadow-xs cursor-pointer transition"
                    >
                      <div className="w-10 h-12 bg-slate-200 rounded border border-slate-300 overflow-hidden relative flex-shrink-0">
                        <img src={absoluteThumbUrl} alt="source thumbnail" className="w-full h-full object-cover group-hover:scale-105 transition" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-bold text-slate-700 truncate max-w-[120px]">{cite.document_name}</span>
                        <span className="text-[10px] text-indigo-600 font-black">Page {cite.page_number}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        {isLoading && <div className="text-xs text-slate-400 font-bold animate-pulse">Agent is generating grounded analysis...</div>}
      </div>

      {/* Input Message Form Console with Integrated Mic Assembly Trigger */}
      <form onSubmit={handleMessageSubmit} className="flex gap-2 relative items-center">
        <div className="relative flex-1 flex items-center">
          <input 
            type="text" 
            value={inputValue} 
            onChange={(e) => setInputValue(e.target.value)} 
            placeholder={isListening ? "Listening... Speak clearly now." : "Ask a question about your documents..."} 
            className={`w-full pl-4 pr-12 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm shadow-xs transition ${
              isListening ? 'border-red-400 ring-2 ring-red-100 placeholder-red-400' : 'border-slate-300'
            }`}
          />
          
          {/* Real-time Mic Action Button Component */}
          <button
            type="button"
            onClick={toggleVoiceListeningMode}
            className={`absolute right-3 p-1.5 rounded-lg transition ${
              isListening 
                ? 'bg-red-500 text-white animate-bounce' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
            title={isListening ? "Stop listening" : "Start voice input"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
            </svg>
          </button>
        </div>

        <button type="submit" disabled={isLoading || !inputValue.trim()} className="px-6 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold rounded-xl text-sm shadow-md transition h-11">
          Query
        </button>
      </form>

      {/* Full Page View Lightbox Overlay Modal */}
      {activeModalImage && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setActiveModalImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-white rounded-xl overflow-hidden p-2 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setActiveModalImage(null)} 
              className="absolute top-4 right-4 bg-black/60 hover:bg-black text-white rounded-full w-8 h-8 font-bold flex items-center justify-center transition"
            >
              ✕
            </button>
            <img src={activeModalImage} alt="Full structural source document view" className="max-w-full max-h-[85vh] object-contain rounded" />
          </div>
        </div>
      )}
    </div>
  );
}