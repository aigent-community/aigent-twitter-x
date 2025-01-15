import { useState, useEffect, useRef } from 'react'
import { PersonaConversation } from './types/persona-conversation'
import { ConversationConfig } from './types/conversation-config'
import { ThemeProvider } from './components/providers/ThemeProvider'
import { Sidebar } from './components/layout/Sidebar'
import { ChatContainer } from './components/layout/ChatContainer'
import { PersonaConfig } from './types/persona-config'
import { AnthropicAPI } from './services/anthropic-api'
import { Message as UIMessage } from './types/ui-message'
import { Message as ConversationMessage } from './types/message'
import { APIKeyManager } from './services/api-key-manager'
import { APIKeyDialog } from './components/ui/api-key-dialog'

const DEFAULT_CONFIG: ConversationConfig = {
  maxTokens: 100000,
  maxMessageAge: 60,
  maxMessages: 20,
  reservedTokens: 1000
}

function App() {
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [tokenStats, setTokenStats] = useState({ used: 0, remaining: 0 })
  const [personas, setPersonas] = useState<PersonaConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inputMessage, setInputMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const conversationRef = useRef<PersonaConversation | null>(null)

  // Check for API key on startup
  useEffect(() => {
    if (!APIKeyManager.hasKey('anthropic')) {
      setError('Please set up your API keys to start chatting');
    }
  }, []);

  // Convert conversation messages to UI messages
  const convertToUIMessages = (conversationMessages: ConversationMessage[]): UIMessage[] => {
    return conversationMessages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        content: msg.content,
        isUser: msg.role === 'user',
        timestamp: new Date(msg.timestamp || Date.now()),
        accountLink: msg.role === 'assistant' && selectedAccount ? 
          `https://twitter.com/${selectedAccount}` : undefined
      }));
  };

  const handleKeysChange = () => {
    setError(APIKeyManager.hasKey('anthropic') ? null : 'Please set up your API keys to start chatting');
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

  const updateTokenStats = () => {
    if (conversationRef.current) {
      const stats = conversationRef.current.getContextStats()
      setTokenStats({
        used: stats.totalTokens,
        remaining: stats.remainingTokenCapacity
      })
    }
  }

  const handleAccountSelect = (username: string) => {
    const persona = personas.find(p => p.twitterUsername === username)
    if (persona) {
      const anthropicKey = APIKeyManager.getKey('anthropic');
      if (!anthropicKey) {
        setError('Please set up your API keys to start chatting');
        return;
      }

      setSelectedAccount(username)
      const aiProvider = new AnthropicAPI(anthropicKey)
      conversationRef.current = new PersonaConversation(
        aiProvider,
        persona,
        DEFAULT_CONFIG
      )
      
      if (conversationRef.current) {
        const conversationMessages = conversationRef.current.getMessages();
        const uiMessages = convertToUIMessages(conversationMessages);
        setMessages(uiMessages);
      } else {
        setMessages([]);
      }
      
      updateTokenStats()
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedAccount || !conversationRef.current || isSending) {
      return
    }

    const userMessage: UIMessage = {
      content: inputMessage,
      isUser: true,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsSending(true)

    try {
      const response = await conversationRef.current.sendMessage(inputMessage)
      const agentMessage: UIMessage = {
        content: response,
        isUser: false,
        timestamp: new Date(),
        accountLink: `https://twitter.com/${selectedAccount}`
      }
      setMessages(prev => [...prev, agentMessage])
      updateTokenStats()
    } catch (err) {
      setError('Failed to send message')
      console.error('Error sending message:', err)
    } finally {
      setIsSending(false)
    }
  }

  const clearConversation = () => {
    if (conversationRef.current) {
      conversationRef.current.clearHistory()
      setMessages([])
      updateTokenStats()
    }
  }

  const filteredPersonas = personas.filter(persona =>
    persona.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    persona.twitterUsername.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading conversations...</p>
        </div>
      </div>
    )
  }

  return (
    <ThemeProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar
          personas={filteredPersonas}
          selectedAccount={selectedAccount}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onPersonaSelect={handleAccountSelect}
          onKeysChange={handleKeysChange}
          className="border-r"
        />
        <main className="flex-1">
          {error ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-destructive mb-4">{error}</p>
                <APIKeyDialog onKeysChange={handleKeysChange} />
              </div>
            </div>
          ) : (
            <ChatContainer
              selectedAccount={selectedAccount}
              messages={messages}
              inputMessage={inputMessage}
              isSending={isSending}
              tokenStats={tokenStats}
              onInputChange={setInputMessage}
              onSendMessage={handleSendMessage}
              onClearChat={clearConversation}
              selectedPersonaName={personas.find(p => p.twitterUsername === selectedAccount)?.name}
            />
          )}
        </main>
      </div>
    </ThemeProvider>
  )
}

export default App