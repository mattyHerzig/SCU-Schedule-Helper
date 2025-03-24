use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use lambda_http::{Body, Error, Request, Response};
use crate::errors::*;
use crate::model::*;

pub(crate) async fn function_handler(event: Request) -> Result<Response<Body>, Error> {
    match get_user_authorization(event).await {
        Ok(user_authorization) => {
            let seven_days_from_now = chrono::Local::now()
                .checked_add_signed(chrono::Duration::days(7))
                .unwrap();
            let thirty_days_from_now = chrono::Local::now()
                .checked_add_signed(chrono::Duration::days(30))
                .unwrap();
            let access_token = generate_token(
                user_authorization.clone(),
                "access".to_string(),
                seven_days_from_now.timestamp() as usize,
            )?;
            let refresh_token = generate_token(
                user_authorization.clone(),
                "refresh".to_string(),
                thirty_days_from_now.timestamp() as usize,
            )?;

            let response_json = serde_json::to_string(&GetAuthTokenResponse {
                access_token,
                access_token_expiration_date: seven_days_from_now.to_string(),
                refresh_token,
                o_auth_info: user_authorization.oauth_info,
            })?;

            let resp = Response::builder()
                .status(200)
                .header("content-type", "text/html")
                .body(response_json.into())
                .map_err(Box::new)?;
            return Ok(resp);
        }
        Err(e) => {
            let error_json = serde_json::json!({
                "message": e.to_string()
            })
            .to_string();

            let resp = Response::builder()
                .status(401)
                .header("content-type", "application/json")
                .body(error_json.into())
                .map_err(Box::new)?;
            return Ok(resp);
        }
    }
}

async fn get_user_authorization(event: Request) -> Result<UserAuthorization, Error> {
    if event.headers().is_empty() || !event.headers().contains_key("authorization") {
        return Err(NO_HEADER.into());
    }

    let default_header = reqwest::header::HeaderValue::from_str("").unwrap();
    let authorization_header = event
        .headers()
        .get("authorization")
        .unwrap_or(&default_header)
        .to_str()
        .map_err(|_| BAD_HEADER)?;

    let auth_header_values = authorization_header.split(" ").collect::<Vec<&str>>();
    if auth_header_values.len() != 2
        || (auth_header_values[0] != "Bearer" && auth_header_values[0] != "OAuth")
    {
        return Err(BAD_HEADER.into());
    }
    if auth_header_values[0] == "OAuth" {
        verify_google_oauth_token(auth_header_values[1]).await
    } else {
        verify_refresh_token(auth_header_values[1])
    }
}

async fn verify_google_oauth_token(token: &str) -> Result<UserAuthorization, Error> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://www.googleapis.com/oauth2/v3/userinfo")
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|_| format!("{}, please try again.", GOOGLE_OAUTH_ERROR))?;

    let response_body = response.text().await.unwrap();
    let user_info: GoogleUserInfoResponse = serde_json::from_str(&response_body)
        .map_err(|_| format!("{}, please try again.", GOOGLE_OAUTH_ERROR))?;

    match user_info {
        GoogleUserInfoResponse::Success(response) => {
            if !response.email.ends_with("@scu.edu") {
                return Err(BAD_EMAIL.into());
            }
            if !response.email_verified {
                return Err(EMAIL_NOT_VERIFIED.into());
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
        GoogleUserInfoResponse::Error(error_response) => Err(format!(
            "{}, ({}).",
            GOOGLE_OAUTH_ERROR, error_response.error_description
        )
        .into()),
    }
}

fn verify_refresh_token(refresh_token: &str) -> Result<UserAuthorization, Error> {
    let jwt_secret = std::env::var("JWT_SECRET").unwrap();
    let token = decode::<JwtClaims>(
        refresh_token,
        &DecodingKey::from_secret(jwt_secret.as_ref()),
        &Validation::new(Algorithm::HS256),
    )
    .map_err(|e| format!("{} ({})", BAD_REFRESH_TOKEN, e))?;

    if token.claims.r#type != "refresh" {
        return Err(INVALID_TOKEN_TYPE.into());
    }

    Ok(UserAuthorization {
        user_id: token.claims.sub,
        oauth_info: None,
    })
}

fn generate_token(
    user_authorization: UserAuthorization,
    token_type: String,
    expiration_timestamp: usize,
) -> Result<String, Error> {
    let jwt_secret = std::env::var("JWT_SECRET").unwrap();

    let access_token = encode(
        &Header::default(),
        &JwtClaims {
            sub: user_authorization.user_id,
            r#type: token_type,
            exp: expiration_timestamp,
        },
        &EncodingKey::from_secret(jwt_secret.as_ref()),
    )
    .map_err(|_| "Something went wrong, please try again.")?;

    Ok(access_token)
}

#[cfg(test)]
mod tests {
    use super::*;
    use lambda_http::{Request, RequestExt};
    use std::collections::HashMap;

    #[tokio::test]
    async fn test_generic_http_handler() {
        let request = Request::default();

        let response = function_handler(request).await.unwrap();
        assert_eq!(response.status(), 200);

        let body_bytes = response.body().to_vec();
        let body_string = String::from_utf8(body_bytes).unwrap();

        assert_eq!(
            body_string,
            "Hello world, this is an AWS Lambda HTTP request"
        );
    }

    #[tokio::test]
    async fn test_http_handler_with_query_string() {
        let mut query_string_parameters: HashMap<String, String> = HashMap::new();
        query_string_parameters.insert("name".into(), "get".into());

        let request = Request::default().with_query_string_parameters(query_string_parameters);

        let response = function_handler(request).await.unwrap();
        assert_eq!(response.status(), 200);

        let body_bytes = response.body().to_vec();
        let body_string = String::from_utf8(body_bytes).unwrap();

        assert_eq!(body_string, "Hello get, this is an AWS Lambda HTTP request");
    }
}
