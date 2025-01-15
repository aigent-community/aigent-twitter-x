import { Message } from './message';
import { ConversationConfig } from './conversation-config';

export type AIProviderType = 'anthropic' | 'openai';

export interface AIProviderConfig {
    type: AIProviderType;
    model: string;
}

export interface AIProvider {
    sendMessage(messages: Message[], systemPrompt: string, maxTokens: number): Promise<string>;
    optimizeContext(messages: Message[], config: ConversationConfig): Message[];
    calculateTotalTokens(messages: Message[]): number;
    getContextStats(messages: Message[], config: ConversationConfig): Promise<{ totalTokens: number; remainingTokenCapacity: number }>;
} 