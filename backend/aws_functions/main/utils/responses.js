export const defaultResponse = {
  statusCode: 200,
  body: `<p style="text-align:center;">&nbsp;</p>
<p style="text-align:center;">&nbsp;</p>
<p style="text-align:center;">&nbsp;</p>
<p style="text-align:center;">&nbsp;</p>
<p style="text-align:center;">&nbsp;</p>
<h1 style="text-align:center;"><span style="color:hsl( 352, 56%, 34% );font-family:Verdana, Geneva, sans-serif;"><strong>SCU</strong></span><span style="font-family:Verdana, Geneva, sans-serif;"><strong> </strong></span><span style="color:#212121;font-family:Verdana, Geneva, sans-serif;"><strong>Schedule Helper</strong></span></h1>`,
};

export const validResponse = (response) => {
  return {
    statusCode: 200,
    body: JSON.stringify(response),
  };
};

export const unauthorizedError = (message) => {
  return {
    statusCode: 401,
    body: JSON.stringify({
      message: `Could not verify user authorization due to an error: ${message}`,
    }),
  };
};

export const resourceNotFoundError = (resource) => {
  return {
    statusCode: 404,
    body: JSON.stringify({
      message: `Resource "${resource}" does not exist on the server.`,
    }),
  };
};

export const unsupportedMethodError = (resource, method) => {
  return {
    statusCode: 405,
    body: JSON.stringify({
      message: `Resource "${resource}" does not support the ${method} method.`,
    }),
  };
};

export const internalServerError = (error) => {
  return {
    statusCode: 500,
    body: JSON.stringify({
      message: `Internal server error: ${error}`,
    }),
  };
};
