use crate::errors::*;
use crate::model::*;
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use lambda_http::{Body, Error, Request, Response};
use reqwest::header::HeaderValue;
use serde::de::DeserializeOwned;

pub(crate) async fn function_handler(event: Request) -> Result<Response<Body>, Error> {
    match get_auth_token(event).await {
        Ok(response_json) => {
            let resp = Response::builder()
                .status(200)
                .header("content-type", "text/html")
                .body(response_json.into())
                .map_err(Box::new)?;
            return Ok(resp);
        }
        Err(e) => {
            let error_json = serde_json::json!({
                "message": e.message
            })
            .to_string();

            let resp = Response::builder()
                .status(e.status)
                .header("content-type", "application/json")
                .body(error_json.into())
                .map_err(Box::new)?;
            return Ok(resp);
        }
    }
}

async fn get_auth_token(event: Request) -> Result<String, HttpError> {
    let user_authorization = get_user_authorization(event).await?;
    let seven_days_from_now = chrono::Local::now()
        .checked_add_signed(chrono::Duration::days(7))
        .unwrap();
    let thirty_days_from_now = chrono::Local::now()
        .checked_add_signed(chrono::Duration::days(30))
        .unwrap();
    let access_token = generate_token(
        user_authorization.user_id.clone(),
        "access".to_string(),
        seven_days_from_now.timestamp() as usize,
    )?;
    let refresh_token: Option<String>;
    if user_authorization.oauth_info.is_none() {
        refresh_token = None;
    } else {
        refresh_token = Some(generate_token(
            user_authorization.user_id,
            "refresh".to_string(),
            thirty_days_from_now.timestamp() as usize,
        )?);
    }

    let response_json = serde_json::to_string(&GetAuthTokenResponse {
        access_token,
        access_token_expiration_date: seven_days_from_now.to_rfc3339(),
        refresh_token,
        oauth_info: user_authorization.oauth_info,
    })
    .map_err(|e| -> HttpError {
        eprintln!("INTERNAL: Error serializing response: {e}");
        HttpError::new("Something went wrong, please try again.", 500)
    })?;
    Ok(response_json)
}

async fn get_user_authorization(event: Request) -> Result<UserAuthorization, HttpError> {
    if event.headers().is_empty() || !event.headers().contains_key("authorization") {
        return Err(HttpError::new(NO_HEADER, 400));
    }

    let default_header: HeaderValue = ("").parse().unwrap();
    let authorization_header = event
        .headers()
        .get("authorization")
        .unwrap_or(&default_header)
        .to_str()
        .map_err(|_| HttpError::new(BAD_HEADER, 400))?;

    let auth_header_values = authorization_header.split(" ").collect::<Vec<&str>>();
    if auth_header_values.len() != 2
        || (auth_header_values[0] != "Bearer" && auth_header_values[0] != "OAuth")
    {
        return Err(HttpError::new(BAD_HEADER, 400));
    }
    if auth_header_values[0] == "OAuth" {
        verify_google_oauth_token(auth_header_values[1]).await
    } else {
        verify_refresh_token(auth_header_values[1])
    }
}

async fn verify_google_oauth_token(token: &str) -> Result<UserAuthorization, HttpError> {
    let client = reqwest::Client::new();

    let token_info_response = fetch_google_api::<GoogleTokenInfoResponse>(
        &client,
        "https://www.googleapis.com/oauth2/v3/tokeninfo",
        token,
    );
    let user_info_response = fetch_google_api::<GoogleUserInfoResponse>(
        &client,
        "https://www.googleapis.com/oauth2/v3/userinfo",
        token,
    );

    let (token_info_response, user_info_response) =
        tokio::join!(token_info_response, user_info_response);

    match token_info_response? {
        GoogleTokenInfoResponse::Success(response) => {
            let allowed_client_ids = std::env::var("ALLOWED_OAUTH_CLIENT_IDS").unwrap_or_default();
            let allowed_client_ids = allowed_client_ids
                .split(" ")
                .collect::<std::collections::HashSet<&str>>();
            if !allowed_client_ids.contains(response.aud.as_str()) {
                return Err(HttpError::new(BAD_CLIENT, 401));
            }
        }
        GoogleTokenInfoResponse::Error(error_response) => {
            return Err(HttpError::new(
                format!(
                    "{GOOGLE_OAUTH_ERROR} ({}).",
                    error_response.error_description
                ),
                401,
            ));
        }
    }

    match user_info_response? {
        GoogleUserInfoResponse::Success(response) => {
            if !response.email.ends_with("@scu.edu") {
                return Err(HttpError::new(BAD_EMAIL, 401));
            }
            if !response.email_verified {
                return Err(HttpError::new(EMAIL_NOT_VERIFIED, 401));
            }
            let user_authorization = UserAuthorization {
                user_id: response.sub,
                oauth_info: Some(OAuthInfo {
                    email: response.email,
                    name: response.name,
                    photo_url: response.picture,
                }),
            };
            Ok(user_authorization)
        }
        GoogleUserInfoResponse::Error(error_response) => Err(HttpError::new(
            format!(
                "{GOOGLE_OAUTH_ERROR} ({}).",
                error_response.error_description
            ),
            401,
        )),
    }
}

async fn fetch_google_api<'a, T: DeserializeOwned>(
    client: &reqwest::Client,
    path: &str,
    token: &str,
) -> Result<T, HttpError> {
    let response = client
        .get(path)
        .header("Authorization", format!("Bearer {token}"))
        .send()
        .await
        .map_err(|e| -> HttpError {
            eprintln!("INTERNAL: Error fetching Google info from {path}: {e}");
            HttpError::new(format!("{GOOGLE_OAUTH_ERROR}, please try again."), 500)
        })?
        .text()
        .await
        .map_err(|e| -> HttpError {
            eprintln!("INTERNAL: Error fetching Google info from {path}: {e}");
            HttpError::new(format!("{GOOGLE_OAUTH_ERROR}, please try again."), 500)
        })?;

    let json_object: T = serde_json::from_str(&response).map_err(|e| {
        HttpError::new(
            format!("{GOOGLE_OAUTH_ERROR}, ({e}) please try again."),
            401,
        )
    })?;

    Ok(json_object)
}

fn verify_refresh_token(refresh_token: &str) -> Result<UserAuthorization, HttpError> {
    let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_default();
    let token = decode::<JwtClaims>(
        refresh_token,
        &DecodingKey::from_secret(jwt_secret.as_ref()),
        &Validation::new(Algorithm::HS256),
    )
    .map_err(|e| HttpError::new(format!("{BAD_REFRESH_TOKEN} ({e})",), 401))?;

    if token.claims.r#type != "refresh" {
        return Err(HttpError::new(INVALID_TOKEN_TYPE, 401));
    }

    Ok(UserAuthorization {
        user_id: token.claims.sub,
        oauth_info: None,
    })
}

fn generate_token(
    user_id: String,
    token_type: String,
    expiration_timestamp: usize,
) -> Result<String, HttpError> {
    let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_default();

    let access_token = encode(
        &Header::default(),
        &JwtClaims {
            sub: user_id,
            r#type: token_type,
            exp: expiration_timestamp,
        },
        &EncodingKey::from_secret(jwt_secret.as_ref()),
    )
    .map_err(|e| -> HttpError {
        eprintln!("INTERNAL: Error encoding token: {e}");
        HttpError::new("Something went wrong, please try again.", 500)
    })?;

    Ok(access_token)
}

#[cfg(test)]
mod tests {
    use super::*;
    use dotenv::dotenv;
    use lambda_http::Request;
    use std::sync::Once;

    static INIT: Once = Once::new();

    pub fn initialize() {
        INIT.call_once(|| {
            dotenv().ok();
        });
    }

    #[tokio::test]
    async fn google_oauth_request() {
        initialize();
        let mut request = Request::default();

        request.headers_mut().insert(
            "authorization",
            format!("OAuth {}", std::env::var("TEST_GOOGLE_OAUTH_TOKEN").unwrap())
                .parse()
                .unwrap(),
        );

        let response = function_handler(request).await.unwrap();

        let body_bytes = response.body().to_vec();
        let body_string = String::from_utf8(body_bytes).unwrap();      
        let body_json: serde_json::Value = serde_json::from_str(&body_string).unwrap();
        println!("{}", serde_json::to_string_pretty(&body_json).unwrap());
        assert_eq!(response.status(), 200);
    }
    
    #[tokio::test]
    async fn refresh_token_request() {
        initialize();
        let mut request = Request::default();

        request.headers_mut().insert(
            "authorization",
            format!("Bearer {}", std::env::var("TEST_REFRESH_TOKEN").unwrap())
                .parse()
                .unwrap(),
        );

        let response = function_handler(request).await.unwrap();

        let body_bytes = response.body().to_vec();
        let body_string = String::from_utf8(body_bytes).unwrap();
        let body_json: serde_json::Value = serde_json::from_str(&body_string).unwrap();
        println!("{}", serde_json::to_string_pretty(&body_json).unwrap());
        assert_eq!(response.status(), 200);
    }
}
