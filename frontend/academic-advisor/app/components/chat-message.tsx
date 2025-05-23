import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex items-start gap-4 mb-4", isUser ? "flex-row-reverse" : "flex-row")}>
      <Avatar className={cn("h-8 w-8", isUser ? "bg-blue-500" : "bg-[#802a25]")}>
        <AvatarFallback>{isUser ? "U" : "A"}</AvatarFallback>
      </Avatar>

      <div
        className={cn("rounded-lg p-3 max-w-[80%]", isUser ? "bg-blue-100 text-blue-900" : "bg-gray-100 text-gray-900")}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}
