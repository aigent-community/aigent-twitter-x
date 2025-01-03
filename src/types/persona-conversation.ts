import { Message } from "./message";
import { ConversationConfig } from "./conversation-config";
import { PersonaConfig } from "./persona-config";
import { TokenCounter } from "./token-counter";

export class PersonaConversation {
    private apiKey: string;
    private messages: Message[];
    private config: ConversationConfig;
    private totalTokens: number;

    constructor(
        apiKey: string,
        persona: PersonaConfig,
        config: ConversationConfig = {
            maxTokens: 100000,        // Maximum number of tokens in context
            maxMessageAge: 60,        // Maximum age of messages in minutes
            maxMessages: 20,          // Maximum number of messages in history
            reservedTokens: 1000      // Tokens reserved for response
        }
    ) {
        this.apiKey = apiKey;
        this.config = config;
        this.totalTokens = 0;

        const systemPrompt = this.generateSystemPrompt(persona);
        this.messages = [{
            role: 'system',
            content: systemPrompt,
            timestamp: Date.now(),
            tokenCount: TokenCounter.estimateTokenCount(systemPrompt)
        }];

        this.totalTokens = this.messages[0].tokenCount || 0;
    }

    private generateSystemPrompt(persona: PersonaConfig): string {
        return `You are ${persona.name}. Your task is to respond to questions in the style of this person.
    
                EXAMPLE TWEETS:
                ${persona.tweetExamples.map(tweet => `"${tweet}"`).join('\n')}
                
                CHARACTERISTIC TRAITS:
                ${persona.characteristics.join('\n')}
                
                MAIN TOPICS:
                ${persona.topics.join('\n')}
                
                RULES:
                1. Always respond in first person
                2. Use characteristic phrases from example tweets
                3. Maintain consistency with given personality traits
                4. Refer to topics that are typical for this person`;
    }

    private optimizeContext() {
        const currentTime = Date.now();
        const maxAge = this.config.maxMessageAge * 60 * 1000;

        this.messages = this.messages.filter((msg, index) => {
            if (index === 0) return true;
            if (!msg.timestamp) return false;
            return (currentTime - msg.timestamp) <= maxAge;
        });

        if (this.messages.length > this.config.maxMessages) {
            const systemMessage = this.messages[0];
            const recentMessages = this.messages.slice(-(this.config.maxMessages - 1));
            this.messages = [systemMessage, ...recentMessages];
        }

        while (this.calculateTotalTokens() > (this.config.maxTokens - this.config.reservedTokens)) {
            if (this.messages.length <= 2) break;
            this.messages.splice(1, 1);
        }

        this.totalTokens = this.calculateTotalTokens();
    }

    private calculateTotalTokens(): number {
        return this.messages.reduce((sum, msg) => sum + (msg.tokenCount || 0), 0);
    }

    async sendMessage(message: string): Promise<string> {
        const tokenCount = TokenCounter.estimateTokenCount(message);

        this.messages.push({
            role: 'user',
            content: message,
            timestamp: Date.now(),
            tokenCount
        });

        this.optimizeContext();

        try {
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
                    max_tokens: this.config.reservedTokens,
                    system: this.messages[0].content,
                    messages: this.messages.slice(1).map(({ role, content }) => ({
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
            const assistantResponse = data.content[0].text;

            this.messages.push({
                role: 'assistant',
                content: assistantResponse,
                timestamp: Date.now(),
                tokenCount: TokenCounter.estimateTokenCount(assistantResponse)
            });

            this.optimizeContext();

            return assistantResponse;
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }

    getContextStats() {
        return {
            messageCount: this.messages.length,
            totalTokens: this.totalTokens,
            oldestMessageAge: this.messages.length > 1 ?
                Math.floor((Date.now() - (this.messages[1].timestamp || 0)) / (60 * 1000)) :
                0,
            remainingTokenCapacity: this.config.maxTokens - this.totalTokens
        };
    }

    clearHistory() {
        const systemMessage = this.messages[0];
        this.messages = [systemMessage];
        this.totalTokens = systemMessage.tokenCount || 0;
    }
}