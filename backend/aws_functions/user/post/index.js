import { validResponse } from "./model.js";
import { handleWithAuthorization } from "./utils/authorization.js";

export async function handler(event, context) {
  return await handleWithAuthorization(event, context, handlePostUserRequest);
}

async function handlePostUserRequest(event, context, userId) {
  return validResponse(`Hello user ${userId}!`);
}
