import { useState } from 'react';
import { AIProviderType, AIProviderConfig } from '../../types/ai-provider';

interface AIProviderSelectorProps {
    onProviderChange: (config: AIProviderConfig) => void;
}

const OPENAI_MODELS = [
    'gpt-4-turbo-preview',
    'gpt-4',
    'gpt-3.5-turbo'
];

const ANTHROPIC_MODELS = [
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-2.1'
];

export function AIProviderSelector({ onProviderChange }: AIProviderSelectorProps) {
    const [provider, setProvider] = useState<AIProviderType>('anthropic');
    const [model, setModel] = useState<string>(
        provider === 'anthropic' ? ANTHROPIC_MODELS[0] : OPENAI_MODELS[0]
    );

    const handleProviderChange = (newProvider: AIProviderType) => {
        setProvider(newProvider);
        const defaultModel = newProvider === 'anthropic' ? ANTHROPIC_MODELS[0] : OPENAI_MODELS[0];
        setModel(defaultModel);
        onProviderChange({ type: newProvider, model: defaultModel });
    };

    const handleModelChange = (newModel: string) => {
        setModel(newModel);
        onProviderChange({ type: provider, model: newModel });
    };

    const models = provider === 'anthropic' ? ANTHROPIC_MODELS : OPENAI_MODELS;

    return (
        <div className="flex flex-col gap-2 p-4 rounded-lg border bg-background">
            <div className="flex gap-4">
                <label className="flex items-center gap-2 text-foreground">
                    <input
                        type="radio"
                        name="provider"
                        value="anthropic"
                        checked={provider === 'anthropic'}
                        onChange={() => handleProviderChange('anthropic')}
                        className="radio"
                    />
                    Anthropic
                </label>
                <label className="flex items-center gap-2 text-foreground">
                    <input
                        type="radio"
                        name="provider"
                        value="openai"
                        checked={provider === 'openai'}
                        onChange={() => handleProviderChange('openai')}
                        className="radio"
                    />
                    OpenAI
                </label>
            </div>
            <select
                value={model}
                onChange={(e) => handleModelChange(e.target.value)}
                className="select select-bordered w-full bg-background text-foreground"
            >
                {models.map((m) => (
                    <option key={m} value={m} className="bg-background text-foreground">
                        {m}
                    </option>
                ))}
            </select>
        </div>
    );
} 