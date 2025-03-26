use std::error::Error;

pub const NO_HEADER: &str = "no authorization header provided.";
pub const BAD_HEADER: &str =
    "authorization header must provide an issued refresh token or a Google OAuth token.";
pub const GOOGLE_OAUTH_ERROR: &str = "error fetching your info from Google";
pub const BAD_CLIENT: &str = "OAuth client not allowed.";
pub const BAD_EMAIL: &str = "invalid email (not in scu.edu).";
pub const EMAIL_NOT_VERIFIED: &str = "invalid email (email is not verified).";
pub const BAD_REFRESH_TOKEN: &str = "could not verify refresh token";
pub const INVALID_TOKEN_TYPE: &str =
    "invalid token type (provided access token, expected refresh token)";

#[derive(Debug)]
pub struct HttpError {
    pub message: String,
    pub status: u16,
}

impl std::fmt::Display for HttpError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl Error for HttpError {}

impl HttpError {
    pub fn new(msg: impl Into<String>, status: u16) -> Self {
        Self { message: msg.into(), status }
    }
}