import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const response = NextResponse.json(null)

  // Clear auth cookies
  response.cookies.set({
    name: "accessToken",
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN,
    expires: new Date(0),
    path: "/",
  })

  response.cookies.set({
    name: "refreshToken",
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN,
    expires: new Date(0),
    path: "/",
  })

  return response
}
