"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true) // Default to true since middleware handles auth
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const router = useRouter()

  const signOut = async (): Promise<void> => {
    try {
      await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
      })
    } catch (error) {
      console.error("Sign out error:", error)
    } finally {
      setIsAuthenticated(false)
      router.push("/login")
    }
  }

  return <AuthContext.Provider value={{ isAuthenticated, isLoading, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
