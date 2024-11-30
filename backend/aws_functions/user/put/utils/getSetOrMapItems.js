import { GetItemCommand } from "@aws-sdk/client-dynamodb";
import { dynamoClient, tableName } from "../index.js";

export async function getSetItems(userId, sk, attributeName) {
  const params = {
    TableName: tableName,
    Key: {
      pk: { S: `u#${userId}` },
      sk: { S: sk },
    },
  };

  const data = await dynamoClient.send(new GetItemCommand(params));
  if (!data.Item || !data.Item[attributeName] || !data.Item[attributeName].SS) {
    return new Set();
  }
  return new Set(data.Item[attributeName].SS);
}

export async function getMap(userId, sk, attributeName) {
  const params = {
    TableName: tableName,
    Key: {
      pk: { S: `u#${userId}` },
      sk: { S: sk },
    },
  };

  const data = await dynamoClient.send(new GetItemCommand(params));
  if (!data.Item || !data.Item[attributeName] || !data.Item[attributeName].M) {
    return new Map();
  }
  return new Map(Object.entries(data.Item[attributeName].M));
}
