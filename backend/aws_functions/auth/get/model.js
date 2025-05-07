export class GetAuthTokenResponse {
  constructor() {
    this.accessToken = "";
    this.accessTokenExpirationDate = "";
    this.refreshToken = null;
    this.oAuthInfo = null;
  }
}

export class OAuthInfo {
  constructor(email, name, photoUrl) {
    this.email = email;
    this.name = name;
    this.photoUrl = photoUrl;
  }
}

export function validResponse(response, authToken) {
  return {
    statusCode: 204,
    headers: {
      "Content-Type": "application/json",
      
    },
    multiValueHeaders: {
      "Set-Cookie": [
        `accessToken=${authToken.accessToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Expires=${authToken.accessTokenExpirationDate}`,
        `refreshToken=${authToken.refreshToken}; Path=/; HttpOnly; Secure; SameSite=Strict`,
      ],
    }
  };
}

export function unauthorizedError(message) {
  return {
    statusCode: 401,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `Authorization failed: ${message}`,
    }),
  };
}
