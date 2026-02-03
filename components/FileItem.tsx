
import React from 'react';
import { DocumentFile } from '../types';
import { formatFileSize } from '../utils/fileProcessor';

interface FileItemProps {
  doc: DocumentFile;
  onRemove: (id: string) => void;
  onSummarize: (doc: DocumentFile) => void;
  isProcessing: boolean;
}

const FileItem: React.FC<FileItemProps> = ({ doc, onRemove, onSummarize, isProcessing }) => {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700 rounded-lg group hover:border-blue-500/50 transition-colors">
      <div className="flex items-center space-x-3 overflow-hidden">
        <div className="bg-blue-500/10 p-2 rounded text-blue-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="overflow-hidden">
          <p className="text-sm font-medium text-slate-200 truncate">{doc.name}</p>
          <p className="text-xs text-slate-400">{formatFileSize(doc.size)}</p>
        </div>
      </div>
      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onSummarize(doc)}
          disabled={isProcessing}
          title="Summarize document"
          className="text-slate-500 hover:text-blue-400 p-1 disabled:opacity-50 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </button>
        <button
          onClick={() => onRemove(doc.id)}
          title="Remove document"
          className="text-slate-500 hover:text-red-400 p-1 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default FileItem;
