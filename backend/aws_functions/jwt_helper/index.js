import { execSync } from "child_process";
import os from "os";
import jsonwebtoken from "jsonwebtoken";

function main() {
  // parse args from command line
  const args = process.argv.slice(2);
  if (args.length !== 2) {
    console.error(
      "Usage: node --env-file=path/to/.env index.js <userId> <type>",
    );
    process.exit(1);
  }
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET not found in .env file");
    process.exit(1);
  }
  const userId = args[0];
  const type = args[1];
  if (type !== "access" && type !== "refresh") {
    console.warn(
      `Warning: type must be either 'access' or 'refresh' for proper API usage`,
    );
  }
  const jwt = makeJwt(userId, type);
  console.log(jwt);
  // Copy to clipboard
  if (os.type() === "Windows_NT") {
    execSync(`echo ${jwt} | clip`);
    console.log("JWT copied to clipboard!");
  }
  if (os.type() === "Darwin") {
    execSync(`echo ${jwt} | pbcopy`);
    console.log("JWT copied to clipboard!");
  }
  if (os.type() === "Linux") {
    execSync(`echo ${jwt} | xclip -selection clipboard`);
    console.log("JWT copied to clipboard!");
  }
  process.exit(0);
}

function makeJwt(userId, type) {
  return jsonwebtoken.sign({ sub: userId, type }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

main();
