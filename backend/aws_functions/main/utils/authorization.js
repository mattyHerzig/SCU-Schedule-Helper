const ERRORS = {
  NO_HEADER: "no authorization header provided.",
  BAD_HEADER: "authorization header must provide an issued access token.",
  INVALID_TOKEN_TYPE: "invalid token type (expected refresh token)",
  BAD_ACCESS_TOKEN: "could not verify access token",
};

export async function handleWithAuthorization(event, context, handler) {
  const userAuthorization = getUserAuthorization(event);
  if (userAuthorization.userId == null) return unauthorizedError(userAuthorization.authError);
  return await handler(event, context, userAuthorization.userId);
}

function getUserAuthorization(event) {
  if (!event || !event.headers || !event.headers.authorization)
    return { authError: ERRORS.NO_HEADER };
  const authorizationHeader = event.headers.authorization;
  const authType = authorizationHeader.split(" ")[0];
  if (authorizationHeader.split(" ").length !== 2 || !authType == "Bearer") {
    return {
      authError: ERRORS.BAD_HEADER,
    };
  }
  return verifyAccessToken(authorizationHeader.split(" ")[1]);
}

function verifyAccessToken(accessToken) {
  try {
    const token = jwtLib.verify(accessToken, process.env.JWT_SECRET);
    if (token.type !== "access") {
      return {
        authError: ERRORS.INVALID_TOKEN_TYPE,
      };
    }
    return { userId: token.sub };
  } catch (error) {
    return {
      authError: `${ERRORS.BAD_ACCESS_TOKEN} (${error}).`,
    };
  }
}
