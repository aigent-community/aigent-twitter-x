import { Message } from '../types/message';
import { AIProvider } from '../types/ai-provider';
import { ConversationConfig } from '../types/conversation-config';

interface AnthropicModel {
    name: string;
    contextWindow: number;
}

export class AnthropicAPI implements AIProvider {
    private apiKey: string;
    private model: string;
    private static modelLimits: Map<string, number> = new Map();
    private static readonly MODELS: AnthropicModel[] = [
        { name: 'claude-3-opus-20240229', contextWindow: 8192 },
        { name: 'claude-3-sonnet-20240229', contextWindow: 8192 },
        { name: 'claude-2.1', contextWindow: 8192 }
    ];

    constructor(apiKey: string, model: string = 'claude-3-sonnet-20240229') {
        this.apiKey = apiKey;
        this.model = model;
    }

    async getModelLimit(model: string): Promise<number> {
        if (AnthropicAPI.modelLimits.has(model)) {
            return AnthropicAPI.modelLimits.get(model)!;
        }

        // Anthropic doesn't provide an API endpoint for model limits yet
        // Using predefined values from their documentation
        const modelData = AnthropicAPI.MODELS.find(m => m.name === model);
        if (!modelData) {
            // Conservative default if model not found
            return 8192;
        }

        AnthropicAPI.modelLimits.set(model, modelData.contextWindow);
        return modelData.contextWindow;
    }

    async sendMessage(messages: Message[], systemPrompt: string, maxTokens: number): Promise<string> {
        const isProduction = window.location.hostname !== 'localhost';
        const baseUrl = isProduction ? 'https://api.anthropic.com/v1' : '/v1';
        const apiUrl = `${baseUrl}/messages`;
        
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: maxTokens,
                system: systemPrompt,
                messages: messages.slice(1).map(({ role, content }) => ({
                    role: role === 'user' ? 'user' : 'assistant',
                    content
                }))
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        if (!data.content || !Array.isArray(data.content) || !data.content[0]?.text) {
            throw new Error('Unexpected API response format');
        }

        return data.content[0].text;
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

        // Finally, limit by token count
        while (this.calculateTotalTokens(optimizedMessages) > (config.maxTokens - config.reservedTokens)) {
            if (optimizedMessages.length <= 2) break; // Keep at least system message and one user message
            optimizedMessages.splice(1, 1); // Remove the oldest non-system message
        }

        return optimizedMessages;
    }

    calculateTotalTokens(messages: Message[]): number {
        return messages.reduce((sum, msg) => sum + (msg.tokenCount || this.estimateTokenCount(msg.content)), 0);
    }

    estimateTokenCount(text: string): number {
        // Claude-specific token estimation
        // Rough estimate: 1 token ≈ 4 characters for English text
        return Math.ceil(text.length / 4);
    }

    async getContextStats(messages: Message[], config: ConversationConfig) {
        const totalTokens = this.calculateTotalTokens(messages);
        const modelLimit = await this.getModelLimit(this.model);
        return {
            totalTokens,
            remainingTokenCapacity: Math.max(0, modelLimit - config.reservedTokens - totalTokens)
        };
    }
}
