import { handler } from "./index.js";

const JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlc2FydG9yeSIsInR5cGUiOiJhY2Nlc3MifQ.zhZ5RuK-Hy6bM8HQZjijxDxJBrQYpLL48AbSj8t32D8";

async function runTest() {
  const event = {
    requestContext: {
      http: {
        method: "DELETE",
      },
    },
    headers: {
      authorization: `Bearer ${JWT}`,
    },
  };

  try {
    const response = await handler(event, null);
    console.log("Delete User Result:", response);
  } catch (error) {
    console.error("Error during deleteUser:", error);
  }
}
runTest();
