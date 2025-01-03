interface APIKeys {
    anthropic?: string;
    openai?: string;
}

export class APIKeyManager {
    private static STORAGE_KEY = 'api_keys';

    static getKeys(): APIKeys {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (!stored) return {};
        try {
            return JSON.parse(stored);
        } catch {
            return {};
        }
    }

    static getKey(provider: keyof APIKeys): string | undefined {
        const keys = this.getKeys();
        return keys[provider];
    }

    static setKey(provider: keyof APIKeys, key: string): void {
        const keys = this.getKeys();
        keys[provider] = key;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(keys));
    }

    static removeKey(provider: keyof APIKeys): void {
        const keys = this.getKeys();
        delete keys[provider];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(keys));
    }

    static hasKey(provider: keyof APIKeys): boolean {
        return !!this.getKey(provider);
    }
} 