"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Send, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sidebar } from "./components/sidebar"
import { ChatMessage } from "./components/chat-message"
import { ProgressIndicator } from "./components/progress-indicator"
import { useAuth } from "./components/auth-provider"
import { ProfileButton } from "./components/profile-button"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
}

interface StatusUpdate {
  id: string
  content: string
  timestamp: Date
}

export default function ChatPage() {
  const { signOut } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [statusUpdates, setStatusUpdates] = useState<StatusUpdate[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Create a new conversation if none exists
  useEffect(() => {
    fetchConversations()
  }, [])

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [currentConversation?.messages, statusUpdates])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    // Add user message to conversation
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    }

    // Update UI immediately with user message
    const updatedMessages = currentConversation ? [...currentConversation.messages, userMessage] : [userMessage]

    const updatedConversation = currentConversation
      ? { ...currentConversation, messages: updatedMessages }
      : {
          id: "temp-id", // Will be replaced with the actual ID from the server
          title: "New Conversation",
          messages: updatedMessages,
          createdAt: new Date(),
        }

    setCurrentConversation(updatedConversation)
    if (currentConversation) {
      setConversations(conversations.map((conv) => (conv.id === currentConversation.id ? updatedConversation : conv)))
    }

    setInput("")
    setIsLoading(true)
    setStatusUpdates([])

    try {
      // Prepare headers
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }

      // Add conversation ID if we have one
      if (currentConversation?.id && currentConversation.id !== "temp-id") {
        headers["Conversation-Id"] = currentConversation.id
      }

      const response = await fetch("http://localhost:3000/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: input,
        }),
        credentials: "include", // Important for cookies
      })

      if (!response.body) throw new Error("Response body is null")

      // Get conversation ID from response headers
      const conversationId = response.headers.get("Conversation-Id")

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      let assistantMessage = ""
      let currentStatusUpdate = ""
      let isStatusUpdate = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })

        // Process the chunk byte by byte to detect special markers
        for (let i = 0; i < chunk.length; i++) {
          const charCode = chunk.charCodeAt(i)

          if (charCode === 0xf8) {
            // Start of assistant message
            isStatusUpdate = false
            if (currentStatusUpdate) {
              setStatusUpdates((prev) => [
                ...prev,
                {
                  id: Date.now().toString(),
                  content: currentStatusUpdate,
                  timestamp: new Date(),
                },
              ])
              currentStatusUpdate = ""
            }
            continue
          } else if (charCode === 0xf9) {
            // Start of status update
            isStatusUpdate = true
            continue
          }

          if (isStatusUpdate) {
            currentStatusUpdate += chunk[i]
            if (i === chunk.length - 1 || chunk.charCodeAt(i + 1) === 0xf8 || chunk.charCodeAt(i + 1) === 0xf9) {
              setStatusUpdates((prev) => [
                ...prev,
                {
                  id: Date.now().toString(),
                  content: currentStatusUpdate,
                  timestamp: new Date(),
                },
              ])
              currentStatusUpdate = ""
            }
          } else {
            assistantMessage += chunk[i]

            // Update the assistant message in real-time
            const realtimeMessages = [
              ...updatedMessages,
              { id: "temp-assistant", role: "assistant", content: assistantMessage },
            ]

            setCurrentConversation((prev) => ({
              ...prev!,
              messages: realtimeMessages,
            }))
          }
        }
      }

      // Finalize the conversation with the complete assistant message
      if (assistantMessage) {
        const finalAssistantMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: assistantMessage,
        }

        // Create final conversation object with the ID from the server
        const finalConversation = {
          id: conversationId || updatedConversation.id,
          title: updatedMessages.length === 0 ? assistantMessage.slice(0, 30) + "..." : updatedConversation.title,
          messages: [...updatedMessages, finalAssistantMessage],
          createdAt: updatedConversation.createdAt,
        }

        setCurrentConversation(finalConversation)

        // Update conversations list
        if (currentConversation) {
          setConversations(conversations.map((conv) => (conv.id === currentConversation.id ? finalConversation : conv)))
        } else {
          setConversations([finalConversation, ...conversations])
        }
      }
    } catch (error) {
      console.error("Error sending message:", error)
      // Add error message to conversation
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "Sorry, there was an error processing your request. Please try again.",
      }

      setCurrentConversation((prev) => ({
        ...prev!,
        messages: [...updatedMessages, errorMessage],
      }))
    } finally {
      setIsLoading(false)
    }
  }

  const fetchConversations = async () => {
    try {
      const response = await fetch("http://localhost:3000/conversations", {
        credentials: "include", // Important for cookies
      })
      if (!response.ok) throw new Error("Failed to fetch conversations")

      const data = await response.json()
      if (Array.isArray(data) && data.length > 0) {
        // Transform the data to match our Conversation interface
        const fetchedConversations = data.map((conv: any) => ({
          id: conv.id,
          title: conv.title || "Untitled Conversation",
          messages: [], // We'll load messages when selecting a conversation
          createdAt: new Date(conv.createdAt || Date.now()),
        }))

        setConversations(fetchedConversations)

        // Set the first conversation as current if none is selected
        if (!currentConversation) {
          setCurrentConversation(fetchedConversations[0])
        }
      }
    } catch (error) {
      console.error("Error fetching conversations:", error)
    }
  }

  const loadConversationMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`http://localhost:3000/conversations/${conversationId}`, {
        credentials: "include", // Important for cookies
      })
      if (!response.ok) throw new Error("Failed to fetch conversation messages")

      const data = await response.json()
      if (data && data.messages) {
        // Update the conversation with loaded messages
        const updatedConversation = {
          ...conversations.find((c) => c.id === conversationId)!,
          messages: data.messages.map((msg: any) => ({
            id: msg.id || Date.now().toString(),
            role: msg.role,
            content: msg.content,
          })),
        }

        setCurrentConversation(updatedConversation)
        setConversations(conversations.map((conv) => (conv.id === conversationId ? updatedConversation : conv)))
      }
    } catch (error) {
      console.error("Error loading conversation messages:", error)
    }
  }

  const startNewConversation = () => {
    const newConversation = {
      id: Date.now().toString(),
      title: "New Conversation",
      messages: [],
      createdAt: new Date(),
    }
    setConversations([newConversation, ...conversations])
    setCurrentConversation(newConversation)
    setStatusUpdates([])
  }

  const selectConversation = (conversationId: string) => {
    const selected = conversations.find((conv) => conv.id === conversationId)
    if (selected) {
      setCurrentConversation(selected)
      setStatusUpdates([])

      // If the conversation has no messages, load them
      if (selected.messages.length === 0) {
        loadConversationMessages(conversationId)
      }
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversation?.id}
        onSelectConversation={selectConversation}
        onNewConversation={startNewConversation}
      />

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="bg-white border-b border-gray-200 p-2 flex justify-between items-center">
          <h1 className="text-lg font-semibold" style={{ color: "#802a25" }}>
            Academic Advisor
          </h1>
          <div className="flex items-center gap-2">
            <ProfileButton />
            <Button variant="ghost" size="sm" onClick={signOut} className="text-gray-500 hover:text-gray-700">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        <main className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 pb-24">
            {currentConversation?.messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <ProgressIndicator statusUpdates={statusUpdates} />
        </main>

        <div className="fixed bottom-0 left-80 right-0 bg-white border-t border-gray-200 p-4 shadow-md">
          <form onSubmit={handleSendMessage} className="flex space-x-2 max-w-5xl mx-auto">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about academic advising..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="transition-colors"
              style={{ backgroundColor: "#802a25" }}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
