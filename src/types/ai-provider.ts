import { Message } from './message';
import { ConversationConfig } from './conversation-config';

export interface AIProvider {
    sendMessage(messages: Message[], systemPrompt: string, maxTokens: number): Promise<string>;
    optimizeContext(messages: Message[], config: ConversationConfig): Message[];
    calculateTotalTokens(messages: Message[]): number;
    estimateTokenCount(text: string): number;
} 