import React from 'react';

interface DocumentViewerProps {
  documentPath: string;
  onClose: () => void;
}

export default function DocumentViewer({
  documentPath,
  onClose,
}: DocumentViewerProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-black text-white rounded-full w-8 h-8 flex items-center justify-center"
        >
          ✕
        </button>
        {documentPath && (
          <img
            src={documentPath}
            alt="Document"
            className="max-w-full max-h-[85vh] object-contain"
          />
        )}
      </div>
    </div>
  );
}
