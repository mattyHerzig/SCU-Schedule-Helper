const tableName = process.env.SCU_SCHEDULE_HELPER_DDB_TABLE_NAME;
import { GetItemCommand } from "@aws-sdk/client-dynamodb";
import { client } from "./dynamoClient.js";

export async function getSetItems(pk, sk, attributename) {
    const params = {
      TableName: tableName,
      Key: {
        pk: { S: pk },
        sk: { S: sk },
      },
    };
    try {
      const data = await client.send(new GetItemCommand(params));
  
      if (data.Item && data.Item[attributename]) {
        console.log(`${attributename} Set:`, new Set(data.Item[attributename].SS));
        return new Set(data.Item[attributename].SS);
      } else {
        console.log(`${attributename} not found or is empty.`);
        return new Set();
      }
    } catch (error) {
      console.error("Error getting item:", error);
      throw error;
    }
  }
  
  