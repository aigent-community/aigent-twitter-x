import { Message } from "./message";
import { ConversationConfig } from "./conversation-config";
import { PersonaConfig } from "./persona-config";
import { AIProvider } from "./ai-provider";

export class PersonaConversation {
    private aiProvider: AIProvider;
    private messages: Message[];
    private config: ConversationConfig;
    private totalTokens: number;
    private personaId: string;

    constructor(
        aiProvider: AIProvider,
        persona: PersonaConfig,
        config: ConversationConfig = {
            maxTokens: 100000,
            maxMessageAge: 60,
            maxMessages: 20,
            reservedTokens: 1000
        }
    ) {
        this.aiProvider = aiProvider;
        this.config = config;
        this.totalTokens = 0;
        this.personaId = persona.twitterUsername;

        // Try to load existing conversation from localStorage
        const savedState = this.loadState();
        if (savedState) {
            this.messages = savedState.messages;
            this.totalTokens = this.aiProvider.calculateTotalTokens(this.messages);
        } else {
            const systemPrompt = this.generateSystemPrompt(persona);
            this.messages = [{
                role: 'system',
                content: systemPrompt,
                timestamp: Date.now(),
                tokenCount: this.aiProvider.estimateTokenCount(systemPrompt)
            }];
            this.totalTokens = this.messages[0].tokenCount || 0;
            this.saveState();
        }
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

    private getStorageKey(): string {
        return `chat_history_${this.personaId}`;
    }

    private saveState(): void {
        const state = {
            messages: this.messages,
            timestamp: Date.now()
        };
        localStorage.setItem(this.getStorageKey(), JSON.stringify(state));
    }

    private loadState(): { messages: Message[] } | null {
        const stored = localStorage.getItem(this.getStorageKey());
        if (!stored) return null;

        try {
            const state = JSON.parse(stored);
            // Convert stored timestamps back to numbers if they were stringified
            state.messages = state.messages.map((msg: Message) => ({
                ...msg,
                timestamp: msg.timestamp ? Number(msg.timestamp) : undefined
            }));
            return state;
        } catch (error) {
            console.error('Error loading chat history:', error);
            return null;
        }
    }

    private optimizeContext() {
        this.messages = this.aiProvider.optimizeContext(this.messages, this.config);
        this.totalTokens = this.aiProvider.calculateTotalTokens(this.messages);
        this.saveState();
    }

    async sendMessage(message: string): Promise<string> {
        const tokenCount = this.aiProvider.estimateTokenCount(message);

        this.messages.push({
            role: 'user',
            content: message,
            timestamp: Date.now(),
            tokenCount
        });

        this.optimizeContext();

        try {
            const assistantResponse = await this.aiProvider.sendMessage(
                this.messages,
                this.messages[0].content,
                this.config.reservedTokens
            );

            this.messages.push({
                role: 'assistant',
                content: assistantResponse,
                timestamp: Date.now(),
                tokenCount: this.aiProvider.estimateTokenCount(assistantResponse)
            });

            this.optimizeContext();
            this.saveState();

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

    getMessages(): Message[] {
        return this.messages;
    }

    clearHistory() {
        const systemMessage = this.messages[0];
        this.messages = [systemMessage];
        this.totalTokens = this.aiProvider.calculateTotalTokens([systemMessage]);
        localStorage.removeItem(this.getStorageKey());
    }
}