import {
  DynamoDBClient,
  QueryCommand,
  BatchWriteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { handleWithAuthorization } from "./utils/authorization.js";
import {
  internalServerError,
  noContentValidResponse,
  notFoundError,
} from "./model.js";

const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_DDB_REGION,
});
const tableName = process.env.SCU_SCHEDULE_HELPER_DDB_TABLE_NAME;

export async function handler(event, context) {
  return await handleWithAuthorization(event, context, deleteUser);
}

async function deleteUser(event, context, userId) {
  let sortKeys = [];
  try {
    sortKeys = await getSortKeys(`u#${userId}`);
  } catch (error) {
    console.error("Error getting sort keys:", error);
    return internalServerError("Could not get the user's entries.");
  }
  if (sortKeys.length === 0) {
    console.log(`No sort keys for primary key u#${userId}`);
    return notFoundError(`No sort keys for primary key u#${userId}`);
  }
  const batches = [];
  while (sortKeys.length > 0) {
    batches.push(sortKeys.splice(0, 25));
  }
  for (const batch of batches) {
    const delete_requests = batch.map((sk) => ({
      DeleteRequest: {
        Key: {
          pk: { S: `u#${userId}` },
          sk: { S: sk },
        },
      },
    }));
    if (delete_requests.length === 0) return noContentValidResponse;
    const params = {
      RequestItems: {
        [tableName]: delete_requests,
      },
    };

    try {
      await dynamoDBClient.send(new BatchWriteItemCommand(params));
    } catch (error) {
      console.error("Error deleting items:", error);
      return internalServerError("Error deleting items.");
    }
  }
  return noContentValidResponse;
}

const getSortKeys = async (pk) => {
  const userQuery = {
    TableName: tableName,
    KeyConditionExpression: "pk = :primaryKey",
    ExpressionAttributeValues: {
      ":primaryKey": { S: pk },
    },
  };

  const data = await dynamoDBClient.send(new QueryCommand(userQuery));
  const sortKeys = data.Items.map((item) => item.sk.S);
  return sortKeys;
};
