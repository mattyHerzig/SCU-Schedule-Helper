import { unauthorizedError } from "../model.js";
import jwtLib from "jsonwebtoken";

const ERRORS = {
  NO_HEADER: "no authorization header provided.",
  BAD_HEADER: "authorization header must provide an issued access token.",
  INVALID_TOKEN_TYPE: "invalid token type (expected access token)",
  BAD_ACCESS_TOKEN: "could not verify access token",
};

export async function handleWithAuthAndCors(event, context, handler) {
  const userAuthorization = getUserAuthorization(event);
  if (!userAuthorization.userId)
    return unauthorizedError(userAuthorization.authError);
  const response = await handler(event, context, userAuthorization.userId);
  console.log(JSON.stringify(event, null, 2));
  const origin = event.headers.origin || "";
  const allowed = [
    "chrome-extension://feinilelhamnodbmhjhacnajbbhapdhj",
    "https://chat-dev.scu-schedule-helper.me",
    "https://chat.scu-schedule-helper.me",
    "https://www.scu-schedule-helper.me",
    "https://scu-schedule-helper.me"
  ];
  return {
    ...response,
    headers: {
      ...response.headers,
      "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : "",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        event.headers["access-control-request-headers"] || "authorization,content-type",
      "Access-Control-Allow-Credentials": "true",
    },
  }
}

function getUserAuthorization(event) {
  if (!event || !event.headers || !event.headers.authorization)
    return { authError: ERRORS.NO_HEADER };
  const authorizationHeader = event.headers.authorization;
  const authType = authorizationHeader.split(" ")[0];
  if (authorizationHeader.split(" ").length !== 2 || !authType == "Bearer") {
    return {
      authError: ERRORS.BAD_HEADER,
    };
  }
  return verifyAccessToken(authorizationHeader.split(" ")[1]);
}

function verifyAccessToken(accessToken) {
  try {
    const token = jwtLib.verify(accessToken, process.env.JWT_SECRET);
    if (token.type !== "access") {
      return {
        authError: ERRORS.INVALID_TOKEN_TYPE,
      };
    }
    return { userId: token.sub };
  } catch (error) {
    return {
      authError: `${ERRORS.BAD_ACCESS_TOKEN} (${error}).`,
    };
  }
}
