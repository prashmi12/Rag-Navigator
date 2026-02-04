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

  /**
   * Initialize IndexedDB for user management
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 4);

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
        
        // Create users store if it doesn't exist
        if (!db.objectStoreNames.contains(this.userStoreName)) {
          const objectStore = db.createObjectStore(this.userStoreName, { keyPath: 'id' });
          objectStore.createIndex('username', 'username', { unique: true });
          objectStore.createIndex('email', 'email', { unique: true });
        }
      };
    });
  }

  /**
   * Register a new user
   */
  async register(username: string, email: string, password: string): Promise<User> {
    if (!this.db) await this.init();

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

    // Store user with hashed password (simple hash for demo purposes)
    const userWithPassword = {
      ...user,
      passwordHash: await this.hashPassword(password)
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.userStoreName], 'readwrite');
      const objectStore = transaction.objectStore(this.userStoreName);
      const request = objectStore.add(userWithPassword);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(user);
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
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.userStoreName], 'readonly');
      const objectStore = transaction.objectStore(this.userStoreName);
      const index = objectStore.index('username');
      const request = index.get(username);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as User | undefined;
        resolve(result || null);
      };
    });
  }

  /**
   * Get user by email
   */
  private async getUserByEmail(email: string): Promise<User | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.userStoreName], 'readonly');
      const objectStore = transaction.objectStore(this.userStoreName);
      const index = objectStore.index('email');
      const request = index.get(email);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as User | undefined;
        resolve(result || null);
      };
    });
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
