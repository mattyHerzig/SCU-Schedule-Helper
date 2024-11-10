import puppeteer from "puppeteer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";

const s3 = new S3Client({
  region: process.env.AWS_DEFAULT_REGION,
});
const MAX_LOGIN_TRIES = 5;

export async function authenticate(username, password) {
  const loginButton = "button::-p-text(Login)";
  const browser = await puppeteer.launch({ args: ["--incognito"] });
  const page = await browser.newPage();
  const recorder = await page.screencast({ path: "auth.webm" });

  console.log("Starting authentication...");
  await page.goto("https://scu.edu/apps/evaluations");
  await page.waitForNetworkIdle();

  // Fill username and password.
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);

  console.log(`Attemping to login user ${username}`);
  await page.tap(loginButton);
  await page.waitForNetworkIdle();

  let loginTries = 0;
  let needMobileApproval = page.url().includes("duosecurity");
  while (needMobileApproval && loginTries < MAX_LOGIN_TRIES) {
    try {
      loginTries++;
      console.log("***************************ACTION REQUIRED***************************");
      console.log("Mobile request sent for authentication. Please approve on your phone.");
      // Press other options, in case the user isn't using mobile push.
      const otherOptionsButton = await page.waitForSelector("::-p-text(Other options)");
      await otherOptionsButton.tap();
      // Wait for the Duo Push button to appear, and tap it.
      const duoPushButton = await page.waitForSelector("::-p-text(Duo Push)");
      await duoPushButton.tap();
      // If there is a verification code, log it.
      const verificationCodeDiv = await page.$(".verification-code");
      if (verificationCodeDiv) {
        const verificationCode = await verificationCodeDiv.evaluate((node) => node.textContent);
        console.log(`Use verification code: ${verificationCode}`);
      }
      // Wait for the Yes, this is my device button to appear (i.e. the user has approved the push).
      const buttonToTap = await page.waitForSelector(
        "button::-p-text(Yes, this is my device), button::-p-text(Try again)",
        { timeout: 65000 }
      );
      needMobileApproval = await buttonToTap.evaluate((node) => node.textContent === "Try again");
      await buttonToTap.tap();
      if (!needMobileApproval) {
        await page.waitForRequest((request) => request.url().includes("scu.edu"));
      } else {
        console.log("Mobile request not approved. Retrying...");
        await page.waitForSelector("::-p-text(Other options)");
      }
    } catch (error) {
      console.error(`Error during mobile approval: ${error}`);
      await recorder.stop();
      uploadRecordingToS3();
    }
  }
  await recorder.stop();
  await uploadRecordingToS3();
  if (loginTries >= MAX_LOGIN_TRIES) {
    console.log("Failed to login after 5 tries. Exiting.");
    await browser.close();
    throw new Error("Failed to login after 5 tries.");
  }

  await page.waitForNetworkIdle();
  console.log("Successfully retrieved auth cookies: ");
  const cookies = await page.cookies();
  const SimpleSAML = cookies.find((cookie) => cookie.name === "SimpleSAML").value;
  const SimpleSAMLAuthToken = cookies.find((cookie) => cookie.name === "SimpleSAMLAuthToken").value;
  console.log(`SimpleSAML=${SimpleSAML};`);
  console.log(`SimpleSAMLAuthToken=${SimpleSAMLAuthToken};`);

  await browser.close();
  process.env.SIMPLE_SAML = SimpleSAML;
  process.env.SIMPLE_SAML_AUTH_TOKEN = SimpleSAMLAuthToken;
}

async function uploadRecordingToS3() {
  // Upload the recording to S3.
  const command = new PutObjectCommand({
    Bucket: process.env.SCU_SCHEDULE_HELPER_BUCKET_NAME,
    Key: "auth.webm",
    Body: fs.readFileSync("auth.webm"),
  });
  await s3.send(command);
}

export function getWithCookies(url) {
  return fetch(url, {
    method: "GET",
    headers: {
      Cookie: `SimpleSAML=${process.env.SIMPLE_SAML}; SimpleSAMLAuthToken=${process.env.SIMPLE_SAML_AUTH_TOKEN}`,
    },
  });
}
