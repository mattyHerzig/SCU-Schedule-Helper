import { dynamoClient, tableName } from "../index.js";
import { receivedIncomingFriendRequest } from "./updateFriends.js";
import {
  BatchWriteItemCommand,
  GetItemCommand,
} from "@aws-sdk/client-dynamodb";

export async function updateFriendRequests(userId, friendRequestsData) {
  const updates = [];
  if (friendRequestsData.send && Array.isArray(friendRequestsData.send)) {
    for (const friendId of friendRequestsData.send) {
      updates.push(sendFriendRequest(userId, friendId));
    }
  }
  if (
    friendRequestsData.removeIncoming &&
    Array.isArray(friendRequestsData.removeIncoming)
  ) {
    for (const friendId of friendRequestsData.removeIncoming) {
      updates.push(removeFriendRequest(userId, friendId));
    }
  }
  if (
    friendRequestsData.removeOutgoing &&
    Array.isArray(friendRequestsData.removeOutgoing)
  ) {
    for (const friendId of friendRequestsData.removeOutgoing) {
      updates.push(removeFriendRequest(friendId, userId));
    }
  }
  await Promise.all(updates);
}

async function sendFriendRequest(userId, friendId) {
  if (userId === friendId) {
    console.error(
      `Error sending friend request to ${friendId} from ${userId}: user cannot send friend request to themselves`
    );
    throw new Error(`You cannot send a friend request to yourself.`, {
      cause: 400,
    });
  }

  const potentialErrors = [
    {
      condition: !userExists(userId),
      internalErrorMessage: `Error sending friend request to ${friendId} from ${userId}: user ${userId} does not exist`,
      externalErrorMessage: `Cannot send friend request to a user who does not exist.`,
      cause: 400,
    },
    {
      condition: receivedIncomingFriendRequest(userId, friendId),
      internalErrorMessage: `Error sending friend request to ${friendId} from ${userId}: user ${userId} has already received friend request from ${friendId}`,
      externalErrorMessage: `You've currently have a pending friend request from this user.`,
      cause: 400,
    },
    {
      condition: sentFriendRequest(userId, friendId),
      internalErrorMessage: `Error sending friend request to ${friendId} from ${userId}: user ${userId} has already sent friend request to ${friendId}`,
      externalErrorMessage: `You've already sent a friend request to this user.`,
      cause: 400,
    },
    {
      condition: usersAlreadyFriends(userId, friendId),
      internalErrorMessage: `Error sending friend request to ${friendId} from ${userId}: user ${userId} is already friends with ${friendId}`,
      externalErrorMessage: `You are already friends with this user.`,
      cause: 400,
    },
  ];
  await Promise.all(
    potentialErrors.map((potentialError) => potentialError.condition)
  ); // Check error conditions concurrently.
  for (const potentialError of potentialErrors) {
    if (await potentialError.condition) {
      console.error(potentialError.internalErrorMessage);
      throw new Error(potentialError.externalErrorMessage, {
        cause: potentialError.cause,
      });
    }
  }
  const outgoingReq = {
    PutRequest: {
      Item: {
        pk: { S: `u#${userId}` },
        sk: { S: `friend#req#out#${friendId}` },
      },
    },
  };
  const incomingReq = {
    PutRequest: {
      Item: {
        pk: { S: `u#${friendId}` },
        sk: { S: `friend#req#in#${userId}` },
      },
    },
  };
  const batchPutItem = {
    RequestItems: {
      [tableName]: [outgoingReq, incomingReq],
    },
  };

  const batchWriteResponse = await dynamoClient.send(
    new BatchWriteItemCommand(batchPutItem)
  );
  if (
    batchWriteResponse.$metadata.httpStatusCode !== 200 ||
    !batchWriteResponse.UnprocessedItems
  ) {
    console.error(`Batch write failed for friend request from ${userId} to ${friendId},
         received HTTP status code from DynamoDB: ${batchWriteResponse.$metadata.httpStatusCode}
         and unprocessed items: ${batchWriteResponse.UnprocessedItems}`);
    throw new Error(`INTERNAL: Failed to send friend request to ${friendId}`, {
      cause: 500,
    });
  }
}

export async function removeFriendRequest(userIdReceiving, userIdSending) {
  const deleteIncoming = {
    DeleteRequest: {
      Key: {
        pk: { S: `u#${userIdReceiving}` },
        sk: { S: `friend#req#in#${userIdSending}` },
      },
    },
  };
  const deleteOutgoing = {
    DeleteRequest: {
      Key: {
        pk: { S: `u#${userIdSending}` },
        sk: { S: `friend#req#out#${userIdReceiving}` },
      },
    },
  };
  const batchDeleteItem = {
    RequestItems: {
      [tableName]: [deleteIncoming, deleteOutgoing],
    },
  };

  const batchWriteResponse = await dynamoClient.send(
    new BatchWriteItemCommand(batchDeleteItem)
  );
  if (
    batchWriteResponse.$metadata.httpStatusCode !== 200 ||
    !batchWriteResponse.UnprocessedItems
  ) {
    console.error(`Batch delete failed for friend request from ${userIdReceiving} to ${userIdSending},
         received HTTP status code from DynamoDB: ${batchWriteResponse.$metadata.httpStatusCode}
         and unprocessed items: ${batchWriteResponse.UnprocessedItems}`);
    throw new Error(
      `INTERNAL: Failed to remove friend request from ${userIdSending}`,
      {
        cause: 500,
      }
    );
  }
}

async function userExists(userId) {
  const input = {
    Key: {
      pk: {
        S: `u#${userId}`,
      },
      sk: {
        S: "info#personal",
      },
    },
    TableName: tableName,
  };
  const command = new GetItemCommand(input);
  const response = await dynamoClient.send(command);
  return response.Item;
}

async function usersAlreadyFriends(userId, friendId) {
  const input = {
    Key: {
      pk: {
        S: `u#${userId}`,
      },
      sk: {
        S: `friend#cur#${friendId}`,
      },
    },
    TableName: tableName,
  };
  const command = new GetItemCommand(input);
  const response = await dynamoClient.send(command);
  return response.Item;
}

async function sentFriendRequest(userId, friendId) {
  const input = {
    Key: {
      pk: {
        S: `u#${userId}`,
      },
      sk: {
        S: `friend#req#out#${friendId}`,
      },
    },
    TableName: tableName,
  };
  const command = new GetItemCommand(input);
  const response = await dynamoClient.send(command);
  return response.Item;
}
