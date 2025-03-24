
pub const NO_HEADER: &str = "no authorization header provided.";
pub const BAD_HEADER: &str =
    "authorization header must provide an issued refresh token or a Google OAuth token.";
pub const GOOGLE_OAUTH_ERROR: &str = "error fetching your info from Google";
pub const BAD_EMAIL: &str = "invalid email (not in scu.edu).";
pub const EMAIL_NOT_VERIFIED: &str = "invalid email (email is not verified).";
pub const BAD_REFRESH_TOKEN: &str = "could not verify refresh token";
pub const INVALID_TOKEN_TYPE: &str =
    "invalid token type (provided access token, expected refresh token)";
