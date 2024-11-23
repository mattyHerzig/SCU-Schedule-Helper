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
  let keys = [];
  try {
    keys = await getKeysForDeletion(`u#${userId}`);
  } catch (error) {
    console.error("Error getting sort keys:", error);
    return internalServerError("Could not get the user's entries.");
  }
  if (keys.length === 0) {
    console.log(`No sort keys for primary key u#${userId}`);
    return notFoundError(`No sort keys for primary key u#${userId}`);
  }
  const batches = [];
  while (keys.length > 0) {
    batches.push(keys.splice(0, 25));
  }
  for (const batch of batches) {
    const delete_requests = batch.map((key) => ({
      DeleteRequest: {
        Key: {
          pk: { S: key.pk },
          sk: { S: key.sk },
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

async function getKeysForDeletion(pk) {
  const userQuery = {
    TableName: tableName,
    KeyConditionExpression: "pk = :primaryKey",
    ExpressionAttributeValues: {
      ":primaryKey": { S: pk },
    },
  };

  const data = await dynamoDBClient.send(new QueryCommand(userQuery));
  const keys = data.Items.map((item) => ({
    pk,
    sk: item.sk.S,
  }));
  const keysToDelete = Array.from(keys);
  for (const key of keys) {
    if (key.sk.startsWith("friend#cur#")) {
      const friendId = key.sk.split("friend#cur#")[1];
      keysToDelete.push({
        pk: `u#${friendId}`,
        sk: `friend#cur#${pk.split("u#")[1]}`,
      });
    }
    if (key.sk.startsWith("friend#req#in#")) {
      const friendId = key.sk.split("friend#req#in#")[1];
      keysToDelete.push({
        pk: `u#${friendId}`,
        sk: `friend#req#out#${pk.split("u#")[1]}`,
      });
    }
    if (key.sk.startsWith("friend#req#out#")) {
      const friendId = key.sk.split("friend#req#out#")[1];
      keysToDelete.push({
        pk: `u#${friendId}`,
        sk: `friend#req#in#${pk.split("u#")[1]}`,
      });
    }
  }
  return keysToDelete;
}
