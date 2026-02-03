import React from 'react';
import { SearchService, SearchResult } from '../utils/searchService';

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  onResultClick?: (docId: string) => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({ results, query, onResultClick }) => {
  if (results.length === 0) {
    return (
      <div className="text-center py-6 text-slate-500">
        <p className="text-xs">No results found. Try different keywords.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
      {results.map((result) => (
        <div
          key={result.docId}
          onClick={() => onResultClick?.(result.docId)}
          className="bg-slate-700/40 border border-slate-600 hover:border-blue-500/50 rounded-lg p-3 cursor-pointer transition-all hover:bg-slate-700/60 group"
        >
          {/* Document Name & Match Count */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <h4 className="text-sm font-semibold text-slate-200 truncate group-hover:text-blue-300 transition-colors">
              {result.docName}
            </h4>
            <span className="bg-blue-600/30 text-blue-200 text-xs px-2 py-1 rounded-full font-semibold whitespace-nowrap">
              {result.matchCount}
            </span>
          </div>

          {/* Relevance Score Bar */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-1.5 bg-slate-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
                style={{ width: `${result.relevanceScore}%` }}
              />
            </div>
            <span className="text-xs text-slate-400 font-medium">{Math.round(result.relevanceScore)}%</span>
          </div>

          {/* Snippets */}
          {result.snippets.length > 0 && (
            <div className="space-y-1">
              {result.snippets.slice(0, 2).map((snippet, idx) => (
                <p
                  key={idx}
                  className="text-xs text-slate-400 line-clamp-2 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: SearchService.highlightKeywords(snippet, query),
                  }}
                />
              ))}
            </div>
          )}

          {/* More Matches Indicator */}
          {result.snippets.length > 2 && (
            <p className="text-xs text-slate-500 mt-2 font-medium">
              +{result.snippets.length - 2} more matches
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default SearchResults;
