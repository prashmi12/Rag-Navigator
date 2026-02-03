import { DocumentFile, Message } from '../types';

interface SessionData {
  id: string;
  documents: DocumentFile[];
  messages: Message[];
  timestamp: number;
  name: string;
}

class StorageService {
  private dbName = 'gemini-rag-navigator';
  private storeName = 'sessions';
  private db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB connection
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, { keyPath: 'id' });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Save current session (documents + messages)
   */
  async saveSession(documents: DocumentFile[], messages: Message[]): Promise<void> {
    if (!this.db) await this.init();

    const sessionId = 'current-session';
    const sessionData: SessionData = {
      id: sessionId,
      documents,
      messages,
      timestamp: Date.now(),
      name: `Session - ${new Date().toLocaleString()}`
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.put(sessionData);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Load the most recent session
   */
  async loadSession(): Promise<SessionData | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.get('current-session');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as SessionData | undefined;
        resolve(result || null);
      };
    });
  }

  /**
   * Get all saved sessions
   */
  async getAllSessions(): Promise<SessionData[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const index = objectStore.index('timestamp');
      const request = index.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const sessions = request.result as SessionData[];
        // Sort by timestamp descending (newest first)
        resolve(sessions.sort((a, b) => b.timestamp - a.timestamp));
      };
    });
  }

  /**
   * Delete a specific session
   */
  async deleteSession(sessionId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.delete(sessionId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Clear all sessions (complete reset)
   */
  async clearAllSessions(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Get session storage statistics
   */
  async getStorageStats(): Promise<{
    totalSessions: number;
    totalDocuments: number;
    totalMessages: number;
    lastSavedAt: string;
  }> {
    const sessions = await this.getAllSessions();

    let totalDocuments = 0;
    let totalMessages = 0;

    sessions.forEach(session => {
      totalDocuments += session.documents.length;
      totalMessages += session.messages.length;
    });

    const lastSession = sessions[0];
    const lastSavedAt = lastSession
      ? new Date(lastSession.timestamp).toLocaleString()
      : 'Never';

    return {
      totalSessions: sessions.length,
      totalDocuments,
      totalMessages,
      lastSavedAt
    };
  }
}

// Export singleton instance
export const storageService = new StorageService();
