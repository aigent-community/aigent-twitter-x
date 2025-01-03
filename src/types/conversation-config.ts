export interface ConversationConfig {
  maxTokens: number;
  maxMessageAge: number; // in minutes
  maxMessages: number;
  reservedTokens: number; // tokens reserved for the response
}