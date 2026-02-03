import React, { useState } from 'react';
import { DocumentFile } from '../types';
import { SearchService, SearchResult, DocumentTag } from '../utils/searchService';
import { Lang, translations } from '../utils/i18n';

interface SearchBarProps {
  documents: DocumentFile[];
  lang: Lang;
  onSearch: (results: SearchResult[]) => void;
  onTagSelect: (tagName: string | null) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ documents, lang, onSearch, onTagSelect }) => {
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<DocumentTag[]>(SearchService.getAllTags());
  const [showTagPanel, setShowTagPanel] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    if (searchQuery.trim()) {
      const results = SearchService.searchDocuments(documents, searchQuery, selectedTags);
      setSearchResults(results);
      onSearch(results);
    } else {
      setSearchResults([]);
      onSearch([]);
    }
  };

  const toggleTag = (tagName: string) => {
    const updated = selectedTags.includes(tagName)
      ? selectedTags.filter(t => t !== tagName)
      : [...selectedTags, tagName];
    setSelectedTags(updated);
    
    if (query.trim()) {
      const results = SearchService.searchDocuments(documents, query, updated);
      setSearchResults(results);
      onSearch(results);
    }
  };

  const addNewTag = (docId: string) => {
    if (!newTagName.trim()) return;
    
    const tag = SearchService.createTag(newTagName);
    SearchService.tagDocument(docId, tag);
    setAllTags(SearchService.getAllTags());
    setNewTagName('');
  };

  return (
    <div className="w-full space-y-3">
      {/* Main Search Container */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg overflow-hidden shadow-lg">
        {/* Search Input Header */}
        <div className="p-4 border-b border-slate-700/30 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="🔍 Search documents..."
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
            <button
              onClick={() => setShowTagPanel(!showTagPanel)}
              className="px-4 py-2 bg-blue-600/80 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1"
            >
              {showTagPanel ? '✕' : '⚙️'} {showTagPanel ? 'Close' : 'Tags'}
            </button>
          </div>

          {/* Tag Filter Buttons */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.name)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                    selectedTags.includes(tag.name)
                      ? 'shadow-md'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: selectedTags.includes(tag.name) ? tag.color : 'transparent',
                    border: `1.5px solid ${tag.color}`,
                    color: selectedTags.includes(tag.name) ? 'white' : tag.color,
                  }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tag Management Panel */}
        {showTagPanel && (
          <div className="p-4 bg-slate-900/40 border-t border-slate-700/30 space-y-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Create New Tag
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter tag name..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && documents.length > 0) {
                      addNewTag(documents[0].id);
                    }
                  }}
                  className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  onClick={() => {
                    if (documents.length > 0) {
                      addNewTag(documents[0].id);
                    }
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            {allTags.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Available Tags ({allTags.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <span
                      key={tag.id}
                      className="px-3 py-1 rounded-full text-xs"
                      style={{
                        backgroundColor: `${tag.color}20`,
                        border: `1px solid ${tag.color}`,
                        color: tag.color,
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search Statistics Footer */}
        {query && (
          <div className="px-4 py-3 bg-slate-900/20 border-t border-slate-700/30">
            <p className="text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Search Term:</span> "{query}"
              {selectedTags.length > 0 && (
                <span className="ml-2">
                  <span className="font-semibold text-slate-300">Tags:</span> {selectedTags.join(', ')}
                </span>
              )}
              {searchResults.length > 0 && (
                <span className="ml-2 text-blue-400">
                  <span className="font-semibold">Results:</span> {searchResults.length}
                </span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
