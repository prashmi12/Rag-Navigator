import { DocumentFile } from "../types";

export interface SearchResult {
  docId: string;
  docName: string;
  matchCount: number;
  snippets: string[];
  relevanceScore: number;
}

export interface DocumentTag {
  id: string;
  name: string;
  color: string;
}

export class SearchService {
  /**
   * Full-text search across documents
   * Returns documents with keyword matches and snippet previews
   */
  static searchDocuments(
    documents: DocumentFile[],
    query: string,
    tags?: string[]
  ): SearchResult[] {
    if (!query.trim()) return [];

    const results: SearchResult[] = [];
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);

    documents.forEach((doc) => {
      // Filter by tags if provided
      const docTags = this.getDocumentTags(doc.id);
      if (tags && tags.length > 0) {
        const hasMatchingTag = tags.some(tag => docTags.some(dt => dt.name === tag));
        if (!hasMatchingTag) return;
      }

      const content = doc.content.toLowerCase();
      let matchCount = 0;
      const matchPositions: number[] = [];

      // Count and find all matches
      queryTerms.forEach((term) => {
        const regex = new RegExp(term, 'g');
        let match;
        while ((match = regex.exec(content)) !== null) {
          matchCount++;
          matchPositions.push(match.index);
        }
      });

      if (matchCount > 0) {
        // Extract snippets around matches
        const snippets = this.extractSnippets(doc.content, matchPositions, 150);
        
        // Calculate relevance score (0-100)
        const relevanceScore = Math.min(100, (matchCount / queryTerms.length) * 25);

        results.push({
          docId: doc.id,
          docName: doc.name,
          matchCount,
          snippets,
          relevanceScore
        });
      }
    });

    // Sort by relevance score
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Highlight keywords in text with HTML markup
   */
  static highlightKeywords(text: string, query: string): string {
    if (!query.trim()) return text;

    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    let highlightedText = text;

    queryTerms.forEach((term) => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(
        regex,
        '<mark style="background-color: #fbbf24; padding: 2px 4px; border-radius: 3px;">$1</mark>'
      );
    });

    return highlightedText;
  }

  /**
   * Extract snippets around match positions
   */
  private static extractSnippets(
    text: string,
    positions: number[],
    snippetLength: number
  ): string[] {
    const snippets = new Set<string>();
    const maxSnippets = 3;

    positions.slice(0, maxSnippets).forEach((pos) => {
      const start = Math.max(0, pos - snippetLength / 2);
      const end = Math.min(text.length, pos + snippetLength / 2);
      const snippet = text
        .substring(Math.max(0, start - 20), Math.min(text.length, end + 20))
        .trim();

      if (snippet.length > 0) {
        snippets.add(`...${snippet}...`);
      }
    });

    return Array.from(snippets);
  }

  /**
   * Tag a document for categorization
   */
  static tagDocument(docId: string, tag: DocumentTag): void {
    const tags = this.getDocumentTags(docId);
    if (!tags.find(t => t.id === tag.id)) {
      tags.push(tag);
      localStorage.setItem(`doc_tags_${docId}`, JSON.stringify(tags));
    }
  }

  /**
   * Remove a tag from a document
   */
  static untagDocument(docId: string, tagId: string): void {
    const tags = this.getDocumentTags(docId);
    const filtered = tags.filter(t => t.id !== tagId);
    localStorage.setItem(`doc_tags_${docId}`, JSON.stringify(filtered));
  }

  /**
   * Get all tags for a document
   */
  static getDocumentTags(docId: string): DocumentTag[] {
    const stored = localStorage.getItem(`doc_tags_${docId}`);
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Get all unique tags across all documents
   */
  static getAllTags(): DocumentTag[] {
    const tags = new Map<string, DocumentTag>();
    
    // Iterate through localStorage to find all tags
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('doc_tags_')) {
        const stored = localStorage.getItem(key);
        if (stored) {
          const docTags = JSON.parse(stored) as DocumentTag[];
          docTags.forEach(tag => {
            if (!tags.has(tag.id)) {
              tags.set(tag.id, tag);
            }
          });
        }
      }
    }

    return Array.from(tags.values());
  }

  /**
   * Create a new tag
   */
  static createTag(name: string, color: string = '#3b82f6'): DocumentTag {
    return {
      id: Math.random().toString(36).substring(2, 11),
      name,
      color
    };
  }

  /**
   * Filter documents by tag
   */
  static filterByTag(documents: DocumentFile[], tagName: string): DocumentFile[] {
    return documents.filter((doc) => {
      const tags = this.getDocumentTags(doc.id);
      return tags.some(t => t.name === tagName);
    });
  }
}
