import React from 'react';

interface ChatWindowProps {
  messages: any[];
  isLoading: boolean;
  activeModalImage: string | null;
  onImageClick: (image: string) => void;
}

export default function ChatWindow({
  messages,
  isLoading,
  activeModalImage,
  onImageClick,
}: ChatWindowProps) {
  return (
    <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-slate-700">Conversation</h2>
        <span className="text-[11px] text-slate-400">{messages.length} messages</span>
      </div>

      <div className="space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-400">No messages yet.</p>
        ) : (
          messages.slice(-3).map((message, index) => (
            <div key={index} className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {message.role}
              </div>
              <div className="whitespace-pre-wrap break-words leading-6">{message.content}</div>
            </div>
          ))
        )}
      </div>

      {isLoading && <p className="mt-4 text-xs font-semibold text-slate-400">Generating response...</p>}
      {activeModalImage && (
        <button type="button" onClick={() => onImageClick(activeModalImage)} className="mt-4 text-xs font-semibold text-indigo-600">
          Reopen current image preview
        </button>
      )}
    </div>
  );
}
