import { DocumentFile, Message } from '../types';

interface SessionData {
  id: string;
  userId: string;
  documents: DocumentFile[];
  messages: Message[];
  timestamp: number;
  name: string;
}

class StorageService {
  private dbName = 'gemini-rag-navigator';
  private storeName = 'sessions';
  private db: IDBDatabase | null = null;
  
  private getCurrentUserId(): string {
    const userId = localStorage.getItem('currentUserId');
    console.log('[StorageService] localStorage.currentUserId:', userId);
    if (!userId) {
      console.warn('[StorageService] ⚠️  No currentUserId in localStorage! Using default.');
    }
    const finalUserId = userId || 'default';
    console.log('[StorageService] Final userId:', finalUserId);
    return finalUserId;
  }

  /**
   * Initialize IndexedDB connection
   */
  async init(): Promise<void> {
    // If already initialized, return immediately
    if (this.db) {
      console.log('[StorageService.init] Already initialized, returning');
      return;
    }

    return new Promise((resolve, reject) => {
      console.log('[StorageService.init] Opening database:', this.dbName, 'version 4');
      
      let timeoutId: ReturnType<typeof setTimeout>;
      const cleanup = () => clearTimeout(timeoutId);

      const request = indexedDB.open(this.dbName, 4);

      // Set a timeout to detect hanging
      timeoutId = setTimeout(() => {
        console.error('[StorageService.init] ❌ TIMEOUT: Database init took too long');
        reject(new Error('Database initialization timeout'));
      }, 5000);

      request.onerror = () => {
        cleanup();
        console.error('[StorageService.init] ❌ IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onblocked = () => {
        console.warn('[StorageService.init] ⚠️  Database open blocked');
      };

      request.onsuccess = () => {
        cleanup();
        console.log('[StorageService.init] ✅ Database opened successfully');
        this.db = request.result;
        console.log('[StorageService.init] Object stores available:', Array.from(this.db.objectStoreNames));
        resolve();
      };

      request.onupgradeneeded = (event) => {
        console.log('[StorageService.init] 🔄 onupgradeneeded fired (old version -> version 4)');
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create or ensure sessions object store exists
        if (!db.objectStoreNames.contains(this.storeName)) {
          console.log('[StorageService.init] 📝 Creating new object store:', this.storeName);
          try {
            const objectStore = db.createObjectStore(this.storeName, { keyPath: 'id' });
            objectStore.createIndex('timestamp', 'timestamp', { unique: false });
            objectStore.createIndex('userId', 'userId', { unique: false });
            console.log('[StorageService.init] ✅ Created sessions object store with indexes');
          } catch (e) {
            console.error('[StorageService.init] ❌ Error creating object store:', e);
          }
        } else {
          console.log('[StorageService.init] ℹ️  Sessions object store already exists');
        }
      };
    });
  }

  /**
   * Save session using localStorage as fallback (simpler and more reliable)
   */
  async saveSession(documents: DocumentFile[], messages: Message[]): Promise<void> {
    const userId = this.getCurrentUserId();
    const sessionKey = `session_${userId}_current`;
    
    console.log('[StorageService] 💾 SAVING SESSION TO LOCALSTORAGE:');
    console.log('  - Session Key:', sessionKey);
    console.log('  - User ID:', userId);
    console.log('  - Documents:', documents.length);
    console.log('  - Messages:', messages.length);

    try {
      const sessionData = {
        id: sessionKey,
        userId,
        documents,
        messages,
        timestamp: Date.now(),
        name: `Session - ${new Date().toLocaleString()}`
      };

      localStorage.setItem(sessionKey, JSON.stringify(sessionData));
      console.log('[StorageService] ✅ Session saved to localStorage');
    } catch (error) {
      console.error('[StorageService] ❌ Error saving session:', error);
      throw error;
    }
  }

  /**
   * Load session from localStorage (simple and reliable fallback)
   */
  async loadSession(): Promise<SessionData | null> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      console.log('[StorageService] ❌ No user ID available');
      return null;
    }

    const sessionKey = `session_${userId}_current`;
    console.log('[StorageService] 📖 LOADING SESSION FROM LOCALSTORAGE:');
    console.log('  - Looking for Session Key:', sessionKey);
    console.log('  - User ID:', userId);

    try {
      const sessionJson = localStorage.getItem(sessionKey);
      
      if (!sessionJson) {
        console.log('[StorageService] ❌ No session found with key:', sessionKey);
        return null;
      }

      const session = JSON.parse(sessionJson) as SessionData;
      console.log('[StorageService] ✅ Session loaded from localStorage!');
      console.log('  - Documents:', session.documents.length);
      console.log('  - Messages:', session.messages.length);
      return session;
    } catch (error) {
      console.error('[StorageService] ❌ Error loading session:', error);
      return null;
    }
  }

  /**
   * Get all saved sessions for current user
   */
  async getAllSessions(): Promise<SessionData[]> {
    if (!this.db) await this.init();

    if (!this.db!.objectStoreNames.contains(this.storeName)) {
      console.log('[StorageService] Object store does not exist');
      return [];
    }

    const userId = this.getCurrentUserId();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);

      if (!objectStore.indexNames.contains('userId')) {
        console.log('[StorageService] userId index does not exist');
        resolve([]);
        return;
      }

      const index = objectStore.index('userId');
      const request = index.getAll(userId);

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

      transaction.onerror = () => reject(transaction.error);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Clear all sessions for current user (complete reset)
   */
  /**
   * Clear all sessions for current user
   */
  async clearAllSessions(): Promise<void> {
    const userId = this.getCurrentUserId();
    const sessionKey = `session_${userId}_current`;

    try {
      localStorage.removeItem(sessionKey);
      console.log('[StorageService] ✅ Session cleared from localStorage');
    } catch (error) {
      console.error('[StorageService] ❌ Error clearing session:', error);
      throw error;
    }
  }

  /**
   * Debug: List all sessions in the database
   */
  async getAllSessionsDebug(): Promise<void> {
    if (!this.db) await this.init();

    // Check if object store exists
    if (!this.db!.objectStoreNames.contains(this.storeName)) {
      console.log('=== DATABASE INFO ===');
      console.log('Available object stores:', Array.from(this.db!.objectStoreNames));
      console.log('Expected object store:', this.storeName);
      console.log('=====================');
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.getAll();

      request.onsuccess = () => {
        const allSessions = request.result as SessionData[];
        console.log('=== ALL SESSIONS IN DATABASE ===');
        console.log(`Total sessions: ${allSessions.length}`);
        allSessions.forEach(session => {
          console.log(`Session ID: ${session.id}, User: ${session.userId}, Docs: ${session.documents.length}, Messages: ${session.messages.length}`);
        });
        console.log('================================');
        resolve();
      };

      request.onerror = () => {
        console.error('Error reading all sessions:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Verify database structure is intact
   */
  async validateDatabase(): Promise<boolean> {
    try {
      console.log('[StorageService.validateDatabase] Starting validation...');
      if (!this.db) {
        console.log('[StorageService.validateDatabase] DB not initialized, calling init()');
        await this.init();
      }

      // Check if object store exists
      if (!this.db!.objectStoreNames.contains(this.storeName)) {
        console.log('[StorageService.validateDatabase] ❌ Object store missing - database corrupted');
        return false;
      }

      console.log('[StorageService.validateDatabase] ✅ Object store exists');

      // Try to open a test transaction
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      
      // Check if required indexes exist
      const hasUserIdIndex = objectStore.indexNames.contains('userId');
      const hasTimestampIndex = objectStore.indexNames.contains('timestamp');

      console.log('[StorageService.validateDatabase] 📊 Validation result:', {
        objectStoreExists: true,
        hasUserIdIndex,
        hasTimestampIndex
      });

      const isValid = hasUserIdIndex && hasTimestampIndex;
      console.log('[StorageService.validateDatabase]', isValid ? '✅ Valid' : '❌ Invalid');
      return isValid;
    } catch (error) {
      console.error('[StorageService.validateDatabase] ❌ Validation error:', error);
      return false;
    }
  }

  /**
   * Reset the entire database (deletes and recreates)
   */
  async resetDatabase(): Promise<void> {
    console.log('[StorageService] Resetting database...');
    
    // Close current connection
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    // Delete the database
    const deleteRequest = indexedDB.deleteDatabase(this.dbName);

    return new Promise((resolve, reject) => {
      deleteRequest.onsuccess = () => {
        console.log('[StorageService] Database deleted successfully');
        // Re-initialize with fresh database
        this.init().then(() => {
          console.log('[StorageService] Database reinitialized');
          resolve();
        }).catch(reject);
      };

      deleteRequest.onerror = () => {
        console.error('[StorageService] Error deleting database:', deleteRequest.error);
        reject(deleteRequest.error);
      };

      deleteRequest.onblocked = () => {
        console.warn('[StorageService] Database deletion blocked by open connections');
      };
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
