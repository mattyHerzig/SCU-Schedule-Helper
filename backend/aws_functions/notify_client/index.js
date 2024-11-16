import webpush from "web-push";
import { handleWithAuthorization } from "./utils/authorization";
import {
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";

const ddbClient = new DynamoDBClient({ region: process.env.AWS_DDB_REGION });

webpush.setGCMAPIKey(process.env.FIREBASE_API_KEY);
webpush.setVapidDetails(
  "mailto:stephenwdean@gmail.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

// TODO: Actually get the user's push subscription from DDB.
const pushSubscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/id",
  expirationTime: null,
  keys: {
    p256dh: "",
    auth: "",
  },
};

export async function handler(event, context) {
  if (!event.userId) {
    throw new Error("userId is required");
  }
  await notifyClients(event.userId, event.notifications);
}

async function notifyClients(userId, notifications) {
  const friendIds = await getFriendIds(userId);
  for (const friend of friendIds) {
    const subscriptions = await getSubscriptions(friend);
    for (const subscription of subscriptions) {
      await webpush.sendNotification(subscription, notifications.friend);
    }
  }
  const contextualUserSubscriptions = await getSubscriptions(userId);
  // If the user only has one subscription, don't send them a notification as they are already aware of the update.
  if (contextualUserSubscriptions.length > 1) {
    for (const subscription of contextualUserSubscriptions) {
      await webpush.sendNotification(subscription, notifications.self);
    }
  }
}

async function getFriendIds(userId) {
  const friendSk = "friend#cur#";
  const command = new QueryCommand({
    TableName: process.env.USERS_TABLE,
    KeyConditionExpression: "pk = :pk and begins_with(sk, :sk)",
    ExpressionAttributeValues: {
      ":pk": { S: `u#${userId}` },
      ":sk": { S: friendSk },
    },
  });
  const response = await ddbClient.send(command);
  if (!response || !response.Items) {
    return [];
  }
  return response.Items.map((item) => item.sk.S.substring(friendSk.length));
}

async function getSubscriptions(userId) {
  const command = new GetItemCommand({
    TableName: process.env.SUBSCRIPTIONS_TABLE,
    Key: {
      pk: { S: `u#${userId}` },
      sk: { S: `info#personal` },
    },
  });

  const personalInfo = await ddbClient.send(command);
  if (
    !personalInfo ||
    !personalInfo.Item ||
    !personalInfo.Item.subscriptions ||
    !personalInfo.Item.subscriptions.SS
  ) {
    throw new Error(`No subscriptions found for user ${userId}`);
  }

  const subscriptions = [];
  for (const subscription of personalInfo.Item.subscriptions.SS) {
    subscriptions.push(JSON.parse(subscription));
  }
  return subscriptions;
}
