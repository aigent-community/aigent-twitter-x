import { Message } from "./message";
import { ConversationConfig } from "./conversation-config";
import { PersonaConfig } from "./persona-config";
import { AIProvider } from "./ai-provider";

export class PersonaConversation {
    private messages: Message[] = [];
    private aiProvider: AIProvider;
    private persona: PersonaConfig;
    private config: ConversationConfig;
    public readonly id: string;

    constructor(aiProvider: AIProvider, persona: PersonaConfig, config: ConversationConfig, providerType: string, model: string) {
        this.aiProvider = aiProvider;
        this.persona = persona;
        this.config = config;
        this.id = `${persona.twitterUsername}-${providerType}-${model}`;

        // Initialize with system message
        this.messages.push({
            role: 'system',
            content: this.createSystemPrompt(),
            timestamp: Date.now()
        });
    }

    private createSystemPrompt(): string {
        return `You are ${this.persona.name} (@${this.persona.twitterUsername}). 
        Here are some example tweets from you:
        ${this.persona.tweetExamples.map(tweet => `- "${tweet}"`).join('\n')}
        
        Your characteristics:
        ${this.persona.characteristics.map(char => `- ${char}`).join('\n')}
        
        Topics you often discuss:
        ${this.persona.topics.map(topic => `- ${topic}`).join('\n')}
        
        Respond in ${this.persona.language} language.
        Keep responses concise and in your characteristic style.`;
    }

    async sendMessage(content: string): Promise<string> {
        const userMessage: Message = {
            role: 'user',
            content,
            timestamp: Date.now()
        };
        this.messages.push(userMessage);

        const optimizedMessages = this.aiProvider.optimizeContext(this.messages, this.config);
        const response = await this.aiProvider.sendMessage(
            optimizedMessages,
            this.createSystemPrompt(),
            this.config.maxTokens - this.aiProvider.calculateTotalTokens(optimizedMessages)
        );

        const assistantMessage: Message = {
            role: 'assistant',
            content: response,
            timestamp: Date.now()
        };
        this.messages.push(assistantMessage);

        return response;
    }

    getMessages(): Message[] {
        return this.messages;
    }

    clearHistory(): void {
        this.messages = this.messages.slice(0, 1); // Keep only system message
    }

    addMessage(role: 'user' | 'assistant', content: string, timestamp: number) {
        this.messages.push({
            role,
            content,
            timestamp
        });
    }

    async getContextStats() {
        return await this.aiProvider.getContextStats(this.messages, this.config);
    }
}