import { handler } from "./index.js";
import { GetAuthTokenResponse } from "./model.js";

handler({
  headers: {
    authorization: "OAuth <google_oauth_token>",
  },
}).then((response) => {
  console.log("Output from a Google OAuth token\n\n");
  if (response.statusCode == 401) {
    console.log("Google OAuth token is invalid");
    console.log(response.body);
    return;
  }
  let authTokens = new GetAuthTokenResponse();
  Object.assign(authTokens, JSON.parse(response.body));
  console.log(`Access token: ${authTokens.accessToken}\n`);
  console.log(`Access token expiration date: ${authTokens.accessTokenExpirationDate}\n`);
  console.log(`Refresh token: ${authTokens.refreshToken}\n`);
  console.log(
    `OAuth info: email(${authTokens.oAuthInfo.email}) name(${authTokens.oAuthInfo.name}) picture(${authTokens.oAuthInfo.picture})\n\n`
  );
});

handler({
  headers: {
    authorization: "Bearer <refresh_token>",
  },
}).then((response) => {
  console.log("Output from a refresh token\n\n");
  if (response.statusCode == 401) {
    console.log("Refresh token is invalid");
    console.log(response.body);
    return;
  }
  let authTokens = new GetAuthTokenResponse();
  Object.assign(authTokens, JSON.parse(response.body));
  console.log(`Access token: ${authTokens.accessToken}\n`);
  console.log(`Access token expiration date: ${authTokens.accessTokenExpirationDate}\n`);
  console.log(`Refresh token: ${authTokens.refreshToken}\n`);
  console.log(`OAuth info (should be null): ${authTokens.oAuthInfo}\n\n`);
});
