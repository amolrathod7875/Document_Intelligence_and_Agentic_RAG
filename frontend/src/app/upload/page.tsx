'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/services/api';
import { UploadStatusMap } from '@/types';

export default function BulkUploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [statuses, setStatuses] = useState<UploadStatusMap>({});
  const [isUploading, setIsUploading] = useState(false);

  // Set up polling to track file status updates
  useEffect(() => {
    const hasActiveTasks = Object.values(statuses).some(
      (f) => f.status !== 'indexed' && f.status !== 'failed'
    );

    if (!hasActiveTasks) return;

    const interval = setInterval(async () => {
      try {
        const liveStatus = await api.getUploadStatus();
        setStatuses(liveStatus);
      } catch (err) {
        console.error('Polling error', err);
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [statuses]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files));
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      await api.uploadFiles(files);
      // Optimistically trigger immediate status polling tracker layout updates
      const initialStatus = await api.getUploadStatus();
      setStatuses(initialStatus);
      setFiles([]);
    } catch (err) {
      alert('Failed to initialize bulk file ingestion.');
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'indexed': return 'bg-green-100 text-green-800 border-green-300';
      case 'failed': return 'bg-red-100 text-red-800 border-red-300';
      case 'parsing': return 'bg-blue-100 text-blue-800 border-blue-300 animate-pulse';
      case 'classifying': return 'bg-purple-100 text-purple-800 border-purple-300 animate-pulse';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 min-h-screen content-center">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Knowledge Base Bulk Ingestion</h1>
        <Link href="/" className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm transition shadow-sm border border-slate-300">
          Back to Agent Chat
        </Link>
      </div>

      <form onSubmit={handleUploadSubmit} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-indigo-500 transition cursor-pointer bg-slate-50 relative">
          <input type="file" multiple onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          <p className="text-slate-600 font-medium">Drag & drop files here, or click to browse local files</p>
          <p className="text-xs text-slate-400 mt-1">Supports PDF, PNG, JPG, JPEG, TXT up to 15MB</p>
        </div>

        {files.length > 0 && (
          <div className="mt-4 bg-slate-50 rounded-lg p-3 border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Staged Files ({files.length}):</h3>
            <ul className="text-xs text-slate-500 list-disc list-inside">
              {files.map((f, i) => <li key={i}>{f.name} - {(f.size / 1024 / 1024).toFixed(2)} MB</li>)}
            </ul>
          </div>
        )}

        <button type="submit" disabled={isUploading || files.length === 0} className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-lg transition shadow-md">
          {isUploading ? 'Streaming Files...' : 'Submit to Processing Pipeline'}
        </button>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Pipeline Processing Monitoring Workspace</h2>
        {Object.keys(statuses).length === 0 ? (
          <p className="text-sm text-slate-400 italic">No files ingested into this environment workspace yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-sm font-semibold text-slate-600 bg-slate-50">
                  <th className="p-3">File Target Name</th>
                  <th className="p-3">Stage Track</th>
                  <th className="p-3">Classification Typology</th>
                  <th className="p-3">Security Level</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {Object.entries(statuses).map(([name, item]) => (
                  <tr key={name} className="hover:bg-slate-50/70 transition">
                    <td className="p-3 font-medium text-slate-800 truncate max-w-xs">{name}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 text-xs font-bold border rounded-full ${getStatusBadgeColor(item.status)}`}>
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 font-mono text-xs">{item.document_type || 'Evaluating...'}</td>
                    <td className="p-3 text-slate-500 text-xs font-semibold">{item.sensitivity_level || 'Evaluating...'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}