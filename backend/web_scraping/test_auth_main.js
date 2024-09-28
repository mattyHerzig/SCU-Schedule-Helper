import { authenticate } from "./utils/authentication.js";

async function main() {
  const username = process.env.SCU_USERNAME;
  const password = process.env.SCU_PASSWORD;

  await authenticate(username, password);
}

main();
