import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { handleWithAuthorization } from "./utils/authorization.js";
import {
  badRequestError,
  internalServerError,
  validResponse,
} from "./model.js";

export async function handler(event, context) {
  return await handleWithAuthorization(
    event,
    context,
    handleGetUserByNameRequest,
  );
}

const USER_INFO_PATTERN = /U{(.*?)}P{(.*?)}/;
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_DDB_REGION,
});
const tableName = process.env.SCU_SCHEDULE_HELPER_DDB_TABLE_NAME;

async function handleGetUserByNameRequest(event, context, userId) {
  const nameQueryParam = event.queryStringParameters?.name;
  if (!nameQueryParam) {
    return badRequestError(`missing required query parameter 'name'.`);
  }
  const nameIndexQuery = await dynamoClient.send(
    new QueryCommand({
      KeyConditionExpression: "pk = :pk and begins_with(sk, :sk)",
      ExpressionAttributeValues: {
        ":pk": { S: `name-index#${nameQueryParam.toUpperCase().charAt(0)}` },
        ":sk": { S: nameQueryParam },
      },
      TableName: tableName,
    }),
  );
  if (nameIndexQuery.$metadata.httpStatusCode !== 200) {
    return internalServerError(`error querying name index.`);
  }
  const userItems = nameIndexQuery.Items || [];
  const responseItems = [];
  for (const userItem of userItems) {
    if (!userItem.users || !userItem.users.SS) continue;
    for (const user of userItem.users.SS) {
      const userInfo = USER_INFO_PATTERN.exec(user);
      if (!userInfo) continue;
      responseItems.push({
        email: `${userInfo[1]}@scu.edu`,
        name: userItem.sk.S,
        photoUrl: userInfo[2],
      });
    }
  }
  return validResponse(responseItems);
}
