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

export const validResponse = (response) => {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(response),
  };
};

export const unauthorizedError = (message) => {
  return {
    statusCode: 401,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `Could not verify user authorization due to an error: ${message}`,
    }),
  };
};
