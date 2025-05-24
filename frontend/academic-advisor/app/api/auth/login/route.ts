import { type NextRequest, NextResponse } from "next/server"
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb"
import jwt from "jsonwebtoken"
import { decode } from "he"

// Initialize DynamoDB client
const ddbClient = new DynamoDBClient({
  region: process.env.AMZ_DDB_REGION || "us-west-1",
  credentials: {
    accessKeyId: process.env.AMZ_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AMZ_SECRET_ACCESS_KEY || "",
  }
})

// Error messages
const ERRORS = {
  NO_AUTH: "No form of authorization provided",
  GOOGLE_OAUTH_ERROR: "Error fetching your info from Google",
  BAD_SCOPES: "You must grant permission to all the scopes requested",
  BAD_EMAIL: "Invalid email (not in scu.edu)",
  EMAIL_NOT_VERIFIED: "Email is not verified",
}

// OAuthInfo class to store user information
interface OAuthInfo {
  email: string
  name: string
  photoUrl: string
  refreshTokenExpirationDate: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = body

    if (!code) {
      return NextResponse.json({ message: ERRORS.NO_AUTH }, { status: 401 })
    }

    // Exchange code for tokens
    const authResult = await verifyAndStoreGoogleOAuthToken(code)

    if (!authResult.userId) {
      return NextResponse.json({ message: authResult.authError }, { status: 401 })
    }

    // Generate tokens
    const accessTokenExpDate = new Date(Date.now() + 3600 * 1000) // 1 hour
    const accessToken = generateDataAccessToken(authResult.userId, accessTokenExpDate)

    const response = NextResponse.json({ success: true, userId: authResult.userId }, { status: 200 })

    // Set access token cookie
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

    // If we have OAuth info, set refresh token cookie
    if (authResult.oAuthInfo) {
      const refreshTokenExpDate = new Date(authResult.oAuthInfo.refreshTokenExpirationDate)
      const refreshToken = generateRefreshToken(authResult.userId, refreshTokenExpDate)

      response.cookies.set({
        name: "refreshToken",
        value: refreshToken,
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN,
        expires: refreshTokenExpDate,
        path: "/",
      })
    }

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ message: "An error occurred during login" }, { status: 500 })
  }
}

// Verify and store Google OAuth token
async function verifyAndStoreGoogleOAuthToken(code: string) {
  try {
    // Exchange code for tokens
    const tokenUrl = new URL("https://www.googleapis.com/oauth2/v4/token")
    tokenUrl.searchParams.append("code", code)
    tokenUrl.searchParams.append("client_id", process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "")
    tokenUrl.searchParams.append("client_secret", process.env.GOOGLE_CLIENT_SECRET || "")
    tokenUrl.searchParams.append("redirect_uri", process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || "")
    tokenUrl.searchParams.append("grant_type", "authorization_code")

    const response = await fetch(tokenUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    })

    const tokenResponse = await response.json()

    if (tokenResponse.error || response.status !== 200) {
      console.error("Error fetching tokens:", tokenResponse)
      const decodedError = decode(tokenResponse.error_description || "unknown error")
      return {
        userId: null,
        oAuthInfo: null,
        authError: `${ERRORS.GOOGLE_OAUTH_ERROR} (${decodedError})`,
      }
    }

    const accessToken = tokenResponse.access_token
    const refreshToken = tokenResponse.refresh_token || ""
    const accessTokenExpDate = new Date(Date.now() + tokenResponse.expires_in * 1000)
    const refreshTokenExpDate = new Date(
      Date.now() + (tokenResponse.refresh_token_expires_in || 7 * 24 * 60 * 60) * 1000,
    )

    // Verify scopes
    if (tokenResponse.scope) {
      const scopes = tokenResponse.scope.split(" ")
      if (
        !scopes.includes("https://www.googleapis.com/auth/cloud-platform") ||
        !scopes.includes("https://www.googleapis.com/auth/generative-language.retriever")
      ) {
        return {
          userId: null,
          oAuthInfo: null,
          authError: `${ERRORS.BAD_SCOPES}`,
        }
      }
    }

    return await storeOAuthToken(accessToken, refreshToken, accessTokenExpDate, refreshTokenExpDate)
  } catch (error) {
    console.error("Error in OAuth verification:", error)
    return {
      userId: null,
      oAuthInfo: null,
      authError: `${ERRORS.GOOGLE_OAUTH_ERROR}, please try again.`,
    }
  }
}

// Store OAuth token and user info
async function storeOAuthToken(
  accessToken: string,
  refreshToken: string,
  accessTokenExpDate: Date,
  refreshTokenExpDate: Date,
) {
  try {
    // Fetch user info from Google
    const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const personInfo = await response.json()

    if (personInfo.error) {
      const decodedError = decode(personInfo.error_description || "unknown error")
      return {
        userId: null,
        oAuthInfo: null,
        authError: `${ERRORS.GOOGLE_OAUTH_ERROR} (${decodedError})`,
      }
    } else if (personInfo.hd !== "scu.edu") {
      return {
        userId: null,
        oAuthInfo: null,
        authError: ERRORS.BAD_EMAIL,
      }
    } else if (!personInfo.email_verified) {
      return {
        userId: null,
        oAuthInfo: null,
        authError: ERRORS.EMAIL_NOT_VERIFIED,
      }
    } else {
      const userId = personInfo.email.split("@")[0]

      const oauthTokensItem = {
        pk: { S: `u#${userId}` },
        sk: { S: "oauth#google#tokens" },
        accessToken: { S: accessToken },
        refreshToken: { S: refreshToken },
        accessTokenExpDate: { S: accessTokenExpDate.toISOString() },
        refreshTokenExpDate: { S: refreshTokenExpDate.toISOString() },
        ttl: { N: `${Math.floor(refreshTokenExpDate.getTime() / 1000)}` },
      }

      try {
        const putItemCommand = new PutItemCommand({
          TableName: process.env.SCU_SCHEDULE_HELPER_TABLE_NAME || "scu-schedule-helper",
          Item: oauthTokensItem,
        })

        const putItemResponse = await ddbClient.send(putItemCommand)

        if (putItemResponse.$metadata.httpStatusCode !== 200) {
          console.error("Error storing tokens in DynamoDB:", putItemResponse)
          throw new Error(
            `Error storing OAuth tokens in DynamoDB (received HTTP status code from DynamoDB: ${putItemResponse.$metadata.httpStatusCode}).`,
          )
        }

        return {
          userId,
          oAuthInfo: {
            email: personInfo.email,
            name: personInfo.name,
            photoUrl: personInfo.picture,
            refreshTokenExpirationDate: refreshTokenExpDate.toISOString(),
          } as OAuthInfo,
          authError: null,
        }
      } catch (dbError) {
        console.error("DynamoDB error:", dbError)
        return {
          userId: null,
          oAuthInfo: null,
          authError: `Error storing authentication data: ${dbError.message}`,
        }
      }
    }
  } catch (error) {
    console.error("Error fetching Google info:", error)
    return {
      userId: null,
      oAuthInfo: null,
      authError: `${ERRORS.GOOGLE_OAUTH_ERROR}, please try again.`,
    }
  }
}

// Generate access token
function generateDataAccessToken(userId: string, expDate: Date) {
  return jwt.sign({ sub: userId, type: "access" }, process.env.JWT_SECRET || "default_secret", {
    expiresIn: Math.floor((expDate.getTime() - Date.now()) / 1000),
  })
}

// Generate refresh token
function generateRefreshToken(userId: string, expDate: Date) {
  return jwt.sign({ sub: userId, type: "refresh" }, process.env.JWT_SECRET || "default_secret", {
    expiresIn: Math.floor((expDate.getTime() - Date.now()) / 1000),
  })
}
