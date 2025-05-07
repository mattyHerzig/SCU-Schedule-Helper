import jwtLib from "jsonwebtoken";
import {
  GetAuthTokenResponse,
  OAuthInfo,
  unauthorizedError,
  validResponse,
} from "./model.js";

const ERRORS = {
  NO_AUTH: "no authorization provided.",
  BAD_HEADER:
    "authorization header must provide an issued refresh token or a Google OAuth token.",
  GOOGLE_OAUTH_ERROR: "error fetching your info from Google",
  BAD_EMAIL: "invalid email (not in scu.edu).",
  EMAIL_NOT_VERIFIED: "invalid email (email is not verified).",
  BAD_REFRESH_TOKEN: "could not verify refresh token",
  INVALID_TOKEN_TYPE:
    "invalid token type (provided access token, expected refresh token)",
};

export async function handler(event, context) {
  const userAuthorization = await getUserAuthorization(event);
  if (userAuthorization.userId == null)
    return unauthorizedError(userAuthorization.authError);
  else {
    let accessToken = generateDataAccessToken(
      userAuthorization.userId,
    );
    let accessTokenExpDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 6.5);
    let refreshToken = tokenResponse.refreshToken = generateRefreshToken(
      userAuthorization.userId,
    );
    return validResponse(tokenResponse, accessToken, accessTokenExpDate);
  }
}

async function getUserAuthorization(event) {
  if (!event?.multiValueHeaders?.cookie && !event?.queryStringParameters?.code)
    return { authError: ERRORS.NO_AUTH };
  if(event?.queryStringParameters?.code) {
    const code = event.queryStringParameters.code;
    return verifyGoogleOAuthToken(code);
  }
  const authType = authorizationHeader.split(" ")[0];
  if (
    authorizationHeader.split(" ").length !== 2 ||
    !["OAuth", "Bearer"].includes(authType)
  ) {
    return {
      authError: ERRORS.BAD_HEADER,
    };
  }
  else if (authType === "Bearer")
    return verifyRefreshToken(authorizationHeader.split(" ")[1]);
}

async function verifyGoogleOAuthToken(code) {
  try {
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${code}`,
        },
    );
    const personInfo = await response.json();

    if (personInfo.error) {
      return {
        authError: `${ERRORS.GOOGLE_OAUTH_ERROR} (${personInfo.error_description})`,
      };
    } else if (personInfo.hd != "scu.edu") {
      return {
        authError: ERRORS.BAD_EMAIL,
      };
    } else if (!personInfo.email_verified) {
      return {
        authError: ERRORS.EMAIL_NOT_VERIFIED,
      };
    } else {
      return {
        userId: personInfo.email.split("@")[0],
        oAuthInfo: new OAuthInfo(
          personInfo.email,
          personInfo.name,
          personInfo.picture,
        ),
      };
    }
  } catch (error) {
    console.error("INTERNAL: Error fetching Google info:", error);
    return {
      authError: `${ERRORS.GOOGLE_OAUTH_ERROR}, please try again.`,
    };
  }
}

function generateDataAccessToken(userId) {
  return jwtLib.sign({ sub: userId, type: "access" }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
}

function generateRefreshToken(userId) {
  // Refresh token does not expire.
  return jwtLib.sign({ sub: userId, type: "refresh" }, process.env.JWT_SECRET,);
}