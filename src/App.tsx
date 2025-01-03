import { useState, useEffect, useRef } from 'react'
import { PersonaConversation } from './types/persona-conversation'
import { ConversationConfig } from './types/conversation-config'
import { ThemeProvider } from './components/providers/ThemeProvider'
import { Sidebar } from './components/layout/Sidebar'
import { ChatContainer } from './components/layout/ChatContainer'
import { PersonaConfig } from './types/persona-config'

interface Message {
  content: string
  isUser: boolean
  timestamp: Date
  accountLink?: string
}

interface PersonasDB {
  personas: PersonaConfig[]
}

const DEFAULT_CONFIG: ConversationConfig = {
  maxTokens: 100000,
  maxMessageAge: 60,
  maxMessages: 20,
  reservedTokens: 1000
}

function App() {
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [tokenStats, setTokenStats] = useState({ used: 0, remaining: 0 })
  const [personas, setPersonas] = useState<PersonaConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inputMessage, setInputMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const conversationRef = useRef<PersonaConversation | null>(null)

  useEffect(() => {
    const loadPersonas = async () => {
      try {
        const response = await fetch('/aigent-twitter-x/personas-db.json')
        if (!response.ok) throw new Error('Failed to load personas')
        const data: PersonasDB = await response.json()
        setPersonas(data.personas)
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
      setSelectedAccount(username)
      conversationRef.current = new PersonaConversation(
        import.meta.env.VITE_ANTHROPIC_API_KEY,
        persona,
        DEFAULT_CONFIG
      )
      setMessages([])
      updateTokenStats()
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedAccount || !conversationRef.current || isSending) {
      return
    }

    const userMessage: Message = {
      content: inputMessage,
      isUser: true,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsSending(true)

    try {
      const response = await conversationRef.current.sendMessage(inputMessage)
      const agentMessage: Message = {
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

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-destructive">{error}</p>
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
          className="border-r"
        />
        <main className="flex-1">
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
        </main>
      </div>
    </ThemeProvider>
  )
}

export default App