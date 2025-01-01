import { JWT } from 'google-auth-library';

const SPREADSHEET_ID = '1evcoFpUFlGCAeGf5HjfQycfmY4X0eCc_7sTSoJcbehQ';
const SHEET_NAME = 'FeedbackPage';
const RANGE = '!A:D'; 

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  try {
    const body = JSON.parse(event.body);
    console.log('Received event:', JSON.stringify(event));

    if (!body.feedbackType || !body.feedbackDate || !body.feedback || !body.source) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields',
          message: 'All fields (feedbackType, feedbackDate, feedback, source) are required'
        })
      };
    }

    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    console.log('Parsed Google Credentials:', credentials);

    const client = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}${RANGE}:append?valueInputOption=RAW`;
    const response = await client.request({
      url,
      method: 'POST',
      data: {
        values: [[body.feedbackType, body.feedbackDate, body.feedback, body.source]],
      },
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Feedback submitted successfully',
        data: body,
      }),
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};


//feedback

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SUBMIT_FEEDBACK') {
    submitFeedback(request.data)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function submitFeedback(data) {
  const API_ENDPOINT = 'https://tgoa5fcyfb.execute-api.us-west-1.amazonaws.com/prod/feedback';
  
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        feedbackType: data.feedbackType,
        feedbackDate: new Date().toISOString(),
        feedback: data.feedbackText,
        source: 'chrome_extension'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error submitting feedback:', error);
    throw error;
  }
}