use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetAuthTokenResponse {
    pub access_token: String,
    pub access_token_expiration_date: String,
    pub refresh_token: String,
    pub o_auth_info: Option<OAuthInfo>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UserAuthorization {
    pub user_id: String,
    pub oauth_info: Option<OAuthInfo>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OAuthInfo {
    pub email: String,
    pub name: String,
    pub photo_url: String,
}

#[derive(Serialize, Deserialize)]
pub struct JwtClaims {
    pub sub: String,
    pub exp: usize,
    pub r#type: String
}

#[derive(Serialize, Deserialize)] 
#[serde(untagged)]
pub enum GoogleUserInfoResponse {
    Success(GoogleUserInfoSuccessResponse),
    Error(GoogleUserInfoErrorResponse),
}

#[derive(Serialize, Deserialize)]
pub struct GoogleUserInfoSuccessResponse {
    pub sub: String,
    pub name: String,
    pub family_name: String,
    pub given_name: String,
    pub picture: String,
    pub email: String,
    pub email_verified: bool,
}

#[derive(Serialize, Deserialize)]
pub struct GoogleUserInfoErrorResponse {
    pub error: String,
    pub error_description: String,
}
