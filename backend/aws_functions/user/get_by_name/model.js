export const validResponse = (body) => {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
};

export const badRequestError = (message) => {
  return {
    statusCode: 400,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: `Bad request: ${message}` }),
  };
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
