import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Button } from "@/components/ui/button"
import { KeyRound } from "lucide-react"
import { cn } from "@/lib/utils"
import { APIKeyDialog } from "@/components/ui/api-key-dialog"
import { useTheme } from "@/components/providers/ThemeProvider"

interface SidebarProps {
  personas: Array<{
    name: string
    twitterUsername: string
  }>
  selectedAccount: string | null
  searchQuery: string
  onSearchChange: (value: string) => void
  onPersonaSelect: (username: string) => void
  onKeysChange?: () => void
  className?: string
}

export function Sidebar({
  personas,
  selectedAccount,
  searchQuery,
  onSearchChange,
  onPersonaSelect,
  onKeysChange,
  className
}: SidebarProps) {
  const { theme, setTheme } = useTheme()

  return (
    <div className={cn("pb-12 w-full md:w-80", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-9"
            />
            <APIKeyDialog onKeysChange={onKeysChange}>
              <Button variant="ghost" size="icon" className="h-9 w-9" title="Manage API Keys">
                <KeyRound className="h-4 w-4" />
              </Button>
            </APIKeyDialog>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9" 
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            >
              <ThemeToggle />
            </Button>
          </div>
        </div>
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="space-y-1 p-2">
            {personas.map((persona) => (
              <Card
                key={persona.twitterUsername}
                className={cn(
                  "p-3 cursor-pointer hover:bg-accent",
                  selectedAccount === persona.twitterUsername && "bg-accent"
                )}
                onClick={() => onPersonaSelect(persona.twitterUsername)}
              >
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{persona.name}</span>
                  <span className="text-sm text-muted-foreground">
                    @{persona.twitterUsername}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
} 