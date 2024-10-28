import jwtLib from "jsonwebtoken";
import { createNewUser } from "./user.js";

/**
 *  Get the users information using authorization header. Create a new user if one does not exist.
 */
export async function getUserAuthorizationAndCreateUser(event) {
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
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const personInfo = await response.json();

  if (personInfo.error) {
    return {
      email: null,
      isAuthorized: false,
      authError: `error fetching user info from Google (${personInfo.error_description})`,
    };
  } else if (personInfo.hd != "scu.edu") {
    return {
      email: null,
      isAuthorized: false,
      authError: "invalid Google OAuth token email (not in scu.edu).",
    };
  } else if (!personInfo.email_verified) {
    return {
      email: null,
      isAuthorized: false,
      authError: "invalid Google OAuth token email (email is not verified).",
    };
  } else {
    createNewUser(personInfo.email, personInfo.name, personInfo.picture);
    return { email: personInfo.email, isAuthorized: true, authError: null };
  }
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
