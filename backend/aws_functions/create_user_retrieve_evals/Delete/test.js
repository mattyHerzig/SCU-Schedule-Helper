import { deleteUser } from './delete.js'; 
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import 'dotenv/config'; 
const JWT  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlc2FydG9yeSIsInR5cGUiOiJhY2Nlc3MiLCJuYW1lIjoiZXRoYW4gc2FydG9yeSIsImlhdCI6MTUxNjIzOTAyMn0.0GKf737YRuv4GsIySGzK6E6bFnIuGHbU-0LOTRmTu7M";
const client = new DynamoDBClient({ region: 'us-west-1' });
const docClient = DynamoDBDocumentClient.from(client);

async function runTest() {
    const event = {
        requestContext: {
            http: {
                method: "DELETE",
            },
        },
        headers: {
            authorization: `Bearer ${JWT}`, 
        },
        body: {
            userId: "esartory",
          },
    };

    try {
        const response = await deleteUser(event, null);
        console.log('Delete User Result:', response);
    } catch (error) {
        console.error('Error during deleteUser:', error);
    }
}
runTest();
