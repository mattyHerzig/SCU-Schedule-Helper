export const unauthorizedErrorBody = (authError) => {
  return {
    statusCode: 401,
    body: JSON.stringify({
      message: `Could not verify user authorization due to an error: ${authError}`,
    }),
  };
};

export const internalServerErrorBody = (error) => {
  return {
    statusCode: 500,
    body: JSON.stringify({
      message: `Internal server error: could not fetch evals JSON due to error ${error}`,
    }),
  };
};
