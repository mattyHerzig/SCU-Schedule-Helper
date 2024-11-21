const tableName = process.env.SCU_SCHEDULE_HELPER_DDB_TABLE_NAME;
import { GetItemCommand } from "@aws-sdk/client-dynamodb";
import { client } from "./dynamoClient.js";

export async function getSetItems(userId, sk, attributeName) {
  const params = {
    TableName: tableName,
    Key: {
      pk: { S: `u#${userId}` },
      sk: { S: sk },
    },
  };

  const data = await client.send(new GetItemCommand(params));
  if (!data.Item || !data.Item[attributeName] || !data.Item[attributeName].SS) {
    return new Set();
  }
  return new Set(data.Item[attributeName].SS);
}
