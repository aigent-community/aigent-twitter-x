export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: number;
  tokenCount?: number;
}