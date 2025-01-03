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

export function validResponse(response) {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(response),
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
