import { handler } from "./index.js";

async function test() {
  console.log("Test 1 post user");
  const event = {
    requestContext: {
      http: {
        method: "POST",
      },
    },
    headers: {
      authorization: "Bearer <access_token>",
    },
  };
  const response = await handler(event, null);
  console.log(response);
}
test();
