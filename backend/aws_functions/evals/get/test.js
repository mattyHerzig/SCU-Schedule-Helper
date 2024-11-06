import { handler } from "./index.js";
import { getDataExpirationDate } from "./utils/dates.js";

async function test() {
  console.log("Test 1 get evals");
  const event = {
    requestContext: {
      http: {
        method: "GET",
      },
    },
    headers: {
      authorization: `Bearer ${process.env.TEST_ACCESS_JWT}`,
    },
  };
  const response = await handler(event, null, null);
  console.log(response);

  console.log("Test data next available date");
  console.log(getDataExpirationDate());
}

await test();
