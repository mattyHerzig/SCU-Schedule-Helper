import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"

export async function GET(request: NextRequest) {
  try {
    // Get access token from cookies
    const accessToken = request.cookies.get("accessToken")?.value

    if (!accessToken) {
      // Try to refresh using refresh token
      const refreshToken = request.cookies.get("refreshToken")?.value

      if (!refreshToken) {
        return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
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
        const newAccessToken = jwt.sign({ sub: userId, type: "access" }, process.env.JWT_SECRET || "default_secret", {
          expiresIn: Math.floor((accessTokenExpDate.getTime() - Date.now()) / 1000),
        })

        const response = NextResponse.json({ userId }, { status: 200 })

        // Set new access token cookie
        response.cookies.set({
          name: "accessToken",
          value: newAccessToken,
          httpOnly: true,
          secure: true,
          sameSite: "strict",
          expires: accessTokenExpDate,
          path: "/",
        })

        return response
      } catch (error) {
        console.error("Error verifying refresh token:", error)
        return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
      }
    }

    try {
      // Verify access token
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET || "default_secret") as jwt.JwtPayload

      if (!decoded || decoded.type !== "access") {
        return NextResponse.json({ message: "Invalid token type" }, { status: 401 })
      }

      const userId = decoded.sub as string

      return NextResponse.json({ userId }, { status: 200 })
    } catch (error) {
      console.error("Error verifying access token:", error)

      // Try to refresh using refresh token
      const refreshToken = request.cookies.get("refreshToken")?.value

      if (!refreshToken) {
        return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
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
        const newAccessToken = jwt.sign({ sub: userId, type: "access" }, process.env.JWT_SECRET || "default_secret", {
          expiresIn: Math.floor((accessTokenExpDate.getTime() - Date.now()) / 1000),
        })

        const response = NextResponse.json({ userId }, { status: 200 })

        // Set new access token cookie
        response.cookies.set({
          name: "accessToken",
          value: newAccessToken,
          httpOnly: true,
          secure: true,
          sameSite: "strict",
          expires: accessTokenExpDate,
          path: "/",
        })

        return response
      } catch (refreshError) {
        console.error("Error verifying refresh token:", refreshError)
        return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
      }
    }
  } catch (error) {
    console.error("Auth check error:", error)
    return NextResponse.json({ message: "An error occurred during authentication check" }, { status: 500 })
  }
}
