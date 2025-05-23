"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/utils/auth"
import { Loader2 } from "lucide-react"

interface ProtectedPageProps {
  children: React.ReactNode
}

export default function ProtectedPage({ children }: ProtectedPageProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user?.userId) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`)
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#802a25" }} />
      </div>
    )
  }

  if (!user?.userId) {
    return null
  }

  return <>{children}</>
}
