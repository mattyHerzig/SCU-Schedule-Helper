export const defaultResponse = {
  statusCode: 200,
  headers: {
    "Content-Type": "text/html",
  },
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
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(response),
  };
};

export const badRequestResponse = (message) => {
  return {
    statusCode: 400,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
    }),
  };
};

export const unauthorizedError = (message) => {
  return {
    statusCode: 401,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `Authorization failed: ${message}`,
    }),
  };
};

export const resourceNotFoundError = (resource) => {
  return {
    statusCode: 404,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `Resource "${resource}" does not exist on the server.`,
    }),
  };
};

export const internalServerError = {
  statusCode: 500,
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    message: `Something went wrong on our end. Please try again later or contact stephenwdean@gmail.com.`,
  }),
};
