import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { handler as authorizeUser } from '../../get_auth_token/index.js';
import { unauthorizedErrorBody } from '../../get_auth_token/model.js';

const client = new DynamoDBClient({ region: 'us-west-1' });
const docClient = DynamoDBDocumentClient.from(client);
const table_name = "SCU-Schedule-Helper";

export async function deleteUser(event, context, userId) {
    const userAuthorization = await authorizeUser(event, context);
  if (!userAuthorization.isAuthorized) {
    return unauthorizedErrorBody(userAuthorization.authError);
  }
    const sortKeys = await getSortKeys(userId);
    
    if (sortKeys.length === 0) {
        console.log("No sort keys for primary key");
        return;
    } else if (sortKeys.length > 25) {
        console.log("Too many sort keys for one operation");
        return;
    }

    const delete_requests = sortKeys.map(sk => ({
        DeleteRequest: {
            Key: {
                pk: userId,
                sk: sk
            }
        }
    }));

    const params = {
        RequestItems: {
            [table_name]: delete_requests
        }
    };

    try {
        const result = await docClient.send(new BatchWriteCommand(params));
        console.log(`Deleted ${delete_requests.length} items from the table.`);
        return result;
    } catch (error) {
        console.error("Error deleting items:", error);
        throw error; // Optionally return an error response here
    }
}

const getSortKeys = async (partitionKey) => {
    const params = {
        TableName: table_name,
        KeyConditionExpression: 'pk = :primaryKey',
        ExpressionAttributeValues: {
            ':primaryKey': partitionKey
        }
    };

    try {
        const data = await docClient.send(new QueryCommand(params));
        const sortKeys = data.Items.map(item => item.sk);
        console.log("Sort keys:", sortKeys);
        return sortKeys;
    } catch (error) {
        console.error("Error querying items:", error);
        throw error;
    }
};
