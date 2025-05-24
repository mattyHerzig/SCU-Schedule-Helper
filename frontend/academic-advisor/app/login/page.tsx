"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/app/utils/auth"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const nextPath = searchParams.get("next") || "/"

  // Get error and next path from URL
  const errorParam = searchParams.get("error")

  // Set error from URL parameter
  useEffect(() => {
    if (errorParam) {
      setError(decodeURIComponent(errorParam))
    }
  }, [errorParam])

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      router.push(nextPath)
    }
  }, [user, nextPath, router])

  // Handle Google OAuth callback
  useEffect(() => {
    const code = searchParams.get("code")
    if (code) {
      setIsLoading(true)

      // Exchange code for tokens
      fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
        credentials: "include",
      })
        .then((response) => {
          if (response.ok) {
            router.push(nextPath)
          } else {
            return response.json().then((data) => {
              throw new Error(data.message || "Authentication failed")
            })
          }
        })
        .catch((error) => {
          console.error("Login error:", error)
          setError(error.message)
          setIsLoading(false)
        })
    }
  }, [searchParams, nextPath, router])

  const handleGoogleSignIn = () => {
    setIsLoading(true)

    // Construct Google OAuth URL
    const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")

    // Add OAuth parameters
    const params = {
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
      redirect_uri: `${window.location.origin}/login`,
      response_type: "code",
      scope:
        "email profile",
      prompt: "select_account",
      access_type: "offline",
      hd: "scu.edu", // Restrict to SCU domain
      state: nextPath, // Pass the next path as state
    }

    // Add parameters to URL
    Object.entries(params).forEach(([key, value]) => {
      googleAuthUrl.searchParams.append(key, value)
    })

    // Redirect to Google OAuth
    window.location.href = googleAuthUrl.toString()
  }

  // Initial login screen
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-[400px] shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold" style={{ color: "#802a25" }}>
            SCU Schedule Helper
          </CardTitle>
          <CardDescription>Sign in to access your academic advising assistant</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-4 text-center">
            <p className="text-sm text-gray-600 mb-4">Please sign in with your SCU email address (@scu.edu)</p>
            {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
          </div>
          <Button
            className="w-full flex items-center justify-center gap-2"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            style={{ backgroundColor: "#4285F4" }}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path
                  fill="#FFC107"
                  d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                />
                <path
                  fill="#FF3D00"
                  d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                />
                <path
                  fill="#4CAF50"
                  d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
                />
                <path
                  fill="#1976D2"
                  d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                />
              </svg>
            )}
            <span className="ml-2">Sign in with Google</span>
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center border-t p-4">
          <p className="text-xs text-gray-500">Only SCU email addresses (@scu.edu) are permitted</p>
        </CardFooter>
      </Card>
    </div>
  )
}
