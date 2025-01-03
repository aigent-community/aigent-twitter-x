import { Message } from '../types/message';
import { AIProvider } from '../types/ai-provider';
import { ConversationConfig } from '../types/conversation-config';

export class OpenAIAPI implements AIProvider {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
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
                model: 'gpt-4-turbo-preview',
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
        return messages.reduce((sum, msg) => sum + (msg.tokenCount || this.estimateTokenCount(msg.content)), 0);
    }

    estimateTokenCount(text: string): number {
        // GPT-4 specific token estimation
        // Rough estimate: 1 token ≈ 4 characters for English text
        // Note: This is a simplified estimation. For production, consider using tiktoken
        return Math.ceil(text.length / 4);
    }
} 