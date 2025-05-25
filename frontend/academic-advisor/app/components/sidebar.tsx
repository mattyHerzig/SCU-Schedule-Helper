"use client"

import type React from "react"

import { useState } from "react"
import { PlusCircle, MessageSquare, Trash2 } from 'lucide-react'
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
import { DeleteConfirmationModal } from "./delete-confirmation-modal"

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
  onDeleteConversation: (id: string) => void
}

export function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null)

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

  const handleDeleteClick = (e: React.MouseEvent, conversation: Conversation) => {
    e.stopPropagation() // Prevent selecting the conversation
    setConversationToDelete(conversation)
    setDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!conversationToDelete) return

    setDeletingId(conversationToDelete.id)
    try {
      await onDeleteConversation(conversationToDelete.id)
    } finally {
      setDeletingId(null)
      setConversationToDelete(null)
    }
  }

  return (
    <>
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
                    <div className="group relative">
                      <SidebarMenuButton
                        isActive={conversation.id === currentConversationId}
                        onClick={() => onSelectConversation(conversation.id)}
                        className="flex flex-col items-start w-full pr-10"
                      >
                        <div className="flex items-center w-full">
                          <MessageSquare className="h-4 w-4 mr-2 shrink-0" />
                          <span className="truncate">{getConversationTitle(conversation)}</span>
                        </div>
                        <span className="text-xs text-gray-500 mt-1">{formatDate(conversation.createdAt)}</span>
                      </SidebarMenuButton>

                      {/* Delete button - appears on hover */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDeleteClick(e, conversation)}
                        disabled={deletingId === conversation.id}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete conversation</span>
                      </Button>
                    </div>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </SidebarContent>
        </ShadcnSidebar>
      </SidebarProvider>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleConfirmDelete}
        title={conversationToDelete ? getConversationTitle(conversationToDelete) : ""}
        description="This conversation and all its messages will be permanently deleted."
        isDeleting={deletingId === conversationToDelete?.id}
      />
    </>
  )
}
