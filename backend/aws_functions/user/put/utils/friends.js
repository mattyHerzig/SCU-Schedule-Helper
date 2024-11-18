import { client } from "./dynamoClient.js";
import { PutItemCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { removeIncomingRequest } from "./friendRequests.js";
const tableName = process.env.SCU_SCHEDULE_HELPER_DDB_TABLE_NAME;

export async function friends(userId, friendsData) {
  if (friendsData.add && Array.isArray(friendsData.add)) {
    for (const friendId of friendsData.add) {
      await addFriend(userId, friendId);
    }
  }

  if (friendsData.remove && Array.isArray(friendsData.remove)) {
    for (const friendId of friendsData.remove) {
      await removeFriend(userId, friendId);
    }
  }
}

export async function addFriend(userId, friendId) {
  const params = {
    TableName: tableName,
    Item: {
      pk: { S: `u#${userId}` },
      sk: { S: `friend#cur#${friendId}` },
    },
  };

  try {
    await client.send(new PutItemCommand(params)); 
    console.log(`Friend ${friendId} added for user ${userId}`);
  } catch (error) {
    console.error(`Error adding friend ${friendId} to user ${userId}:`, error);
    throw error;
  }

  const paramsFriend = {
    TableName: tableName,
    Item: {
      pk: { S: `u#${friendId}` },
      sk: { S: `friend#cur#${userId}` },
    },
  };

  try {
    await client.send(new PutItemCommand(paramsFriend));
    console.log(`Friend ${userId} added for user ${friendId}`);
  } catch (error) {
    console.error(`Error adding friend ${userId} to user ${friendId}:`, error);
    throw error;
  }

  removeIncomingRequest(userId, friendId);
}

export async function removeFriend(userId, friendId) {
  const params = {
    TableName: tableName,
    Key: {
      pk: { S: `u#${userId}` },
      sk: { S: `friend#cur#${friendId}` },
    },
  };

  try {
    await client.send(new DeleteItemCommand(params)); 
    console.log(`Friend ${friendId} removed for user ${userId}`);
  } catch (error) {
    console.error(`Error removing friend ${friendId} from user ${userId}:`, error);
    throw error;
  }

  const params2 = {
    TableName: tableName,
    Key: {
      pk: { S: `u#${friendId}` },
      sk: { S: `friend#cur#${userId}` },
    },
  };

  try {
    await client.send(new DeleteItemCommand(params2)); 
    console.log(`Friend ${userId} removed for user ${friendId}`);
  } catch (error) {
    console.error(`Error removing friend ${userId} from user ${friendId}:`, error);
    throw error;
  }
}

