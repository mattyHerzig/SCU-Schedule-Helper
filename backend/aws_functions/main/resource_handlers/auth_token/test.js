import { handleAuthTokenRequest } from "./handler.js";
import { GetAuthTokenResponse } from "./model.js";

async function test() {
  console.log("Test 1 get auth token with oauth token");
  const event = {
    httpMethod: "GET",
    headers: {
      authorization: "OAuth <google_oauth_token>",
    },
  };
  const response = await handleAuthTokenRequest(event);
  if (response.statusCode == 401) {
    console.log("Google OAuth token is invalid");
    console.log(response.body);
  } else {
    let authTokens = new GetAuthTokenResponse();
    Object.assign(authTokens, JSON.parse(response.body));
    console.log(`Access token: ${authTokens.accessToken}\n`);
    console.log(`Access token expiration date: ${authTokens.accessTokenExpirationDate}\n`);
    console.log(`Refresh token: ${authTokens.refreshToken}\n`);
    console.log(
      `OAuth info: email(${authTokens.oAuthInfo.email}) name(${authTokens.oAuthInfo.name}) picture(${authTokens.oAuthInfo.picture})\n\n`
    );
  }

  console.log("\n\nTest 2 get auth token with bearer token");
  const event2 = {
    httpMethod: "GET",
    headers: {
      authorization:
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzd2RlYW4iLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTUxNjIzOTAyMn0.DFbH_DyZzJJoNbEgXQUrQ_N6ASyxdqvnLBzAOLealFE",
    },
  };
  const response2 = await handleAuthTokenRequest(event2);
  if (response2.statusCode == 401) {
    console.log("Refresh token is invalid");
    console.log(response2.body);
    return;
  } else {
    let authTokens2 = new GetAuthTokenResponse();
    Object.assign(authTokens2, JSON.parse(response2.body));
    console.log(`Access token: ${authTokens2.accessToken}\n`);
    console.log(`Access token expiration date: ${authTokens2.accessTokenExpirationDate}\n`);
    console.log(`Refresh token (should be null): ${authTokens2.refreshToken}\n`);
    console.log(`OAuth info (should be null): ${authTokens2.oAuthInfo}`);
  }

  console.log("\n\nTest 3 unsupported method");
  const event3 = {
    httpMethod: "POST",
  };
  const response3 = await handleAuthTokenRequest(event3);
  console.log(response3);
}
await test();
