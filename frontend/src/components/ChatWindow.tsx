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
      {/* Chat messages rendered here */}
    </div>
  );
}
