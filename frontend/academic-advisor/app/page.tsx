"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Send, LogOut } from "lucide-react"
import { SSE } from "sse.js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sidebar } from "./components/sidebar"
import { ChatMessage } from "./components/chat-message"
import { useAuth } from "./components/auth-provider"
import { ProfileButton } from "./components/profile-button"
import ProtectedPage from "./components/protected-page"

interface Message {
  id: string
  role: "user" | "assistant" | "tool"
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

function ChatPage() {
  const { signOut } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [statusUpdates, setStatusUpdates] = useState<StatusUpdate[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showWelcome, setShowWelcome] = useState(true)
  const [welcomeFading, setWelcomeFading] = useState(false)

  // Create a new conversation if none exists
  useEffect(() => {
    fetchConversations()
  }, [])

  useEffect(() => {
    // If currnet conversation changes, update conversations list
    if (currentConversation) {
      setConversations((prev) =>
        prev.map((conv) => (conv.id === currentConversation.id ? currentConversation : conv))
      )
    }
  }, [currentConversation, conversations.length > 0])

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "instant" })
  }, [currentConversation?.messages, statusUpdates])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    // Hide welcome message when first message is sent
    if (showWelcome) {
      setWelcomeFading(true)
      setTimeout(() => {
        setShowWelcome(false)
        setWelcomeFading(false)
      }, 300)
    }

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
    } else {
      // This is a new conversation, add it to the list
      setConversations([updatedConversation, ...conversations])
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

      let assistantMessage = ""
      let toolCalls: Message[] = []
      const eventSource = new SSE(`${process.env.NEXT_PUBLIC_BASE_URL}/api/chat`, {
        method: "POST",
        headers,
        payload: JSON.stringify({
          message: input,
        }),
        withCredentials: true, // Important for cookies
      });
      eventSource.addEventListener("open", (event: any) => {
        console.log("Connection opened:", event)
        const conversationId = event.headers["Conversation-Id"]
        setCurrentConversation((prev) => ({
          ...prev!,
          id: conversationId || prev?.id || "temp-id",
          title: updatedMessages.length === 0 ? input.slice(0, 30) + "..." : prev?.title || "New Conversation",
          createdAt: prev?.createdAt || new Date(),
        }))
      });
      eventSource.addEventListener("statusUpdate", (event: any) => {
        console.log("Status update received:", event.data)
        const statusUpdate: StatusUpdate = {
          id: Date.now().toString(),
          content: event.data,
          timestamp: new Date(),
        }
        toolCalls.push({
          id: statusUpdate.id,
          role: "tool",
          content: statusUpdate.content,
        })
        setStatusUpdates((prev) => [...prev, statusUpdate])
      });
      eventSource.addEventListener("assistantMessageStart", (event: any) => {
        console.log("Assistant message start received:", event.data)
        // Append tool calls to the conversation, and reset them.
        setStatusUpdates([])
      });
      eventSource.addEventListener("assistantMessageDelta", (event: any) => {
        console.log("Assistant message delta received:", event.data)
        const delta = JSON.parse(event.data)
        if (delta) {
          // Update the assistant message in real-time
          assistantMessage += delta
          const realtimeMessages: Message[] = [
            ...updatedMessages,
            ...toolCalls,
            { id: "temp-assistant", role: "assistant", content: assistantMessage },
          ]
          setCurrentConversation((prev) => (prev ? { ...prev, messages: realtimeMessages } : prev))
        }
      });
      eventSource.addEventListener("readystatechange", (event: any) => {
        console.log("Ready state change:", event.data)
        if (event.readyState === 2) {
          console.log("Event stream closed")
        }
      });
      eventSource.addEventListener("assistantMessageEnd", (event: any) => {
        console.log("Assistant message end received:", event.data)
        // Finalize the assistant message
        const finalMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: assistantMessage,
        }
        // Update the conversation with the final assistant message
        setCurrentConversation((prev) => ({
          ...prev!,
          messages: [...updatedMessages, ...toolCalls, finalMessage],
        }))
        eventSource.close() // Close the event source when done
      });
      eventSource.addEventListener("error", (error: any) => {
        console.error("EventSource error:", error)
        // Handle error appropriately
        setIsLoading(false)
        assistantMessage = "Sorry, there was an error processing your request. Please try again."
      });
      eventSource.addEventListener("abort", (event: any) => {
        console.log("EventSource aborted:", event)
        // Handle abort appropriately
      });
      eventSource.stream()

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
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/conversations`, {
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
        // Don't auto-select any conversation
      }
    } catch (error) {
      console.error("Error fetching conversations:", error)
    }
  }

  const loadConversationMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/conversations/${conversationId}`, {
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

  const deleteConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/conversations/${conversationId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!response.ok) throw new Error("Failed to delete conversation")

      // Remove from local state
      setConversations(conversations.filter((conv) => conv.id !== conversationId))

      // If the deleted conversation was the current one, clear it
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null)
        setShowWelcome(true)
      }
    } catch (error) {
      console.error("Error deleting conversation:", error)
      throw error // Re-throw to let the modal handle the error
    }
  }

  const startNewConversation = () => {
    setCurrentConversation(null)
    setStatusUpdates([])
    setShowWelcome(true) // Show welcome message when starting a new conversation
  }

  const selectConversation = (conversationId: string) => {
    const selected = conversations.find((conv) => conv.id === conversationId)
    if (selected) {
      setCurrentConversation(selected)
      setStatusUpdates([])
      setShowWelcome(false) // Hide welcome message when selecting a conversation

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
        onDeleteConversation={deleteConversation}
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

        <main className="flex-1 overflow-y-auto p-4 pb-24 relative">
          {/* Welcome message */}
          {showWelcome && !currentConversation && (
            <div
              className="absolute inset-0 flex items-center justify-center transition-opacity duration-300"
              style={{
                opacity: welcomeFading ? 0 : 1,
                transition: "opacity 300ms ease-in-out",
                pointerEvents: welcomeFading ? "none" : "auto",
              }}
            >
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-4" style={{ color: "#802a25" }}>
                  Welcome to SCU Schedule Helper
                </h2>
                <p className="text-lg text-gray-600 mb-2">How can I assist you with your academic planning today?</p>
                <p className="text-sm text-gray-500">
                  Ask me about course requirements, scheduling, or academic pathways
                </p>
              </div>
            </div>
          )}

          {/* Chat messages - only show when a conversation is selected */}
          {currentConversation && (
            <>
              {(() => {
                const groupedMessages: Array<{ message: Message; toolMessages: Message[] }> = []
                let currentToolMessages: Message[] = []

                currentConversation?.messages.forEach((message) => {
                  if (message.role === "tool") {
                    currentToolMessages.push(message)
                  } else {
                    if (message.role === "assistant" && currentToolMessages.length > 0) {
                      groupedMessages.push({ message, toolMessages: [...currentToolMessages] })
                      currentToolMessages = []
                    } else {
                      groupedMessages.push({ message, toolMessages: [] })
                    }
                  }
                })

                return groupedMessages.map(({ message, toolMessages }) => (
                  <ChatMessage key={message.id} message={message} toolMessages={toolMessages} />
                ))
              })()}

              {/* Inline status updates */}
              {statusUpdates.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-start gap-4">
                    <div className="h-8 w-8 rounded-full bg-[#802a25] flex items-center justify-center">
                      <div className="h-2 w-2 bg-white rounded-full animate-pulse" />
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="space-y-2">
                        {statusUpdates
                          .map((update, index) => (
                            <div key={update.id} className="flex items-center gap-2 text-sm">
                              <div
                                className={`h-2 w-2 rounded-full ${index === statusUpdates.length - 1 ? "bg-[#802a25] animate-pulse" : "bg-gray-400"
                                  }`}
                              />
                              <span className="text-gray-700">{update.content}</span>
                              <span className="text-xs text-gray-500 ml-auto">
                                {update.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div ref={messagesEndRef} />
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

export default function Home() {
  return (
    <ProtectedPage>
      <ChatPage />
    </ProtectedPage>
  )
}
