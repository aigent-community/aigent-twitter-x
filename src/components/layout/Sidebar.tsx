import { ReactNode } from 'react';
import { PersonaConfig } from '../../types/persona-config';
import { APIKeyDialog } from '../ui/api-key-dialog';
import { AIProviderConfig } from '../../types/ai-provider';
import { ThemeToggle } from '../ui/theme-toggle';
import { KeyRound } from 'lucide-react';

interface ActiveConversation {
    id: string;
    persona: PersonaConfig;
    aiConfig: AIProviderConfig;
    messages: any[];
}

interface SidebarProps {
    personas: PersonaConfig[];
    activeConversations: ActiveConversation[];
    selectedConversationId: string | null;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onPersonaSelect: (username: string) => void;
    onConversationSelect: (id: string) => void;
    onConversationDelete: (id: string) => void;
    onKeysChange: () => void;
    className?: string;
    children?: ReactNode;
}

export function Sidebar({
    personas,
    activeConversations,
    selectedConversationId,
    searchQuery,
    onSearchChange,
    onPersonaSelect,
    onConversationSelect,
    onConversationDelete,
    onKeysChange,
    className = '',
    children
}: SidebarProps) {
    return (
        <aside className={`w-80 flex flex-col bg-background ${className}`}>
            <div className="p-4 border-b">
                <input
                    type="text"
                    placeholder="Search personas..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="input input-bordered w-full bg-background text-foreground placeholder:text-muted-foreground"
                />
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 flex flex-col min-h-0">
                    <h2 className="font-semibold mb-2 text-foreground">Active Conversations</h2>
                    <div className="overflow-y-auto flex-1">
                        {activeConversations.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No active conversations</p>
                        ) : (
                            <ul className="space-y-2">
                                {activeConversations.map((conv) => (
                                    <li
                                        key={conv.id}
                                        className={`p-2 rounded cursor-pointer hover:bg-accent ${
                                            selectedConversationId === conv.id ? 'bg-accent' : ''
                                        }`}
                                    >
                                        <div 
                                            className="flex justify-between items-start"
                                            onClick={() => onConversationSelect(conv.id)}
                                        >
                                            <div>
                                                <div className="font-medium text-foreground">{conv.persona.name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {conv.aiConfig.type === 'anthropic' ? 'Anthropic' : 'OpenAI'} - {conv.aiConfig.model}
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onConversationDelete(conv.id);
                                                }}
                                                className="text-muted-foreground hover:text-destructive"
                                                title="Delete conversation"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t flex flex-col min-h-0">
                    <h2 className="font-semibold mb-2 text-foreground">Available Personas</h2>
                    <div className="overflow-y-auto flex-1">
                        <ul className="space-y-2">
                            {personas.map((persona) => (
                                <li
                                    key={persona.twitterUsername}
                                    className="p-2 rounded cursor-pointer hover:bg-accent"
                                    onClick={() => onPersonaSelect(persona.twitterUsername)}
                                >
                                    <div className="font-medium text-foreground">{persona.name}</div>
                                    <div className="text-sm text-muted-foreground">@{persona.twitterUsername}</div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            <div className="p-4 border-t flex gap-2 items-center">
                <APIKeyDialog onKeysChange={onKeysChange}>
                    <button className="btn btn-square btn-ghost flex items-center justify-center" title="Configure API Keys">
                        <KeyRound className="h-5 w-5" />
                    </button>
                </APIKeyDialog>
                <ThemeToggle />
            </div>

            {children}
        </aside>
    );
} 