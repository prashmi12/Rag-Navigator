
export interface DocumentFile {
  id: string;
  name: string;
  content: string;
  size: number;
  type: string;
  uploadDate: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  sources?: string[];
}

export enum AppState {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  CHATTING = 'CHATTING',
  ERROR = 'ERROR'
}
