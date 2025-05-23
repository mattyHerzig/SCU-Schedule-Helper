"use client"

import React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface AuthCheckOptions {
  redirectTo?: string
  redirectIfFound?: boolean
}

export function useAuth() {
  const [user, setUser] = useState<{ userId: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch("/api/auth/check", {
          method: "GET",
          credentials: "include",
        })

        if (response.ok) {
          const data = await response.json()
          setUser(data)
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error("Auth check error:", error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  async function signOut() {
    try {
      await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
      })
      setUser(null)
      router.push("/login")
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }

  async function refreshToken() {
    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data)
        return true
      } else {
        setUser(null)
        return false
      }
    } catch (error) {
      console.error("Token refresh error:", error)
      setUser(null)
      return false
    }
  }

  return { user, loading, signOut, refreshToken }
}

export function withAuth(Component: React.ComponentType<any>, options: AuthCheckOptions = {}) {
  return function AuthenticatedComponent(props: any) {
    const { user, loading } = useAuth()
    const router = useRouter()
    const { redirectTo = "/login", redirectIfFound = false } = options

    useEffect(() => {
      if (!loading) {
        if (
          // If redirectIfFound is false, redirect if user is not found
          (!redirectIfFound && !user) ||
          // If redirectIfFound is true, redirect if user is found
          (redirectIfFound && user)
        ) {
          router.push(redirectTo)
        }
      }
    }, [user, loading, redirectIfFound, redirectTo, router])

    if (loading) {
      return <div>Loading...</div>
    }

    if ((!redirectIfFound && !user) || (redirectIfFound && user)) {
      return null
    }

    return <Component {...props} user={user} />
  }
}
