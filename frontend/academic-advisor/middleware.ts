import {  NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import he from "he"
import {
  DynamoDBClient,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";

// Error messages
const ERRORS = {
  NO_AUTH: "no form of authorization provided.",
  BAD_COOKIES: "cookies must contain an issued refresh token.",
  GOOGLE_OAUTH_ERROR: "error fetching your info from Google",
  BAD_SCOPES: "you must grant permission to all the scopes requested.",
  BAD_EMAIL: "invalid email (not in scu.edu).",
  EMAIL_NOT_VERIFIED: "invalid email (email is not verified).",
  BAD_REFRESH_TOKEN: "could not verify refresh token",
  INVALID_TOKEN_TYPE: "invalid token type (provided access token, expected refresh token)",
}

// OAuthInfo class to store user information
class OAuthInfo {
  email: string
  name: string
  photoUrl: string
  refreshTokenExpirationDate: string

  constructor(email: string, name: string, photoUrl: string, refreshTokenExpirationDate: string) {
    this.email = email
    this.name = name
    this.photoUrl = photoUrl
    this.refreshTokenExpirationDate = refreshTokenExpirationDate
  }
}


const ddbRegion = process.env.AWS_DDB_REGION;
const dynamoDBClient = new DynamoDBClient({
  region: ddbRegion,
  maxAttempts: 5,
  retryMode: "standard",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
});

// Main middleware function
export async function middleware(request: NextRequest) {
  // Skip auth check for login page and public assets
  if (
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/favicon.ico") ||
    request.nextUrl.pathname.startsWith("/api/auth/signout")
    || (
      request.nextUrl.pathname.startsWith("/login") && !(request.nextUrl.searchParams.has("code") || request.cookies.get("refreshToken"))
    )) {
    return NextResponse.next()
  }

  // For all other routes, verify authentication
  const userAuth = await getUserAuthorization(request)

  if (userAuth.userId === null) {
    // Redirect to login if not authenticated
    const decodedError = he.decode(userAuth.authError)
    let loginUrl = new URL("/login", request.url)
    if (decodedError) {
      loginUrl = new URL(`/login?error=${encodeURIComponent(decodedError)}`, request.url)
    }
    return NextResponse.redirect(loginUrl)
  }

  // Set cookies for access and refresh tokens
  const accessToken = generateDataAccessToken(userAuth.userId, new Date(Date.now() + 60 * 60 * 1000))

  let response = NextResponse.next();
  // If next page is login, redirect to home
  if (request.nextUrl.pathname.startsWith("/login")) {
    console.log("Redirecting to home page after login")
    const nextUrl = new URL("/", request.url)
    response = new NextResponse(`<!DOCTYPE html><html><head><title>Redirecting...</title></head><body><script>window.location.href = "${nextUrl.toString()}";</script></body></html>`, {
      status: 200,
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      }
    });
  }

  response.cookies.set("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
  });

  if (userAuth.oAuthInfo) {
    const refreshToken = generateRefreshToken(userAuth.userId, new Date(userAuth.oAuthInfo?.refreshTokenExpirationDate || Date.now() + 7 * 24 * 60 * 60 * 1000))

    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: new Date(userAuth.oAuthInfo.refreshTokenExpirationDate),
    });
  }

    // Add user ID header to the request for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const userId = userAuth.userId
    const requestWithUserId = request.clone();
    requestWithUserId.headers.set("User-ID", userId)

    return NextResponse.next({
      request: requestWithUserId,
    })
  }

  return response;
}

// Get user authorization from request
async function getUserAuthorization(request: NextRequest) {
  // Check for code in query parameters (OAuth callback)
  const url = new URL(request.url)
  const code = url.searchParams.get("code")

  if (code) {
    return verifyAndStoreGoogleOAuthToken(code)
  }
  // Check for refresh token
  const refreshToken = request.cookies.get("refreshToken")?.value

  if (!refreshToken) {
    // Don't show an error, just redirect to login.
    return { userId: null, oAuthInfo: null, authError: "", }
  }
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || "default_secret") as jwt.JwtPayload
    if (!decoded || decoded.type !== "refresh") {
      return {
        userId: null,
        oAuthInfo: null,
        authError: ERRORS.INVALID_TOKEN_TYPE
      }
    }

    return {
      userId: decoded.sub as string,
      oAuthInfo: null,
      authError: null,
    }
  } catch (error) {
    console.error("Error verifying refresh token:", error)
    return {
      userId: null,
      oAuthInfo: null,
      authError: ERRORS.BAD_REFRESH_TOKEN
    }
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
    tokenUrl.searchParams.append("redirect_uri", "http://localhost:3000/login")
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
      return {
        userId: null,
        oAuthInfo: null,
        authError: `${ERRORS.GOOGLE_OAUTH_ERROR} (${tokenResponse.error_description || "unknown error"})`,
      }
    }

    const accessToken = tokenResponse.access_token
    const refreshToken = tokenResponse.refresh_token
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
      return {
        userId: null,
        oAuthInfo: null,
        authError: `${ERRORS.GOOGLE_OAUTH_ERROR} (${personInfo.error_description})`,
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
      const userId = personInfo.email.split("@")[0] as string

      await storeUserTokens(userId, {
        accessToken,
        refreshToken,
        accessTokenExpDate: accessTokenExpDate,
        refreshTokenExpDate: refreshTokenExpDate,
      })

      return {
        userId,
        oAuthInfo: new OAuthInfo(
          personInfo.email,
          personInfo.name,
          personInfo.picture,
          refreshTokenExpDate.toISOString(),
        ),
        authError: null,
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

// Store user tokens (replace with your database implementation)
async function storeUserTokens(userId: string, tokens: any) {
  const oauthTokensItem = {
    pk: { S: `u#${userId}` },
    sk: { S: "oauth#google#tokens" },
    accessToken: { S: tokens.accessToken },
    refreshToken: { S: tokens.refreshToken || "testing" },
    accessTokenExpDate: { S: tokens.accessTokenExpDate.toISOString() },
    refreshTokenExpDate: { S: tokens.refreshTokenExpDate.toISOString() },
    ttl: { N: `${Math.floor(tokens.refreshTokenExpDate.getTime() / 1000)}` },
  }

  const putItemCommand = new PutItemCommand({
    TableName: process.env.SCU_SCHEDULE_HELPER_TABLE_NAME,
    Item: oauthTokensItem,
  });
  const putItemResponse = await dynamoDBClient.send(putItemCommand);
  if (putItemResponse.$metadata.httpStatusCode !== 200) {
    throw new Error(
      `error storing OAuth tokens in DynamoDB (received HTTP status code from DynamoDB: ${putItemResponse.$metadata.httpStatusCode}).`,
    );
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

// Create unauthorized response
function unauthorizedResponse(message: string) {
  return NextResponse.json(
    {
      message: `Authorization failed: ${message}`,
    },
    { status: 401 },
  )
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
  runtime: "nodejs"
}
