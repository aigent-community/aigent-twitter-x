import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useRef, useEffect } from "react"

interface Message {
  content: string
  isUser: boolean
  timestamp: Date
  accountLink?: string
}

interface ChatContainerProps {
  selectedAccount: string | null
  messages: Message[]
  inputMessage: string
  isSending: boolean
  tokenStats: {
    used: number
    remaining: number
  }
  onInputChange: (value: string) => void
  onSendMessage: () => void
  onClearChat: () => void
  className?: string
  selectedPersonaName?: string
}

export function ChatContainer({
  selectedAccount,
  messages,
  inputMessage,
  isSending,
  tokenStats,
  onInputChange,
  onSendMessage,
  onClearChat,
  className,
  selectedPersonaName
}: ChatContainerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSendMessage()
    }
  }

  if (!selectedAccount) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Select a conversation to start chatting</p>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex flex-col">
          <span className="font-medium">{selectedPersonaName}</span>
          <span className="text-sm text-muted-foreground">@{selectedAccount}</span>
        </div>
        <Button variant="outline" onClick={onClearChat}>
          Clear chat
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <Card
              key={index}
              className={cn(
                "p-4",
                message.isUser ? "ml-auto bg-primary text-primary-foreground" : "mr-auto"
              )}
            >
              <p className="leading-relaxed">{message.content}</p>
              <span className="text-xs opacity-70 mt-2 block">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </Card>
          ))}
          {isSending && (
            <div className="text-sm text-muted-foreground">Sending message...</div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t space-y-4">
        <Textarea
          placeholder={isSending ? "Sending..." : "Type your message..."}
          value={inputMessage}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isSending}
          className="min-h-[100px]"
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <div>Used: {tokenStats.used.toLocaleString()} tokens</div>
          <div>Remaining: {tokenStats.remaining.toLocaleString()} tokens</div>
        </div>
      </div>
    </div>
  )
} 