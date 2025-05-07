"use client"

import { useState } from "react"
import { PlusCircle, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
} from "@/components/ui/sidebar"

interface Conversation {
  id: string
  title: string
  messages: any[]
  createdAt: Date
}

interface SidebarProps {
  conversations: Conversation[]
  currentConversationId?: string
  onSelectConversation: (id: string) => void
  onNewConversation: () => void
}

export function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true)

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(date)
  }

  const getConversationTitle = (conversation: Conversation) => {
    if (conversation.title && conversation.title !== "New Conversation") {
      return conversation.title
    }

    // If it's a default title, try to get the first user message
    if (conversation.messages && conversation.messages.length > 0) {
      const firstUserMessage = conversation.messages.find((m) => m.role === "user")
      if (firstUserMessage) {
        return firstUserMessage.content.slice(0, 25) + (firstUserMessage.content.length > 25 ? "..." : "")
      }
    }

    return "New Conversation"
  }

  return (
    <SidebarProvider defaultOpen={isOpen}>
      <ShadcnSidebar className="w-80 border-r border-gray-200">
        <SidebarHeader className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold" style={{ color: "#802a25" }}>
              SCU Schedule Helper
            </h2>
            <Button onClick={onNewConversation} variant="ghost" size="icon" style={{ color: "#802a25" }}>
              <PlusCircle className="h-5 w-5" />
            </Button>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <p className="text-sm">No conversations yet</p>
              <Button
                onClick={onNewConversation}
                variant="outline"
                className="mt-2"
                style={{ borderColor: "#802a25", color: "#802a25" }}
              >
                Start a new conversation
              </Button>
            </div>
          ) : (
            <SidebarMenu>
              {conversations.map((conversation) => (
                <SidebarMenuItem key={conversation.id}>
                  <SidebarMenuButton
                    isActive={conversation.id === currentConversationId}
                    onClick={() => onSelectConversation(conversation.id)}
                    className="flex flex-col items-start"
                  >
                    <div className="flex items-center w-full">
                      <MessageSquare className="h-4 w-4 mr-2 shrink-0" />
                      <span className="truncate">{getConversationTitle(conversation)}</span>
                    </div>
                    <span className="text-xs text-gray-500 mt-1">{formatDate(conversation.createdAt)}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          )}
        </SidebarContent>
      </ShadcnSidebar>
    </SidebarProvider>
  )
}
