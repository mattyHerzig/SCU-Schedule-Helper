export const noContentValidResponse = {
  statusCode: 204,
  headers: {},
};

export const unauthorizedError = (message) => {
  return {
    statusCode: 401,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `Could not verify user authorization due to an error: ${message}`,
    }),
  };
};

export const notFoundError = (message) => {
  return {
    statusCode: 404,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
    }),
  };
};

export const internalServerError = (error) => {
  return {
    statusCode: 500,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `Internal server error: ${error}`,
    }),
  };
};
