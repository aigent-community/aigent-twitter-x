import { Message } from '../types/message';
import { AIProvider } from '../types/ai-provider';
import { ConversationConfig } from '../types/conversation-config';

interface OpenAIModel {
    id: string;
    context_window: number;
}

export class OpenAIAPI implements AIProvider {
    private apiKey: string;
    private model: string;
    private static modelLimits: Map<string, number> = new Map();

    constructor(apiKey: string, model: string = 'gpt-4-turbo-preview') {
        this.apiKey = apiKey;
        this.model = model;
    }

    async getModelLimit(): Promise<number> {
        if (OpenAIAPI.modelLimits.has(this.model)) {
            return OpenAIAPI.modelLimits.get(this.model)!;
        }

        try {
            const response = await fetch('https://api.openai.com/v1/models', {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch models: ${response.statusText}`);
            }

            const data = await response.json();
            const modelData = data.data.find((m: OpenAIModel) => m.id === this.model);
            
            if (!modelData) {
                // Default fallback values if model not found
                const fallbackLimits: { [key: string]: number } = {
                    'gpt-4-turbo-preview': 128000,
                    'gpt-4': 8192,
                    'gpt-3.5-turbo': 4096
                };
                return fallbackLimits[this.model] || 4096;
            }

            OpenAIAPI.modelLimits.set(this.model, modelData.context_window);
            return modelData.context_window;
        } catch (error) {
            console.error('Error fetching model limits:', error);
            // Return conservative default if API call fails
            return 4096;
        }
    }

    async sendMessage(messages: Message[], systemPrompt: string, maxTokens: number): Promise<string> {
        const apiUrl = 'https://api.openai.com/v1/chat/completions';
        
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
        };

        const formattedMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.slice(1).map(({ role, content }) => ({
                role: role === 'user' ? 'user' : 'assistant',
                content
            }))
        ];

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: this.model,
                messages: formattedMessages,
                max_tokens: maxTokens
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        if (!data.choices?.[0]?.message?.content) {
            throw new Error('Unexpected API response format');
        }

        return data.choices[0].message.content;
    }

    optimizeContext(messages: Message[], config: ConversationConfig): Message[] {
        const currentTime = Date.now();
        const maxAge = config.maxMessageAge * 60 * 1000;

        // First, filter by age
        let optimizedMessages = messages.filter((msg, index) => {
            if (index === 0) return true; // Always keep system message
            if (!msg.timestamp) return false;
            return (currentTime - msg.timestamp) <= maxAge;
        });

        // Then, limit by message count
        if (optimizedMessages.length > config.maxMessages) {
            const systemMessage = optimizedMessages[0];
            const recentMessages = optimizedMessages.slice(-(config.maxMessages - 1));
            optimizedMessages = [systemMessage, ...recentMessages];
        }

        // Finally, limit by token count (GPT-4 has a 128k context window)
        while (this.calculateTotalTokens(optimizedMessages) > (config.maxTokens - config.reservedTokens)) {
            if (optimizedMessages.length <= 2) break; // Keep at least system message and one user message
            optimizedMessages.splice(1, 1); // Remove the oldest non-system message
        }

        return optimizedMessages;
    }

    calculateTotalTokens(messages: Message[]): number {
        // Calculate tokens for messages array structure (3 tokens per message)
        const messageStructureTokens = messages.length * 3;
        
        // Calculate tokens for message content
        const contentTokens = messages.reduce((sum, msg) => {
            // If token count is already calculated, use it
            if (msg.tokenCount !== undefined) return sum + msg.tokenCount;
            
            // Otherwise estimate based on content
            const roleTokens = msg.role.length;  // Count tokens for role
            const contentTokens = this.estimateTokenCount(msg.content);
            return sum + roleTokens + contentTokens;
        }, 0);

        return messageStructureTokens + contentTokens;
    }

    estimateTokenCount(text: string): number {
        if (!text) return 0;
        // More accurate token estimation for GPT models
        // Average of 4 characters per token for English text
        // Add extra tokens for spaces and punctuation
        const words = text.trim().split(/\s+/);
        const spaceTokens = words.length - 1;
        const characterTokens = Math.ceil(text.length / 4);
        return characterTokens + spaceTokens;
    }

    async getContextStats(messages: Message[], config: ConversationConfig) {
        const totalTokens = this.calculateTotalTokens(messages);
        const modelLimit = await this.getModelLimit();
        return {
            totalTokens,
            remainingTokenCapacity: Math.max(0, modelLimit - config.reservedTokens - totalTokens)
        };
    }
} 