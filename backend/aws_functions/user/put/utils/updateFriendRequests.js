import { client } from "./dynamoClient.js";
import {
  BatchWriteItemCommand,
  GetItemCommand,
} from "@aws-sdk/client-dynamodb";
const tableName = process.env.SCU_SCHEDULE_HELPER_DDB_TABLE_NAME;

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
      `Error sending friend request to ${friendId} from ${userId}: user cannot send friend request to themselves`,
    );
    throw new Error(`user cannot send friend request to themselves`, {
      cause: 400,
    });
  }
  if (!(await userExists(friendId))) {
    console.error(
      `Error sending friend request to ${friendId} from ${userId}: user ${friendId} does not exist`,
    );
    throw new Error(`user ${friendId} does not exist`, { cause: 400 });
  }
  if (await receivedIncomingFriendRequest(userId, friendId)) {
    console.error(
      `Error sending friend request to ${friendId} from ${userId}: user ${userId} has already received friend request from ${friendId}`,
    );
    throw new Error(
      `user ${userId} has already received friend request from ${friendId}`,
      { cause: 400 },
    );
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

  const batchWriteResponse = await client.send(
    new BatchWriteItemCommand(batchPutItem),
  );
  if (
    batchWriteResponse.$metadata.httpStatusCode !== 200 ||
    !batchWriteResponse.UnprocessedItems
  ) {
    console.error(`Batch write failed for friend request from ${userId} to ${friendId},
         received HTTP status code from DynamoDB: ${batchWriteResponse.$metadata.httpStatusCode}
         and unprocessed items: ${batchWriteResponse.UnprocessedItems}`);
    throw new Error(`failed to send friend request to ${friendId}`, {
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

  const batchWriteResponse = await client.send(
    new BatchWriteItemCommand(batchDeleteItem),
  );
  if (
    batchWriteResponse.$metadata.httpStatusCode !== 200 ||
    !batchWriteResponse.UnprocessedItems
  ) {
    console.error(`Batch delete failed for friend request from ${userIdReceiving} to ${userIdSending},
         received HTTP status code from DynamoDB: ${batchWriteResponse.$metadata.httpStatusCode}
         and unprocessed items: ${batchWriteResponse.UnprocessedItems}`);
    throw new Error(`failed to remove friend request from ${userIdSending}`, {
      cause: 500,
    });
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
  const response = await client.send(command);
  return response.Item;
}

async function receivedIncomingFriendRequest(userIdReceiving, userIdSending) {
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
  const response = await client.send(command);
  return response.Item;
}
