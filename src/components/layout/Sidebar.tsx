import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { cn } from "@/lib/utils"

interface SidebarProps {
  personas: Array<{
    name: string
    twitterUsername: string
  }>
  selectedAccount: string | null
  searchQuery: string
  onSearchChange: (value: string) => void
  onPersonaSelect: (username: string) => void
  className?: string
}

export function Sidebar({
  personas,
  selectedAccount,
  searchQuery,
  onSearchChange,
  onPersonaSelect,
  className
}: SidebarProps) {
  return (
    <div className={cn("pb-12 w-full md:w-80", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2 flex items-center justify-between">
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-10"
          />
          <div className="ml-2">
            <ThemeToggle />
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