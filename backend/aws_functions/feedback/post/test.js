import { handler } from './index.js';

async function test() {
  console.log("Testing feedback submission");
  
  const testEvent = {
    requestContext: {
      http: {
        method: 'POST'
      }
    },
    body: JSON.stringify({
      feedbackType: "Bug Report",
      feedbackDate: new Date().toISOString(),
      feedback: "Test feedback submission",
      source: "Test Runner"
    })
  };

  try {
    const response = await handler(testEvent, {});
    console.log('Response Status:', response.statusCode);
    console.log('Response Body:', JSON.parse(response.body));
  } catch (error) {
    console.error('Test failed:', error);
  }
}

await test();