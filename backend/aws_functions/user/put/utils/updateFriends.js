import { dynamoClient, tableName } from "../index.js";
import {
  GetItemCommand,
  BatchWriteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { removeFriendRequest } from "./updateFriendRequests.js";

export async function updateFriends(userId, friendsData) {
  const updates = [];
  if (friendsData.add && Array.isArray(friendsData.add)) {
    for (const friendId of friendsData.add) {
      updates.push(addFriend(userId, friendId));
    }
  }
  if (friendsData.remove && Array.isArray(friendsData.remove)) {
    for (const friendId of friendsData.remove) {
      updates.push(removeFriend(userId, friendId));
    }
  }
  await Promise.all(updates);
}

async function addFriend(userId, friendId) {
  if (!(await receivedIncomingFriendRequest(userId, friendId))) {
    console.error(
      `Error adding friend ${friendId} to user ${userId}: user ${userId} has not received friend request from (or is already friends with) ${friendId}`,
    );
    throw new Error(
      `You have not received a friend request from this user, or are already friends with them`,
      { cause: 400 },
    );
  }

  const addFriendForCurrentUser = {
    PutRequest: {
      Item: {
        pk: { S: `u#${userId}` },
        sk: { S: `friend#cur#${friendId}` },
      },
    },
  };

  const addFriendForOtherUser = {
    PutRequest: {
      Item: {
        pk: { S: `u#${friendId}` },
        sk: { S: `friend#cur#${userId}` },
      },
    },
  };

  const batchPutItem = {
    RequestItems: {
      [tableName]: [addFriendForCurrentUser, addFriendForOtherUser],
    },
  };

  const putResponse = await dynamoClient.send(
    new BatchWriteItemCommand(batchPutItem),
  );
  if (putResponse.$metadata.httpStatusCode !== 200) {
    console.error(
      `Error adding friend ${friendId} to user ${userId}: received HTTP status code ${putResponse.$metadata.httpStatusCode} from DDB`,
    );
    throw new Error(`INTERNAL: Error adding friend ${friendId} to user ${userId}`, {
      cause: 500,
    });
  }
  await removeFriendRequest(userId, friendId);
}

async function removeFriend(userId, friendId) {
  const removeFriendFromCurrentUser = {
    DeleteRequest: {
      Key: {
        pk: { S: `u#${userId}` },
        sk: { S: `friend#cur#${friendId}` },
      },
    },
  };

  const removeFriendFromOtherUser = {
    DeleteRequest: {
      Key: {
        pk: { S: `u#${friendId}` },
        sk: { S: `friend#cur#${userId}` },
      },
    },
  };

  const batchDeleteItem = {
    RequestItems: {
      [tableName]: [removeFriendFromCurrentUser, removeFriendFromOtherUser],
    },
  };

  const deleteResponse = await dynamoClient.send(
    new BatchWriteItemCommand(batchDeleteItem),
  );
  if (deleteResponse.$metadata.httpStatusCode !== 200) {
    console.error(
      `Error removing friend ${friendId} from user ${userId}: received HTTP status code ${deleteResponse.$metadata.httpStatusCode} from DDB`,
    );
    throw new Error(`INTERNAL: Error removing friend ${friendId} from user ${userId}`, {
      cause: 500,
    });
  }
}

export async function receivedIncomingFriendRequest(
  userIdReceiving,
  userIdSending,
) {
  const input = {
    Key: {
      pk: {
        S: `u#${userIdReceiving}`,
      },
      sk: {
        S: `friend#req#in#${userIdSending}`,
      },
    },
    TableName: tableName,
  };
  const command = new GetItemCommand(input);
  const response = await dynamoClient.send(command);
  if (response.$metadata.httpStatusCode !== 200) {
    console.error(
      `Error checking if friend request exists (received HTTP status code from DynamoDB: ${response.$metadata.httpStatusCode}).`,
    );
    throw new Error(
      `INTERNAL: Error checking if friend request exists for user ${userIdReceiving} from user ${userIdSending}`,
      { cause: 500 },
    );
  }
  return response.Item;
}
