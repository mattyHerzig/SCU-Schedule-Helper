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

export const unsupportedMethodError = (resource, method) => {
  return {
    statusCode: 405,
    body: JSON.stringify({
      message: `Resource "${resource}" does not support the ${method} method.`,
    }),
  };
};
