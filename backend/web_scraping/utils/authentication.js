import puppeteer from "puppeteer";

export async function authenticate(username, password) {
  const loginButton = "button::-p-text(Login)";
  const browser = await puppeteer.launch({ args: ["--incognito"] });
  const page = await browser.newPage();

  console.log("Starting authentication...");
  await page.goto("https://scu.edu/apps/evaluations");
  await page.waitForNetworkIdle();

  // Fill username and password.
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);

  console.log(`Attemping to login user ${username}`);
  page.tap(loginButton);
  await page.waitForNetworkIdle();

  let needMobileApproval = page.url().includes("duosecurity");
  while (needMobileApproval) {
    console.log("***************************ACTION REQUIRED***************************");
    console.log("Mobile request sent for authentication. Please approve on your phone.");
    const verificationCodeDiv = await page.$(".verification-code");
    if (verificationCodeDiv) {
      const verificationCode = await verificationCodeDiv.evaluate((node) => node.textContent);
      console.log(`Use verification code: ${verificationCode}`);
    }
    console.log;
    const buttonToTap = await page.waitForSelector(
      "button::-p-text(Yes, this is my device), button::-p-text(Try again)",
      { timeout: 65000 }
    );
    needMobileApproval = await buttonToTap.evaluate((node) => node.textContent === "Try again");
    buttonToTap.tap();
    if (!needMobileApproval) {
      await page.waitForRequest((request) => request.url().includes("scu.edu"));
    } else {
      console.log("Mobile request not approved. Retrying...");
      await page.waitForSelector(
        "div::-p-text(Check for a Duo Push), div::-p-text(Enter code in Duo Mobile)"
      );
    }
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

export function getWithCookies(url) {
  return fetch(url, {
    method: "GET",
    headers: {
      Cookie: `SimpleSAML=${process.env.SIMPLE_SAML}; SimpleSAMLAuthToken=${process.env.SIMPLE_SAML_AUTH_TOKEN}`,
    },
  });
}
