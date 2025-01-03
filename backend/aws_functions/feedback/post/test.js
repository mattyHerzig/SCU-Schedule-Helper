import { handler } from "./index.js";

async function test() {
  const event = {
    body: JSON.stringify({
      feedbackType: "Feature Request",
      feedbackText: "This is a test.",
      source: "Test",
    }),
  };

  const context = {};

  const response = await handler(event, context);
  console.log(response);
}

test();