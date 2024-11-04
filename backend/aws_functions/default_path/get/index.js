import { defaultResponse, unsupportedMethodError } from "./model.js";

export async function handler(event, context) {
  if (event.requestContext.http.method === "GET") return defaultResponse;
  else return unsupportedMethodError(path, event.requestContext.http.method);
}
