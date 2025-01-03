import fs from "fs";

const apiDocs = fs.readFileSync("generated_docs.html");

export const defaultResponse = {
  statusCode: 200,
  headers: {
    "Content-Type": "text/html",
  },
  body: apiDocs.toString(),
};

export function unsupportedMethodError(resource, method) {
  return {
    statusCode: 405,
    body: JSON.stringify({
      message: `Resource "${resource}" does not support the ${method} method.`,
    }),
  };
}
