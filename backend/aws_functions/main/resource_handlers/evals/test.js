import { handleEvalsRequest } from "./handler.js";

async function test() {
  console.log("Test 1 get evals");
  const event = {
    httpMethod: "GET",
  };
  const response = await handleEvalsRequest(event, null, null);
  console.log(response);

  console.log("\n\nTest 2 invalid method");
  const event2 = {
    httpMethod: "POST",
  };
  const response2 = await handleEvalsRequest(event2, null, null);
  console.log(response2);
}
test();
