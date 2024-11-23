import webpush from "web-push";
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

export async function handler(event, context) {
  if (!event.senderId) {
    throw new Error("sending user id is required");
  }
  if (!event.notifications) {
    throw new Error("notifications are required");
  }
  if (
    !event.notifications.forIndividual &&
    !event.notifications.forFriends &&
    !event.notifications.forFriendRequests &&
    !event.notifications.forSelf
  ) {
    throw new Error(
      "notifications must contain at least one of forIndividual, forFriends, forFriendRequests, or forSelf",
    );
  }
  await sendNotifications(
    event.senderId,
    event.senderInfo,
    event.notifications,
  );
}

async function sendNotifications(senderId, senderInfo, notifications) {
  const friendAndFriendReqIds = senderInfo || (await getFriendIds(senderId));
  const notificationsToSend = [];
  if (notifications.forIndividual) {
    const subs = await getSubscriptions(notifications.forIndividual.userId);
    notificationsToSend.push(
      ...sendToSubs(subs, notifications.forIndividual.notification),
    );
  }
  if (notifications.forFriends)
    notificationsToSend.push(
      ...(await pushToUsers(
        friendAndFriendReqIds.friendIds,
        notifications.forFriends,
      )),
    );
  if (notifications.forFriendRequests) {
    const friendReqInNotifications = notifications.forFriendRequests;
    friendReqInNotifications.data.type = "outgoing"; // From the other user's perspective, it is an outgoing request.
    notificationsToSend.push(
      ...(await pushToUsers(
        friendAndFriendReqIds.friendReqInIds,
        friendReqInNotifications,
      )),
    );
    const friendReqOutNotifications = notifications.forFriendRequests;
    friendReqOutNotifications.data.type = "incoming"; // From the other user's perspective, it is an incoming request.
    notificationsToSend.push(
      ...(await pushToUsers(
        friendAndFriendReqIds.friendReqOutIds,
        friendReqOutNotifications,
      )),
    );
  }
  if (notifications.forSelf) {
    // If the user only has one subscription, don't send them a notification as they are already aware of the update.
    const contextualUserSubscriptions =
      senderInfo?.selfSubs || (await getSubscriptions(senderId));
    if (contextualUserSubscriptions.length > 1) {
      notificationsToSend.push(
        ...sendToSubs(contextualUserSubscriptions, notifications.forSelf),
      );
    }
  }
  await Promise.all(notificationsToSend);
}

async function pushToUsers(userIds, notification) {
  const notificationsToSend = [];
  for (const userId of userIds) {
    const subscriptions = await getSubscriptions(userId);
    notificationsToSend.push(...sendToSubs(subscriptions, notification));
  }
  return notificationsToSend;
}

function sendToSubs(subscriptions, notification) {
  const notificationsToSend = [];
  for (const subscription of subscriptions) {
    notificationsToSend.push(
      webpush.sendNotification(subscription, JSON.stringify(notification)),
    );
  }
  return notificationsToSend;
}

async function getFriendIds(userId) {
  const friendSk = "friend#"; // Can be either friend#cur or friend#req#in or friend#req#out
  const command = new QueryCommand({
    TableName: process.env.SCU_SCHEDULE_HELPER_DDB_TABLE_NAME,
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
  // Delete the prefix from the sort key to get the friend's user ID.
  const friendIds = response.Items.map((item) =>
    item.sk.S.slice("friend#cur#".length),
  );
  const friendReqInIds = response.Items.map((item) =>
    item.sk.S.slice("friend#req#in#".length),
  );
  const friendReqOutIds = response.Items.map((item) =>
    item.sk.S.slice("friend#req#out#".length),
  );
  return {
    friendIds,
    friendReqInIds,
    friendReqOutIds,
  };
}

async function getSubscriptions(userId) {
  const command = new GetItemCommand({
    TableName: process.env.SCU_SCHEDULE_HELPER_DDB_TABLE_NAME,
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
