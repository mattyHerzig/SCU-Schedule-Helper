"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  checkAuth: () => Promise<boolean>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const router = useRouter()

  const checkAuth = async (): Promise<boolean> => {
    try {
      const response = await fetch("http://localhost:3000/auth", {
        credentials: "include",
      })

      const isAuthed = response.status === 204
      setIsAuthenticated(isAuthed)
      return isAuthed
    } catch (error) {
      console.error("Auth check error:", error)
      setIsAuthenticated(false)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = async (): Promise<void> => {
    try {
      await fetch("http://localhost:3000/auth/signout", {
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

  useEffect(() => {
    checkAuth()
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, checkAuth, signOut }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
