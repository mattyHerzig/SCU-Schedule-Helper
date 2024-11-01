export const unauthorizedErrorBody = (message) => {
  return {
    statusCode: 401,
    body: JSON.stringify({
      message: `Could not verify user authorization due to an error: ${authError}`,
    }),
  };
};

export const internalServerErrorBody = (message) => {
  return {
    statusCode: 500,
    body: JSON.stringify({
      message: `Internal server error: ${error}`,
    }),
  };
};
