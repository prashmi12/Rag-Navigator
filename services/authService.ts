import { DocumentFile, Message } from '../types';

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: number;
}

export interface UserSession {
  user: User;
  documents: DocumentFile[];
  messages: Message[];
  lastActive: number;
}

class AuthService {
  private dbName = 'gemini-rag-navigator';
  private userStoreName = 'users';
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize IndexedDB for user management
   */
  async init(): Promise<void> {
    // Return cached init promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    // Return if already initialized
    if (this.db) {
      return;
    }

    this.initPromise = new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(this.dbName, 4);

        request.onerror = () => {
          console.error('IndexedDB error:', request.error);
          this.initPromise = null;
          reject(request.error);
        };

        request.onsuccess = () => {
          this.db = request.result;
          
          // Handle database close event
          this.db.onclose = () => {
            console.warn('IndexedDB connection closed unexpectedly');
            this.db = null;
            this.initPromise = null;
          };

          this.initPromise = null;
          resolve();
        };

        request.onblocked = () => {
          console.warn('IndexedDB open blocked - close other tabs/windows using this site');
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          // Create users store if it doesn't exist
          if (!db.objectStoreNames.contains(this.userStoreName)) {
            const objectStore = db.createObjectStore(this.userStoreName, { keyPath: 'id' });
            objectStore.createIndex('username', 'username', { unique: true });
            objectStore.createIndex('email', 'email', { unique: true });
          }
        };
      } catch (error) {
        this.initPromise = null;
        reject(error);
      }
    });

    return this.initPromise;
  }

  /**
   * Ensure database is ready for transaction with retry logic
   */
  private async ensureDb(): Promise<IDBDatabase> {
    await this.init();
    if (!this.db) {
      // Reset and reinitialize if DB is not available
      this.db = null;
      this.initPromise = null;
      await this.init();
    }
    if (!this.db) {
      throw new Error('Failed to initialize database');
    }
    return this.db;
  }

  /**
   * Register a new user
   */
  async register(username: string, email: string, password: string): Promise<User> {
    // Validate input
    if (!username || !email || !password) {
      throw new Error('All fields are required');
    }

    if (username.length < 3) {
      throw new Error('Username must be at least 3 characters');
    }

    if (!email.includes('@')) {
      throw new Error('Invalid email format');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Check if user already exists
    const existingUser = await this.getUserByUsername(username);
    if (existingUser) {
      throw new Error('Username already exists');
    }

    const existingEmail = await this.getUserByEmail(email);
    if (existingEmail) {
      throw new Error('Email already exists');
    }

    // Create new user
    const user: User = {
      id: this.generateUserId(),
      username,
      email,
      createdAt: Date.now()
    };

    // Store user with hashed password
    const userWithPassword = {
      ...user,
      passwordHash: await this.hashPassword(password)
    };

    return this.executeTransaction(async (db) => {
      return new Promise((resolve, reject) => {
        try {
          const transaction = db.transaction([this.userStoreName], 'readwrite');
          const objectStore = transaction.objectStore(this.userStoreName);
          const request = objectStore.add(userWithPassword);

          request.onerror = () => {
            console.error('Add user request error:', request.error);
            reject(new Error(`Failed to register user: ${request.error}`));
          };

          request.onsuccess = () => {
            resolve(user);
          };

          transaction.onerror = () => {
            console.error('Transaction error:', transaction.error);
            reject(new Error(`Transaction failed: ${transaction.error}`));
          };

          transaction.onabort = () => {
            console.warn('Transaction aborted');
            reject(new Error('Registration transaction was aborted'));
          };
        } catch (error) {
          console.error('Error creating transaction:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Login user with credentials
   */
  async login(username: string, password: string): Promise<User> {
    if (!this.db) await this.init();

    const user = await this.getUserByUsername(username);
    if (!user) {
      throw new Error('User not found');
    }

    const isPasswordValid = await this.verifyPassword(password, (user as any).passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }

    // Set current user in localStorage
    localStorage.setItem('currentUserId', user.id);
    localStorage.setItem('currentUsername', user.username);

    return user;
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('currentUsername');
  }

  /**
   * Get current logged-in user
   */
  getCurrentUser(): User | null {
    const userId = localStorage.getItem('currentUserId');
    const username = localStorage.getItem('currentUsername');

    if (!userId || !username) {
      return null;
    }

    return {
      id: userId,
      username,
      email: '', // Email not needed for session
      createdAt: 0
    };
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    return !!localStorage.getItem('currentUserId');
  }

  /**
   * Get user by username
   */
  private async getUserByUsername(username: string): Promise<User | null> {
    return this.executeTransaction(async (db) => {
      return new Promise((resolve, reject) => {
        try {
          const transaction = db.transaction([this.userStoreName], 'readonly');
          const objectStore = transaction.objectStore(this.userStoreName);
          const index = objectStore.index('username');
          const request = index.get(username);

          request.onerror = () => {
            console.error('Get user by username error:', request.error);
            reject(new Error(`Failed to get user: ${request.error}`));
          };

          request.onsuccess = () => {
            const result = request.result as User | undefined;
            resolve(result || null);
          };

          transaction.onerror = () => {
            console.error('Get username transaction error:', transaction.error);
            reject(new Error(`Transaction failed: ${transaction.error}`));
          };
        } catch (error) {
          console.error('Error in getUserByUsername:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Get user by email
   */
  private async getUserByEmail(email: string): Promise<User | null> {
    return this.executeTransaction(async (db) => {
      return new Promise((resolve, reject) => {
        try {
          const transaction = db.transaction([this.userStoreName], 'readonly');
          const objectStore = transaction.objectStore(this.userStoreName);
          const index = objectStore.index('email');
          const request = index.get(email);

          request.onerror = () => {
            console.error('Get user by email error:', request.error);
            reject(new Error(`Failed to get user: ${request.error}`));
          };

          request.onsuccess = () => {
            const result = request.result as User | undefined;
            resolve(result || null);
          };

          transaction.onerror = () => {
            console.error('Get email transaction error:', transaction.error);
            reject(new Error(`Transaction failed: ${transaction.error}`));
          };
        } catch (error) {
          console.error('Error in getUserByEmail:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Safe wrapper for database transactions with error handling
   */
  private async executeTransaction<T>(
    callback: (db: IDBDatabase) => Promise<T>
  ): Promise<T> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const db = await this.ensureDb();
        
        // Verify DB is still valid before executing
        if (!db) {
          throw new Error('Database not available');
        }

        return await callback(db);
      } catch (error) {
        lastError = error as Error;
        console.warn(`Transaction attempt ${attempt + 1} failed:`, error);

        if (attempt < maxRetries - 1) {
          // Reset DB and retry
          this.db = null;
          this.initPromise = null;
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
        }
      }
    }

    throw new Error(`Database transaction failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Simple password hashing (for demo - use bcrypt in production)
   */
  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verify password against hash
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    const passwordHash = await this.hashPassword(password);
    return passwordHash === hash;
  }

  /**
   * Generate unique user ID
   */
  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const authService = new AuthService();
