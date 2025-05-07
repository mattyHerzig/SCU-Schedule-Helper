import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // For demo purposes, we're turning off auth verification
  // Just pass through all requests
  return NextResponse.next()

  // Original auth verification code (commented out for demo)
  /*
  // Skip auth check for login page and API routes
  if (request.nextUrl.pathname.startsWith("/login") || request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next()
  }

  try {
    // Check authentication status
    const authCheckResponse = await fetch("http://localhost:3000/auth", {
      headers: {
        Cookie: request.headers.get("cookie") || "",
      },
    })

    // If authenticated, proceed
    if (authCheckResponse.ok) {
      return NextResponse.next()
    }

    // If not authenticated (401), redirect to login
    if (authCheckResponse.status === 401) {
      const loginUrl = new URL("/login", request.url)
      return NextResponse.redirect(loginUrl)
    }

    // For other errors, also redirect to login
    const loginUrl = new URL("/login", request.url)
    return NextResponse.redirect(loginUrl)
  } catch (error) {
    console.error("Auth check error:", error)
    // On error, redirect to login
    const loginUrl = new URL("/login", request.url)
    return NextResponse.redirect(loginUrl)
  }
  */
}

// Configure middleware to run on specific paths
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
