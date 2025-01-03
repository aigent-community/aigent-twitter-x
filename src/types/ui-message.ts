export interface Message {
    content: string;
    isUser: boolean;
    timestamp: Date;
    accountLink?: string;
} 