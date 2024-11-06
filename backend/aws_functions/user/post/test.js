import { handler } from "./index.js";
import fs from "fs";

async function test() {
  console.log("Test 1 post user");
  const testImagePath = "./utils/test.jpg";
  const testImage = fs.readFileSync(testImagePath);
  const event = {
    requestContext: {
      http: {
        method: "POST",
      },
    },
    headers: {
      authorization: `Bearer ${process.env.TEST_ACCESS_JWT}`,
    },
    body: {
      name: "John Doe",
      photo: testImage.toString("base64"),
      notification_id: "1234567890",
    },
  };
  const response = await handler(event, null);
  console.log(response);
}
test();
