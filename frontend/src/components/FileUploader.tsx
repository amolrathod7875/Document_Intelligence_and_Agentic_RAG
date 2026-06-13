import React from 'react';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  isUploading: boolean;
  selectedFiles: File[];
}

export default function FileUploader({
  onFilesSelected,
  isUploading,
  selectedFiles,
}: FileUploaderProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesSelected(Array.from(e.target.files));
    }
  };

  return (
    <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
      <input
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
        id="file-input"
      />
      <label htmlFor="file-input" className="cursor-pointer">
        Drag & drop files here, or click to browse
      </label>
    </div>
  );
}
