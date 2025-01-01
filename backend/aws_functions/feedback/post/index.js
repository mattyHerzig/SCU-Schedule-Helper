import { JWT } from "google-auth-library";

const SPREADSHEET_API_BASE_URL =
  "https://sheets.googleapis.com/v4/spreadsheets";
const SPREADSHEET_ID = "1evcoFpUFlGCAeGf5HjfQycfmY4X0eCc_7sTSoJcbehQ";
const FEEDBACK_SHEET_NAME = "Feedback Page";

export const handler = async (event, context) => {
  try {
    const body = JSON.parse(event.body);
    console.log("Received event:", JSON.stringify(event));

    if (!body.feedbackType || !body.feedback || !body.source) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Missing required fields",
          message: "All fields (feedbackType, feedback, source) are required",
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

    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

    const client = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const appendUrl = `${SPREADSHEET_API_BASE_URL}/${SPREADSHEET_ID}/values/${FEEDBACK_SHEET_NAME}:append?valueInputOption=RAW`;
    const appendRowResponse = await client.request({
      url: appendUrl,
      method: "POST",
      data: {
        values: [[feedbackDateString, body.feedbackType, body.feedback]],
      },
    });

    const [, newRowId] =
      appendRowResponse.data.updates.updatedRange.match(/A(\d+):C\d+/) ?? [];

    if (newRowId) {
      const validationUrl = `${SPREADSHEET_API_BASE_URL}/${SPREADSHEET_ID}:batchUpdate`;
      await client.request({
        url: validationUrl,
        method: "POST",
        data: {
          requests: [
            {
              copyPaste: {
                source: {
                  sheetId: 124960891,
                  startRowIndex: 1,
                  endRowIndex: 2,
                  startColumnIndex: 1,
                  endColumnIndex: 2,
                },
                destination: {
                  sheetId: 124960891,
                  startRowIndex: parseInt(newRowId - 1),
                  endRowIndex: parseInt(newRowId),
                  startColumnIndex: 1,
                  endColumnIndex: 2,
                },
                pasteType: "PASTE_DATA_VALIDATION",
                pasteOrientation: "NORMAL",
              },
            },
          ],
        },
      });
    } else {
      console.error("Could not find new row ID.");
    }

    if (appendRowResponse.status < 200 || appendRowResponse.status >= 300) {
      console.error(`Error: ${appendRowResponse.statusText}`);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Internal server error",
          message: appendRowResponse.statusText,
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Feedback submitted successfully",
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal server error",
        message: error.message,
      }),
    };
  }
};
