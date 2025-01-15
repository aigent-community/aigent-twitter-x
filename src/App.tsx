import { useState, useEffect, useRef } from 'react'
import { PersonaConversation } from './types/persona-conversation'
import { ConversationConfig } from './types/conversation-config'
import { ThemeProvider } from './components/providers/ThemeProvider'
import { Sidebar } from './components/layout/Sidebar'
import { ChatContainer } from './components/layout/ChatContainer'
import { PersonaConfig } from './types/persona-config'
import { AnthropicAPI } from './services/anthropic-api'
import { OpenAIAPI } from './services/openai-api'
import { Message as UIMessage } from './types/ui-message'
import { APIKeyManager } from './services/api-key-manager'
import { APIKeyDialog } from './components/ui/api-key-dialog'
import { AIProviderSelector } from './components/ui/ai-provider-selector'
import { AIProviderConfig, AIProvider } from './types/ai-provider'

const getConfigForModel = async (aiProvider: AIProvider, model: string): Promise<ConversationConfig> => {
  let maxTokens: number;
  
  if (aiProvider instanceof AnthropicAPI) {
    maxTokens = await (aiProvider as AnthropicAPI).getModelLimit(model);
  } else if (aiProvider instanceof OpenAIAPI) {
    maxTokens = await (aiProvider as OpenAIAPI).getModelLimit();
  } else {
    maxTokens = 8192; // Conservative default
  }

  return {
    maxTokens,
    maxMessageAge: 60,
    maxMessages: 20,
    reservedTokens: 1000
  };
};

interface ActiveConversation {
  id: string;
  persona: PersonaConfig;
  aiConfig: AIProviderConfig;
  messages: UIMessage[];
}

function App() {
  const [activeConversations, setActiveConversations] = useState<ActiveConversation[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [personas, setPersonas] = useState<PersonaConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inputMessage, setInputMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAIConfig, setSelectedAIConfig] = useState<AIProviderConfig>({
    type: 'anthropic',
    model: 'claude-3-sonnet-20240229'
  })
  const conversationsRef = useRef<Map<string, PersonaConversation>>(new Map())
  const [tokenStats, setTokenStats] = useState({ used: 0, remaining: 0 });

  // Check for API key on startup
  useEffect(() => {
    const requiredProvider = selectedAIConfig.type;
    if (!APIKeyManager.hasKey(requiredProvider)) {
      setError(`Please set up your ${requiredProvider === 'anthropic' ? 'Anthropic' : 'OpenAI'} API key to start chatting`);
    }
  }, [selectedAIConfig.type]);

  // Convert conversation messages to UI messages
  // const convertToUIMessages = (conversationMessages: ConversationMessage[], twitterUsername: string): UIMessage[] => {
  //   return conversationMessages
  //     .filter(msg => msg.role !== 'system')
  //     .map(msg => ({
  //       content: msg.content,
  //       isUser: msg.role === 'user',
  //       timestamp: new Date(msg.timestamp || Date.now()),
  //       accountLink: msg.role === 'assistant' ? `https://twitter.com/${twitterUsername}` : undefined
  //     }));
  // };

  const handleKeysChange = () => {
    const requiredProvider = selectedAIConfig.type;
    setError(APIKeyManager.hasKey(requiredProvider) ? null : `Please set up your ${requiredProvider === 'anthropic' ? 'Anthropic' : 'OpenAI'} API key to start chatting`);
  };

  const createAIProvider = (config: AIProviderConfig): AIProvider => {
    const apiKey = APIKeyManager.getKey(config.type);
    if (!apiKey) {
      throw new Error(`No API key found for ${config.type}`);
    }

    switch (config.type) {
      case 'anthropic':
        return new AnthropicAPI(apiKey);
      case 'openai':
        return new OpenAIAPI(apiKey, config.model);
      default:
        throw new Error(`Unknown provider type: ${config.type}`);
    }
  };

  useEffect(() => {
    const loadPersonas = async () => {
      try {
        const response = await fetch('/aigent-twitter-x/personas-db.json')
        if (!response.ok) throw new Error('Failed to load personas')
        const data: { personaFiles: string[] } = await response.json()
        
        const loadedPersonas = await Promise.all(
          data.personaFiles.map(async (file) => {
            const personaResponse = await fetch(`/aigent-twitter-x/${file}`)
            if (!personaResponse.ok) throw new Error(`Failed to load persona: ${file}`)
            return personaResponse.json()
          })
        )
        
        setPersonas(loadedPersonas)
      } catch (err) {
        setError('Failed to load personas')
      } finally {
        setLoading(false)
      }
    }
    loadPersonas()
  }, [])

  const handleAIConfigChange = (newConfig: AIProviderConfig) => {
    setSelectedAIConfig(newConfig);
  };

  const startNewConversation = async (persona: PersonaConfig) => {
    try {
      const aiProvider = createAIProvider(selectedAIConfig);
      const config = await getConfigForModel(aiProvider, selectedAIConfig.model);
      const conversation = new PersonaConversation(
        aiProvider,
        persona,
        config,
        selectedAIConfig.type,
        selectedAIConfig.model
      );

      const newConversation: ActiveConversation = {
        id: conversation.id,
        persona,
        aiConfig: { ...selectedAIConfig },
        messages: []
      };

      conversationsRef.current.set(conversation.id, conversation);
      setActiveConversations(prev => [...prev, newConversation]);
      setSelectedConversationId(conversation.id);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to start conversation: ${errorMessage}`);
    }
  };

  const handlePersonaSelect = (username: string) => {
    const persona = personas.find(p => p.twitterUsername === username);
    if (persona) {
      startNewConversation(persona);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedConversationId || isSending) {
      return;
    }

    const conversation = conversationsRef.current.get(selectedConversationId);
    const activeConversation = activeConversations.find(c => c.id === selectedConversationId);
    
    if (!conversation || !activeConversation) {
      return;
    }

    const userMessage: UIMessage = {
      content: inputMessage,
      isUser: true,
      timestamp: new Date()
    };

    setActiveConversations(prev => 
      prev.map(conv => 
        conv.id === selectedConversationId
          ? { ...conv, messages: [...conv.messages, userMessage] }
          : conv
      )
    );
    setInputMessage('');
    setIsSending(true);

    try {
      const response = await conversation.sendMessage(inputMessage);
      const agentMessage: UIMessage = {
        content: response,
        isUser: false,
        timestamp: new Date(),
        accountLink: `https://twitter.com/${activeConversation.persona.twitterUsername}`
      };

      setActiveConversations(prev => 
        prev.map(conv => 
          conv.id === selectedConversationId
            ? { ...conv, messages: [...conv.messages, agentMessage] }
            : conv
        )
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to send message: ${errorMessage}`);
    } finally {
      setIsSending(false);
    }
  };

  const getTokenStats = async (conversationId: string) => {
    const conversation = conversationsRef.current.get(conversationId);
    if (!conversation) {
      return { used: 0, remaining: 0 };
    }
    const stats = await conversation.getContextStats();
    return {
      used: stats.totalTokens,
      remaining: stats.remainingTokenCapacity
    };
  };

  const clearConversation = () => {
    if (selectedConversationId) {
      const conversation = conversationsRef.current.get(selectedConversationId);
      if (conversation) {
        conversation.clearHistory();
        setActiveConversations(prev => 
          prev.map(conv => 
            conv.id === selectedConversationId
              ? { ...conv, messages: [] }
              : conv
          )
        );
      }
    }
  };

  const handleConversationDelete = (id: string) => {
    conversationsRef.current.delete(id);
    setActiveConversations(prev => prev.filter(conv => conv.id !== id));
    if (selectedConversationId === id) {
      setSelectedConversationId(null);
    }
  };

  const selectedConversation = activeConversations.find(c => c.id === selectedConversationId);

  const filteredPersonas = personas.filter(persona =>
    persona.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    persona.twitterUsername.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const updateTokenStats = async () => {
      if (selectedConversationId) {
        const stats = await getTokenStats(selectedConversationId);
        setTokenStats(stats);
      }
    };
    updateTokenStats();
  }, [selectedConversationId, activeConversations]);

  // Load conversations from localStorage on startup
  useEffect(() => {
    const loadConversationsFromStorage = async () => {
      const savedConversations = localStorage.getItem('aigent-conversations');
      if (!savedConversations) return;

      try {
        const parsed = JSON.parse(savedConversations);
        // Convert timestamps to Date objects before setting state
        const conversationsWithDates = parsed.conversations.map((conv: ActiveConversation) => ({
          ...conv,
          messages: conv.messages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        setActiveConversations(conversationsWithDates);
        
        // Recreate PersonaConversation instances
        const persona = personas.find(p => p.twitterUsername === parsed.persona?.twitterUsername);
        if (!persona) return;

        for (const conv of parsed.conversations) {
          try {
            const aiProvider = createAIProvider(conv.aiConfig);
            const config = await getConfigForModel(aiProvider, conv.aiConfig.model);
            const conversation = new PersonaConversation(
              aiProvider,
              persona,
              config,
              conv.aiConfig.type,
              conv.aiConfig.model
            );

            // Restore messages with proper timestamp conversion
            conv.messages.forEach((msg: UIMessage) => {
              if (msg.isUser) {
                conversation.addMessage('user', msg.content, new Date(msg.timestamp).getTime());
              } else {
                conversation.addMessage('assistant', msg.content, new Date(msg.timestamp).getTime());
              }
            });

            conversationsRef.current.set(conv.id, conversation);
          } catch (error) {
            console.error('Failed to restore conversation:', error);
          }
        }
      } catch (error) {
        console.error('Failed to load conversations from storage:', error);
      }
    };

    loadConversationsFromStorage();
  }, [personas]);

  // Save conversations to localStorage when they change
  useEffect(() => {
    if (activeConversations.length === 0) return;
    
    const selectedConversation = activeConversations.find(c => c.id === selectedConversationId);
    if (!selectedConversation) return;

    localStorage.setItem('aigent-conversations', JSON.stringify({
      conversations: activeConversations,
      persona: selectedConversation.persona
    }));
  }, [activeConversations, selectedConversationId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar
          personas={filteredPersonas}
          activeConversations={activeConversations}
          selectedConversationId={selectedConversationId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onPersonaSelect={handlePersonaSelect}
          onConversationSelect={setSelectedConversationId}
          onConversationDelete={handleConversationDelete}
          onKeysChange={handleKeysChange}
          className="border-r"
        >
          <div className="p-4 border-t">
            <AIProviderSelector onProviderChange={handleAIConfigChange} />
          </div>
        </Sidebar>
        <main className="flex-1">
          {error ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-destructive mb-4">{error}</p>
                <APIKeyDialog onKeysChange={handleKeysChange} />
              </div>
            </div>
          ) : (
            selectedConversation ? (
              <ChatContainer
                selectedAccount={selectedConversation.persona.twitterUsername}
                messages={selectedConversation.messages}
                inputMessage={inputMessage}
                isSending={isSending}
                tokenStats={tokenStats}
                onInputChange={setInputMessage}
                onSendMessage={handleSendMessage}
                onClearChat={clearConversation}
                selectedPersonaName={selectedConversation.persona.name}
                aiConfig={selectedConversation.aiConfig}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Select a persona to start chatting
              </div>
            )
          )}
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App