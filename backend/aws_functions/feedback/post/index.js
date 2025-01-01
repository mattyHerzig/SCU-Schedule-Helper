import { JWT } from "google-auth-library";

const SPREADSHEET_API_BASE_URL =
  "https://sheets.googleapis.com/v4/spreadsheets";
const SPREADSHEET_ID = "1evcoFpUFlGCAeGf5HjfQycfmY4X0eCc_7sTSoJcbehQ";
const FEEDBACK_SHEET_NAME = "Feedback Page";

const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
const client = new JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

export const handler = async (event, context) => {
  try {
    const body = JSON.parse(event.body);

    if (!body.feedbackType || !body.feedbackText || !body.source) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message:
            "All fields (feedbackType, feedbackText, source) are required.",
        }),
      };
    }

    const feedbackDateString = new Date().toLocaleString("en-US", {
      timeZone: "America/Los_Angeles",
      timeZoneName: "short",
      month: "numeric",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const appendUrl = `${SPREADSHEET_API_BASE_URL}/${SPREADSHEET_ID}/values/${FEEDBACK_SHEET_NAME}:append?valueInputOption=RAW`;
    const appendRowResponse = await client.request({
      url: appendUrl,
      method: "POST",
      data: {
        values: [[feedbackDateString, body.feedbackType, body.feedbackText]],
      },
    });

    if (appendRowResponse.status < 200 || appendRowResponse.status >= 300) {
      console.error(`Error: ${appendRowResponse.statusText}`);
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "Something went wrong. Please try again later.",
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Feedback submitted successfully!",
      }),
    };
  } catch (error) {
    console.error("Error in feedback submission:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Something went wrong. Please try again later.",
      }),
    };
  }
};
