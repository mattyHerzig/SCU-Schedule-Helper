import { client } from "./dynamoClient.js";
import { PutItemCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
const tableName = process.env.SCU_SCHEDULE_HELPER_DDB_TABLE_NAME;

export async function friendRequests(userId, friendRequestsData) {
  if (friendRequestsData.send && Array.isArray(friendRequestsData.send)) {
    for (const friendId of friendRequestsData.send) {
      await sendFriendRequest(userId, friendId);
    }
  }

  if (friendRequestsData.removeIncoming && Array.isArray(friendRequestsData.removeIncoming)) {
    for (const friendId of friendRequestsData.removeIncoming) {
      await removeIncomingRequest(userId, friendId);
    }
  }

  if (friendRequestsData.removeOutgoing && Array.isArray(friendRequestsData.removeOutgoing)) {
    for (const friendId of friendRequestsData.removeOutgoing) {
      await removeOutgoingRequest(userId, friendId);
    }
  }
}

async function sendFriendRequest(userId, friendId) {
  const params = {
    TableName: tableName,
    Item: {
      pk: { S: `u#${userId}` },
      sk: { S: `friend#req#out#${friendId}` },
    },
  };

  try {
    await client.send(new PutItemCommand(params)); 
    console.log(`Outgoing friend request added for ${userId}`);
  } catch (error) {
    console.error(`Outgoing friend request not added for ${userId}:`, error);
    throw error;
  }

  const params2 = {
    TableName: tableName,
    Item: {
      pk: { S: `u#${friendId}` },
      sk: { S: `friend#req#in#${userId}` },
    },
  };

  try {
    await client.send(new PutItemCommand(params2)); 
    console.log(`Incoming friend request added for ${friendId}`);
  } catch (error) {
    console.error(`Incoming friend request not added for ${friendId}:`, error);
    throw error;
  }
}

export async function removeIncomingRequest(userId, friendId) {
  const params = {
    TableName: tableName,
    Key: {
      pk: { S: `u#${userId}` },
      sk: { S: `friend#req#in#${friendId}` },
    },
  };

  try {
    await client.send(new DeleteItemCommand(params)); 
    console.log(`Incoming friend request removed for ${userId}`);
  } catch (error) {
    console.error(`Incoming friend request not removed for ${userId}:`, error);
    throw error;
  }

  const params2 = {
    TableName: tableName,
    Key: {
      pk: { S: `u#${friendId}` },
      sk: { S: `friend#req#out#${userId}` },
    },
  };

  try {
    await client.send(new DeleteItemCommand(params2)); 
    console.log(`Outgoing friend request removed for ${friendId}`);
  } catch (error) {
    console.error(`Outgoing friend request not removed for ${friendId}:`, error);
    throw error;
  }
}

async function removeOutgoingRequest(userId, friendId) {
  const params = {
    TableName: tableName,
    Key: {
      pk: { S: `u#${userId}` },
      sk: { S: `friend#req#out#${friendId}` },
    },
  };

  try {
    await client.send(new DeleteItemCommand(params)); 
    console.log(`Outgoing friend request removed for ${userId}`);
  } catch (error) {
    console.error(`Outgoing friend request not removed for ${userId}:`, error);
    throw error;
  }

  const params2 = {
    TableName: tableName,
    Key: {
      pk: { S: `u#${friendId}` },
      sk: { S: `friend#req#in#${userId}` },
    },
  };

  try {
    await client.send(new DeleteItemCommand(params2)); 
    console.log(`Incoming friend request removed for ${friendId}`);
  } catch (error) {
    console.error(`Incoming friend request not removed for ${friendId}:`, error);
    throw error;
  }
}
