"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant" | "tool"
  content: string
}

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message, toolMessages = [] }: ChatMessageProps & { toolMessages?: Message[] }) {
  const [showActions, setShowActions] = useState(false)
  const isUser = message.role === "user"
  const isAssistant = message.role === "assistant"
  const isTool = message.role === "tool"

  // Don't render tool messages directly - they'll be shown in the dropdown
  if (isTool) return null

  return (
    <div className={cn("mb-4", isUser ? "flex justify-end" : "flex justify-start")}>
      <div className={cn("max-w-[80%]", isUser ? "order-2" : "order-1")}>
        {/* Show actions dropdown for assistant messages that have tool messages */}
        {isAssistant && toolMessages.length > 0 && (
          <div className="mb-2">
            <button
              onClick={() => setShowActions(!showActions)}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              {showActions ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              See actions taken ({toolMessages.length})
            </button>

            {showActions && (
              <div className="mt-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="space-y-2">
                  {toolMessages.map((toolMsg, index) => (
                    <div key={toolMsg.id} className="flex items-center gap-2 text-sm">
                      <div className="h-2 w-2 rounded-full bg-gray-400" />
                      <span className="text-gray-700">{toolMsg.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className={cn("flex items-start gap-4", isUser ? "flex-row-reverse" : "flex-row")}>
          <Avatar className={cn("h-8 w-8", isUser ? "bg-blue-500" : "bg-[#802a25]")}>
            <AvatarFallback>{isUser ? "U" : "A"}</AvatarFallback>
          </Avatar>

          <div className={cn("rounded-lg p-3", isUser ? "bg-blue-100 text-blue-900" : "bg-gray-100 text-gray-900")}>
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
