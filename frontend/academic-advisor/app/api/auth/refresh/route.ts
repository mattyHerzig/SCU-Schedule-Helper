import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookies
    const refreshToken = request.cookies.get("refreshToken")?.value

    if (!refreshToken) {
      return NextResponse.json({ message: "No refresh token provided" }, { status: 401 })
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || "default_secret") as jwt.JwtPayload

      if (!decoded || decoded.type !== "refresh") {
        return NextResponse.json({ message: "Invalid token type" }, { status: 401 })
      }

      const userId = decoded.sub as string

      // Generate new access token
      const accessTokenExpDate = new Date(Date.now() + 3600 * 1000) // 1 hour
      const accessToken = jwt.sign({ sub: userId, type: "access" }, process.env.JWT_SECRET || "default_secret", {
        expiresIn: Math.floor((accessTokenExpDate.getTime() - Date.now()) / 1000),
      })

      const response = NextResponse.json({ success: true, userId }, { status: 200 })

      // Set new access token cookie
      response.cookies.set({
        name: "accessToken",
        value: accessToken,
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN,
        expires: accessTokenExpDate,
        path: "/",
      })

      return response
    } catch (error) {
      console.error("Error verifying refresh token:", error)
      return NextResponse.json({ message: "Invalid refresh token" }, { status: 401 })
    }
  } catch (error) {
    console.error("Refresh token error:", error)
    return NextResponse.json({ message: "An error occurred during token refresh" }, { status: 500 })
  }
}
