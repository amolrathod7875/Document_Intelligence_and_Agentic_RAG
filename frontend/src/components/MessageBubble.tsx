import React from 'react';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  citations?: any[];
}

export default function MessageBubble({
  role,
  content,
  citations,
}: MessageBubbleProps) {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          role === 'user'
            ? 'bg-indigo-600 text-white rounded-br-none'
            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{content}</p>
        {citations && citations.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {citations.map((cite, idx) => (
              <span key={idx} className="text-xs bg-slate-100 px-2 py-1 rounded">
                {cite.document_name} - Page {cite.page_number}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
