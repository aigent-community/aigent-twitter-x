import { useState, useEffect, useRef } from 'react'
import './App.css'
import { PersonaConversation } from './types/persona-conversation'
import { ConversationConfig } from './types/conversation-config'

interface Message {
  content: string
  isUser: boolean
  timestamp: Date
  accountLink?: string
}

interface Persona {
  name: string
  tweetExamples: string[]
  characteristics: string[]
  topics: string[]
  language: string
  twitterUsername: string
}

interface PersonasDB {
  personas: Persona[]
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
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inputMessage, setInputMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isMobileMenuVisible, setIsMobileMenuVisible] = useState(false)
  const conversationRef = useRef<PersonaConversation | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
      setIsMobileMenuVisible(false)
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
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
      <div className="app-container">
        <div className="loading-container">
          <div className="loading-spinner" />
          <div>Loading conversations...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className={`messages-sidebar ${isMobileMenuVisible ? 'visible' : ''}`}>
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search conversations"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {error ? (
          <div className="error-message">{error}</div>
        ) : (
          <div className="conversation-list">
            {filteredPersonas.map((persona) => (
              <div
                key={persona.twitterUsername}
                className={`conversation-item ${selectedAccount === persona.twitterUsername ? 'active' : ''}`}
                onClick={() => handleAccountSelect(persona.twitterUsername)}
              >
                <div className="account-info">
                  <span className="account-name">{persona.name}</span>
                  <span className="account-handle">@{persona.twitterUsername}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button 
        className="mobile-menu-button" 
        onClick={() => setIsMobileMenuVisible(!isMobileMenuVisible)}
      >
        {isMobileMenuVisible ? '×' : '≡'}
      </button>

      <div className="chat-container">
        {selectedAccount ? (
          <>
            <div className="chat-header">
              <div className="account-info">
                <span className="account-name">
                  {personas.find(p => p.twitterUsername === selectedAccount)?.name}
                </span>
                <span className="account-handle">@{selectedAccount}</span>
              </div>
              <button className="clear-button" onClick={clearConversation}>
                Clear chat
              </button>
            </div>

            <div className="messages-container">
              {messages.map((message, index) => (
                <div key={index} className={`message ${message.isUser ? 'user' : ''}`}>
                  <div>
                    <div className="message-content">{message.content}</div>
                    <div className="timestamp">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="sending-indicator">
                  Sending message...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="input-container">
              <textarea
                className="message-input"
                placeholder={isSending ? "Sending..." : "Start a new message"}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isSending}
              />
            </div>
            <div className="token-stats-footer">
              <div className="token-stats-item">
                <span className="token-stats-label">Used:</span>
                <span>{tokenStats.used.toLocaleString()} tokens</span>
              </div>
              <div className="token-stats-item">
                <span className="token-stats-label">Remaining:</span>
                <span>{tokenStats.remaining.toLocaleString()} tokens</span>
              </div>
            </div>
          </>
        ) : (
          <div className="chat-header">
            <span>Select a conversation to start chatting</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default App