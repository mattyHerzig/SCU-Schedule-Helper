import { defaultResponse, resourceNotFoundError, unsupportedMethodError } from "./utils/responses";
import { handleAuthTokenRequest } from "./resource_handlers/auth_token/handler.js";
import { handleEvalsRequest } from "./resource_handlers/evals/handler.js";
import { handleUserRequest } from "./resource_handlers/user/handler.js";
import { handleWithAuthorization } from "./utils/authorization.js";

export async function handler(event, context) {
  console.log("Received event:", event);
  if (event.path === "/") {
    if (event.httpMethod === "GET") return defaultResponse;
    else return unsupportedMethodError("/", event.httpMethod);
  }

  const topLevelResource = event.path.split("/")[0];

  if (topLevelResource === "auth_token") {
    return await handleAuthTokenRequest(event, context);
  }
  return await handleWithAuthorization(event, context, handleLoggedInRequest);
}

async function handleLoggedInRequest(event, context, userId) {
  if (topLevelResource === "evals") {
    return await handleEvalsRequest(event, context, userId);
  }
  if (topLevelResource === "user") {
    return await handleUserRequest(event, context, userId);
  }

  return resourceNotFoundError(topLevelResource);
}
