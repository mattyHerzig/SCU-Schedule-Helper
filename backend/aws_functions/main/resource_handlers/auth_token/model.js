export class GetAuthTokenResponse {
  constructor() {
    this.accessToken = "";
    this.accessTokenExpirationDate = 0;
    this.refreshToken = null;
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
