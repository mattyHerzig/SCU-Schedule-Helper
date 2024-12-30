// index.js
import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';

const SPREADSHEET_ID = '1VhwMeKyQhJnMJQyZpxrOTOhbfEO_vS9KUrTgHAl9YBY';
const RANGE = 'Sheet1!A:D';

const ERRORS = {
  NO_BODY: "No feedback data provided in request body",
  MISSING_FIELDS: "Missing required fields in feedback data",
  SHEET_ERROR: "Error accessing Google Sheet",
  AUTH_ERROR: "Error authenticating with Google"
};

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.requestContext.http.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight handled' })
    };
  }

  try {
    const body = JSON.parse(event.body);

    if (!body.feedbackType || !body.feedbackDate || !body.feedback || !body.source) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: ERRORS.MISSING_FIELDS,
          message: 'All fields (feedbackType, feedbackDate, feedback, source) are required'
        })
      };
    }

    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const sheets = google.sheets({ version: 'v4', auth });

    const values = [[
      body.feedbackType,
      body.feedbackDate,
      body.feedback,
      body.source
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
      valueInputOption: 'RAW',
      requestBody: {
        values: values
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Feedback submitted successfully',
        data: body
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};