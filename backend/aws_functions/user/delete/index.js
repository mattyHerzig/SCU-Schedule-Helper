import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { handleWithAuthorization } from "./utils/authorization.js";

const docClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_DDB_REGION }),
);
const tableName = process.env.SCU_SCHEDULE_HELPER_DDB_TABLE_NAME;

export async function handler(event, context) {
  return await handleWithAuthorization(event, context, deleteUser);
}

async function deleteUser(event, context, userId) {
  const sortKeys = await getSortKeys(`u#${userId}`);

  if (sortKeys.length === 0) {
    console.log(`No sort keys for primary key u#${userId}`);
    return;
  }
  const batches = [];
  while (sortKeys.length > 0) {
    batches.push(sortKeys.splice(0, 25));
  }
  for (const batch of batches) {
    const delete_requests = batch.map((sk) => ({
      DeleteRequest: {
        Key: {
          pk: `u#${userId}`,
          sk: sk,
        },
      },
    }));

    const params = {
      RequestItems: {
        [tableName]: delete_requests,
      },
    };

    try {
      const result = await docClient.send(new BatchWriteCommand(params));
      console.log(`Deleted ${delete_requests.length} items from the table.`);
    } catch (error) {
      console.error("Error deleting items:", error);
      throw error;
    }
  }
}

const getSortKeys = async (pk) => {
  const params = {
    TableName: tableName,
    KeyConditionExpression: "pk = :primaryKey",
    ExpressionAttributeValues: {
      ":primaryKey": pk,
    },
  };

  try {
    const data = await docClient.send(new QueryCommand(params));
    const sortKeys = data.Items.map((item) => item.sk);
    console.log("Sort keys:", sortKeys);
    return sortKeys;
  } catch (error) {
    console.error("Error querying items:", error);
    throw error;
  }
};
