import { deleteUser } from './delete.js'; 
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import 'dotenv/config'; 
const JWT  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlc2FydG9yeSIsInR5cGUiOiJhY2Nlc3MifQ.zhZ5RuK-Hy6bM8HQZjijxDxJBrQYpLL48AbSj8t32D8";
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
