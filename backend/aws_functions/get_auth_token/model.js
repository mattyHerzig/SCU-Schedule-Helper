export class GetAuthTokenResponse {
  constructor() {
    this.accessToken = "";
    this.accessTokenExpirationDate = 0;
    this.refreshToken = "";
    this.oAuthInfo = null;
  }
}

export class OAuthInfo {
  constructor(email, name, picture) {
    this.email = email;
    this.name = name;
    this.picture = picture;
  }
}

export const unauthorizedErrorBody = (message) => {
  return {
    statusCode: 401,
    body: JSON.stringify({
      message: `Could not verify user authorization due to an error: ${message}`,
    }),
  };
};

export const validResponseBody = (authTokenResponse) => {
  return {
    statusCode: 200,
    body: JSON.stringify(authTokenResponse),
  };
};
