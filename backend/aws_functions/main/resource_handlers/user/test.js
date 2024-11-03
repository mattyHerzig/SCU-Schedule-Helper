import { handleUserRequest } from "./handler.js";

async function test() {
  console.log("Test 1 get user");
  const event = {
    httpMethod: "GET",
  };
  const response = await handleUserRequest(event, null, "swdean");
  console.log(response);

  console.log("\n\nTest 2 invalid method");
  const event2 = {
    httpMethod: "POST",
  };
  const response2 = await handleUserRequest(event2, null, null);
  console.log(response2);
}
test();
