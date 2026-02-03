
import React, { useRef, useState } from 'react';
import { translations, Lang, detectLanguage, translateToEnglish } from '../utils/i18n';
import { DocumentFile } from '../types';
import { readFileAsText, readPDFAsText, readImageAsText, generateId } from '../utils/fileProcessor';
import { SearchService, SearchResult } from '../utils/searchService';
import FileItem from './FileItem';
import SearchBar from './SearchBar';
import SearchResults from './SearchResults';

interface SidebarProps {
  documents: DocumentFile[];
  onDocumentsChange: (docs: DocumentFile[]) => void;
  onSummarize: (docs: DocumentFile[]) => void;
  isProcessing: boolean;
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ documents, onDocumentsChange, onSummarize, isProcessing, lang, setLang }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    setUploading(true);
    setUploadError(null);

    const newDocs: DocumentFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let text = "";
      try {
        if (file.type === "application/pdf") {
          text = await readPDFAsText(file);
        } else if (file.type.startsWith("image/")) {
          text = await readImageAsText(file);
        } else {
          text = await readFileAsText(file);
        }
        // Detect language and translate if needed
        const detectedLang = await detectLanguage(text);
        let processedText = text;
        if (detectedLang !== 'en') {
          setUploadError(`${translations[lang].languageDetected}${detectedLang}`);
          processedText = await translateToEnglish(text, detectedLang);
          setUploadError(translations[lang].translated);
        }
        newDocs.push({
          id: generateId(),
          name: file.name,
          content: processedText,
          size: file.size,
          type: file.type,
          uploadDate: Date.now()
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setUploadError(`Error reading file ${file.name}: ${errorMsg}`);
        console.error(`Error reading file ${file.name}:`, err);
      }
    }

    onDocumentsChange([...documents, ...newDocs]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeDocument = (id: string) => {
    onDocumentsChange(documents.filter(doc => doc.id !== id));
  };

  return (
    <div className="w-80 max-w-full h-full border-r border-slate-800 flex flex-col justify-between bg-slate-900/50 backdrop-blur-sm transition-transform">
      <div className="p-6 border-b border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            {translations[lang].documentHub}
          </h2>
          <select
            className="bg-slate-800 text-slate-200 text-xs rounded px-2 py-1 border border-slate-700 focus:outline-none"
            value={lang}
            onChange={e => setLang(e.target.value as Lang)}
            title="Select language"
          >
            <option value="en">EN</option>
            <option value="hi">हिंदी</option>
          </select>
        </div>
        <p className="text-sm text-slate-400 mt-1">{translations[lang].manageKnowledge}</p>
      </div>

      <div className="p-6 overflow-y-auto flex-1 space-y-4">
        {/* Search & Filter Section */}
        {documents.length > 0 && (
          <div className="space-y-2">
            <SearchBar
              documents={documents}
              lang={lang}
              onSearch={setSearchResults}
              onTagSelect={setSelectedTags}
            />
          </div>
        )}

        {/* Search Results Display */}
        {searchResults.length > 0 && (
          <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-700/50 space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              🔍 {searchResults.length} Search Result{searchResults.length !== 1 ? 's' : ''}
            </p>
            <SearchResults
              results={searchResults}
              query=""
              onResultClick={(docId) => {
                const doc = documents.find(d => d.id === docId);
                if (doc) {
                  // Could highlight or focus the document
                }
              }}
            />
          </div>
        )}

        {uploading && (
          <div className="mb-2 text-blue-400 text-xs flex items-center">
            <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path d="M2 12a10 10 0 0110-10" stroke="currentColor" strokeWidth="4" fill="none" />
            </svg>
            {translations[lang].uploading}
          </div>
        )}
        {uploadError && (
          <div className="mb-2 text-red-400 text-xs">
            {uploadError}
          </div>
        )}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {translations[lang].yourDocuments} ({documents.length})
            </label>
            {documents.length > 1 && (
              <button
                onClick={() => onSummarize(documents)}
                disabled={isProcessing}
                className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-tighter flex items-center space-x-1 disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>{translations[lang].summarizeAll}</span>
              </button>
            )}
          </div>
          
          {documents.length === 0 ? (
            <div className="border-2 border-dashed border-slate-800 rounded-xl p-8 text-center space-y-3">
              <div className="text-slate-600 flex justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-sm text-slate-500">{translations[lang].noDocuments}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map(doc => (
                <FileItem 
                  key={doc.id} 
                  doc={doc} 
                  onRemove={removeDocument} 
                  onSummarize={(d) => onSummarize([d])}
                  isProcessing={isProcessing}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-6 mt-auto">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          multiple
          className="hidden"
          accept=".txt,.md,.json,.js,.ts,.tsx,.py,.c,.cpp,.pdf,image/*"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-medium py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-900/20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>{translations[lang].addDocuments}</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
