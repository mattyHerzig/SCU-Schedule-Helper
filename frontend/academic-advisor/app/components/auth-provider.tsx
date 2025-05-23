"use client"

import { createContext, useContext, type ReactNode } from "react"
import { useAuth as useAuthHook } from "@/app/utils/auth"

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  userId: string | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuthHook()
  const isAuthenticated = !!user

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading: loading,
        userId: user?.userId || null,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
