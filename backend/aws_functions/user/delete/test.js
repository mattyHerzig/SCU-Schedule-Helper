import { handler } from "./index.js";

async function runTest() {
  const event = {
    requestContext: {
      http: {
        method: "DELETE",
      },
    },
    headers: {
      authorization: `Bearer ${process.env.TEST_ACCESS_JWT}`,
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
