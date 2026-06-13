'use client';

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { api } from '@/services/api';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { Message } from '@/types';

type AssistantSection = {
  title: string;
  body: string;
};

function extractAssistantSections(content: string): AssistantSection[] {
  const lines = content.split(/\r?\n/);
  const sections: AssistantSection[] = [];
  let currentTitle = 'Answer';
  let currentBody: string[] = [];

  const flushSection = () => {
    const body = currentBody.join('\n').trim();
    if (body || sections.length === 0) {
      sections.push({ title: currentTitle, body });
    }
    currentBody = [];
  };

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushSection();
      currentTitle = headingMatch[2].trim();
      continue;
    }

    currentBody.push(line);
  }

  flushSection();
  return sections;
}

function renderInlineMarkdown(text: string) {
  const parts: ReactNode[] = [];
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);

  tokens.forEach((token, index) => {
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(<strong key={`${index}-bold`}>{token.slice(2, -2)}</strong>);
      return;
    }

    if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={`${index}-code`} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-800">
          {token.slice(1, -1)}
        </code>
      );
      return;
    }

    parts.push(<span key={`${index}-text`}>{token}</span>);
  });

  return parts;
}

function renderMarkdownBody(content: string, textColor: string) {
  const lines = content.split(/\r?\n/);
  const nodes: ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = (keyPrefix: string) => {
    if (!listBuffer.length) return;

    nodes.push(
      <ul key={`${keyPrefix}-list`} className="mt-2 ml-5 list-disc space-y-1">
        {listBuffer.map((item, index) => (
          <li key={`${keyPrefix}-item-${index}`}>{renderInlineMarkdown(item.trim().replace(/^[-*]\s+/, ''))}</li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList(`blank-${index}`);
      return;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      listBuffer.push(trimmed);
      return;
    }

    flushList(`line-${index}`);

    if (/^#{1,3}\s+/.test(trimmed)) {
      const level = trimmed.match(/^(#{1,3})\s+/)?.[1].length ?? 1;
      const title = trimmed.replace(/^#{1,3}\s+/, '');
      const headingClasses =
        level === 1
          ? 'text-lg font-bold'
          : level === 2
            ? 'text-base font-bold'
            : 'text-sm font-bold uppercase tracking-wide';

      nodes.push(
        <p key={`heading-${index}`} className={`${headingClasses} ${textColor} mt-3 first:mt-0`}>
          {renderInlineMarkdown(title)}
        </p>
      );
      return;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      nodes.push(
        <p key={`ordered-${index}`} className={`${textColor} leading-6`}>
          {renderInlineMarkdown(trimmed)}
        </p>
      );
      return;
    }

    nodes.push(
      <p key={`paragraph-${index}`} className={`${textColor} leading-6`}>
        {renderInlineMarkdown(trimmed)}
      </p>
    );
  });

  flushList('end');

  return nodes;
}

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

    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: userPrompt };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const contextHistoryInput = messages.map((m) => ({ role: m.role, content: m.content }));
      const responseData = await api.sendChatMessage(userPrompt, contextHistoryInput);

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: responseData.answer,
        citations: responseData.citations,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: 'Connection timeout. Failed to fetch an answer.' }
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

  const getBubbleBaseClasses = (role: 'user' | 'assistant') =>
    role === 'user'
      ? 'bg-indigo-600 text-white border-indigo-700 rounded-br-none'
      : 'bg-white text-slate-800 border-slate-200 rounded-bl-none';

  const renderAssistantContent = (content: string, messageId: string) => {
    const sections = extractAssistantSections(content);

    return (
      <div className="space-y-3">
        {sections.map((section, index) => {
          const isSummarySection = index === 0 && sections.length === 1;
          const textColor = 'text-slate-700';

          return (
            <details
              key={`${messageId}-section-${index}`}
              open={isSummarySection}
              className="group rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 open:bg-white"
            >
              <summary className="cursor-pointer list-none select-none text-sm font-semibold text-slate-800 flex items-center justify-between gap-3">
                <span>{section.title}</span>
                <span className="text-[11px] font-bold text-slate-400 group-open:hidden">Expand</span>
                <span className="hidden text-[11px] font-bold text-slate-400 group-open:inline">Collapse</span>
              </summary>
              <div className="mt-3 space-y-2">
                {section.body ? renderMarkdownBody(section.body, textColor) : null}
              </div>
            </details>
          );
        })}
      </div>
    );
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
            <div className={`w-full sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-sm border overflow-hidden ${getBubbleBaseClasses(msg.role)}`}>
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className={`text-[11px] font-bold uppercase tracking-[0.18em] ${msg.role === 'user' ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {msg.role === 'user' ? 'You' : 'Assistant'}
                </span>
              </div>
              {msg.role === 'assistant'
                ? renderAssistantContent(msg.content, msg.id)
                : (
                  <div className="max-h-[340px] overflow-y-auto pr-1 whitespace-pre-wrap break-words leading-6 text-white">
                    {msg.content}
                  </div>
                )}
            </div>

            {msg.citations && msg.citations.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3 w-full sm:max-w-[78%]">
                {msg.citations.map((cite, index) => {
                  const absoluteThumbUrl = api.getThumbnailUrl(cite.image_path);
                  return (
                    <div 
                      key={index} 
                      onClick={() => setActiveModalImage(absoluteThumbUrl)}
                      className="group flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl p-2 pr-3 shadow-sm cursor-pointer transition"
                    >
                      <div className="w-10 h-12 bg-slate-200 rounded-lg border border-slate-300 overflow-hidden relative flex-shrink-0">
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