import { OAuth2Client } from "google-auth-library";
import jwtLib from "jsonwebtoken";

const oAuth2Client = new OAuth2Client();

export async function getUserAuthorization(event) {
  if (!event || !event.headers || !event.headers.authorization)
    return { email: null, isAuthorized: false, authError: "No authorization header provided." };
  const authorizationHeader = event.headers.authorization;
  const authType = authorizationHeader.split(" ")[0];
  if (authType === "OAuth") return await verifyGoogleOAuthToken(authorizationHeader.split(" ")[1]);
  else if (authType === "Bearer") return await verifySignedJwt(authorizationHeader.split(" ")[1]);
  else
    return {
      email: null,
      isAuthorized: false,
      authError:
        "Authorization header must provide an issued access token or a Google OAuth token.",
    };
}

export function generateDataAccessToken(email) {
  return jwtLib.sign({ email }, process.env.JWT_SECRET, { expiresIn: "1y" });
}

async function verifyGoogleOAuthToken(accessToken) {
  const tokenInfo = await oAuth2Client.getTokenInfo(accessToken);
  if (!tokenInfo || !tokenInfo.email || !tokenInfo.aud) {
    return { email: null, isAuthorized: false, authError: "invalid Google OAuth token." };
  } else if (tokenInfo.aud != process.env.GOOGLE_OAUTH2_CLIENT_ID) {
    return { email: null, isAuthorized: false, authError: "invalid Google OAuth token audience." };
  } else if (!tokenInfo.email.split("@")[1].includes("scu.edu")) {
    return {
      email: null,
      isAuthorized: false,
      authError: "invalid Google OAuth token email (not in scu.edu).",
    };
  } else if (!tokenInfo.email_verified) {
    return {
      email: null,
      isAuthorized: false,
      authError: "invalid Google OAuth token email (email is not verified).",
    };
  } else return { email: tokenInfo.email, isAuthorized: true, authError: null };
}

async function verifySignedJwt(jwt) {
  try {
    const verifiedJwt = jwtLib.verify(jwt, process.env.JWT_SECRET);
    return { email: verifiedJwt.email, isAuthorized: true, authError: null };
  } catch (error) {
    return {
      email: null,
      isAuthorized: false,
      authError: `could not verify JWT (${error}).`,
    };
  }
}
