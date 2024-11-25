import {
  DynamoDBClient,
  QueryCommand,
  BatchWriteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { handleWithAuthorization } from "./utils/authorization.js";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import {
  internalServerError,
  noContentValidResponse,
  notFoundError,
} from "./model.js";

const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_DDB_REGION,
});
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION,
});
const lambdaClient = new LambdaClient({
  region: process.env.AWS_LAMBDA_REGION,
});
const tableName = process.env.SCU_SCHEDULE_HELPER_DDB_TABLE_NAME;

export async function handler(event, context) {
  return await handleWithAuthorization(event, context, deleteUser);
}

async function deleteUser(event, context, userId) {
  let userInfo, keys;
  try {
    ({ userInfo, keys } = await getSubsAndKeysForDeletion(`u#${userId}`));
  } catch (error) {
    console.error("Error getting sort keys:", error);
    return internalServerError("Could not get the user's entries.");
  }
  console.log(`Deleting user u#${userId} with ${keys.length} sort keys.`);
  console.log(`User's info: ${JSON.stringify(userInfo)}`);
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
  try {
    // Delete the user's profile picture from S3.
    const photoKey = `u#${userId}/photo`;
    const photoParams = {
      Bucket: process.env.SCU_SCHEDULE_HELPER_BUCKET_NAME,
      Key: photoKey,
    };
    const s3Response = await s3Client.send(
      new DeleteObjectCommand(photoParams),
    );
    if (s3Response.$metadata.httpStatusCode !== 204) {
      console.error(`Error deleting profile photo from S3: ${s3Response}`);
      return internalServerError("Error deleting user's profile picture.");
    }
  } catch (error) {
    console.error("Error deleting user's profile picture:", error);
    return internalServerError("Error deleting user's profile picture.");
  }
  await tryNotifyClients(userId, userInfo);
  return noContentValidResponse;
}

async function getSubsAndKeysForDeletion(pk) {
  const userQuery = {
    TableName: tableName,
    KeyConditionExpression: "pk = :primaryKey",
    ExpressionAttributeValues: {
      ":primaryKey": { S: pk },
    },
  };
  const userId = pk.split("u#")[1];

  const data = await dynamoDBClient.send(new QueryCommand(userQuery));
  const keys = [];
  let selfSubs = [];
  let friendIds = [];
  let friendReqInIds = [];
  let friendReqOutIds = [];
  for (const dataItem of data.Items) {
    keys.push({
      pk,
      sk: dataItem.sk.S,
    });
    if (
      dataItem.sk.S.startsWith("info#personal") &&
      dataItem.subscriptions &&
      dataItem.subscriptions.SS
    ) {
      selfSubs = dataItem.subscriptions.SS.map((sub) => JSON.parse(sub));
    }
    if (dataItem.sk.S.startsWith("friend#cur")) {
      const friendId = dataItem.sk.S.split("friend#cur#")[1];
      friendIds.push(friendId);
      keys.push({
        pk: `u#${friendId}`,
        sk: `friend#cur#${userId}`,
      });
    }
    if (dataItem.sk.S.startsWith("friend#req#in")) {
      const friendId = dataItem.sk.S.split("friend#req#in#")[1];
      friendReqInIds.push(friendId);
      keys.push({
        pk: `u#${friendId}`,
        sk: `friend#req#out#${userId}`,
      });
    }
    if (dataItem.sk.S.startsWith("friend#req#out")) {
      const friendId = dataItem.sk.S.split("friend#req#out#")[1];
      friendReqOutIds.push(friendId);
      keys.push({
        pk: `u#${friendId}`,
        sk: `friend#req#in#${userId}`,
      });
    }
  }
  return {
    userInfo: { selfSubs, friendIds, friendReqInIds, friendReqOutIds },
    keys,
  };
}

async function tryNotifyClients(userId, userInfo) {
  const deletionNotifications = {
    senderId: userId,
    senderInfo: userInfo,
    notifications: {
      forFriends: {
        notificationType: "FriendRemoved",
        data: {
          userId,
        },
      },
      forSelf: {
        notificationType: "SelfProfileDeleted",
      },
      forFriendRequests: {
        notificationType: "FriendRequestRemoved",
        data: {
          userId,
        },
      },
    },
  };
  const params = {
    FunctionName: process.env.NOTIFY_CLIENT_FUNCTION_NAME,
    InvocationType: "Event",
    Payload: JSON.stringify(deletionNotifications),
  };
  try {
    const result = await lambdaClient.send(new InvokeCommand(params));
    if (result.$metadata.httpStatusCode !== 202) {
      throw new Error(
        `received non-202 status code from client notifier: ${result}`,
      );
    }
  } catch (error) {
    console.error("Error invoking client notifier:", error);
  }
}
