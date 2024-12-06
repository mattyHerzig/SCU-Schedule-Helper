import {
  GetItemCommand,
  UpdateItemCommand,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import fs from "fs";

const validResponse = {
  statusCode: 200,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "text/html",
  },
  body: fs.readFileSync("uninstall.html", "utf8").toString(),
};

const ddbClient = new DynamoDBClient({ region: process.env.AWS_DDB_REGION });
const tableName = process.env.SCU_SCHEDULE_HELPER_DDB_TABLE_NAME;

export async function handler(event, context) {
  try {
    if (
      !event.queryStringParameters.u ||
      !event.queryStringParameters.sub ||
      event.queryStringParameters.u === "unknown"
    )
      return validResponse;
    const getParams = {
      TableName: tableName,
      Key: {
        pk: { S: `u#${event.queryStringParameters.u}` },
        sk: { S: "info#personal" },
      },
    };
    const data = await ddbClient.send(new GetItemCommand(getParams));
    if (!data.Item) return validResponse;
    const subscriptions = data.Item.subscriptions.SS;
    const updatedSubscriptions = subscriptions.filter(
      (sub) => JSON.parse(sub).endpoint !== event.queryStringParameters.sub,
    );
    const updatedSubscriptionsObj =
      updatedSubscriptions.length > 0
        ? { SS: updatedSubscriptions }
        : { NULL: true };
    const updateParams = {
      TableName: tableName,
      Key: {
        pk: { S: `u#${event.queryStringParameters.u}` },
        sk: { S: "info#personal" },
      },
      UpdateExpression: "SET subscriptions = :subscriptions",
      ExpressionAttributeValues: {
        ":subscriptions": updatedSubscriptionsObj,
      },
    };
    await ddbClient.send(new UpdateItemCommand(updateParams));
    return validResponse;
  } catch (error) {
    console.error("Error uninstalling:", error);
    return validResponse;
  }
}
