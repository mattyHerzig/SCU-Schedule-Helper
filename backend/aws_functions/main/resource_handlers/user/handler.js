import { unsupportedMethodError, validResponse } from "../../utils/responses.js";

export async function handleUserRequest(event, context, userId) {
  if (event.httpMethod === "GET") return await handleGetUserRequest(event, context, userId);
  else return unsupportedMethodError("user", event.httpMethod);
}

async function handleGetUserRequest(event, context, userId) {
  return validResponse(`Hello user ${userId}!`);
}
