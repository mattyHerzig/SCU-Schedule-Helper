import { lambdaClient } from "../index.js";
import { InvokeCommand } from "@aws-sdk/client-lambda";

export async function sendProfileUpdateNotifications(userId, requestBody) {
  if (
    !requestBody.coursesTaken &&
    !requestBody.interestedSections &&
    !requestBody.personal
  ) {
    return;
  }
  const notificationBody = {
    senderId: userId,
    notifications: {},
  };
  if (
    requestBody.coursesTaken ||
    requestBody.interestedSections ||
    requestBody.personal
  ) {
    notificationBody.notifications.forFriends = {
      notificationType: "FriendProfileUpdated",
      data: {
        userId,
      },
    };
  }
  if (requestBody.personal) {
    notificationBody.notifications.forFriendRequests = {
      notificationType: "FriendRequestProfileUpdated",
      data: {
        userId,
      },
    };
  }
  await trySendNotification(notificationBody);
}

export async function sendFriendAndFriendRequestNotifications(userId, body) {
  if (!body.friends && !body.friendRequests) {
    return;
  }
  const notificationBody = {
    senderId: userId,
    notifications: {},
  };
  for (const friendId of body.friends?.add || []) {
    notificationBody.notifications.forIndividual = {
      userId: friendId,
      notification: {
        notificationType: "FriendRequestAccepted",
        data: {
          userId,
        },
      },
    };
    await trySendNotification(notificationBody);
  }
  for (const friendId of body.friends?.remove || []) {
    notificationBody.notifications.forIndividual = {
      userId: friendId,
      notification: {
        notificationType: "FriendRemoved",
        data: {
          userId,
        },
      },
    };
    await trySendNotification(notificationBody);
  }
  for (const friendId of body.friendRequests?.send || []) {
    notificationBody.notifications.forIndividual = {
      userId: friendId,
      notification: {
        notificationType: "FriendRequestReceived",
        data: {
          userId,
        },
      },
    };
    await trySendNotification(notificationBody);
  }
  for (const friendId of body.friendRequests?.removeIncoming || []) {
    notificationBody.notifications.forIndividual = {
      userId: friendId,
      notification: {
        notificationType: "FriendRequestRemoved",
        data: {
          type: "outgoing",
          userId,
        },
      },
    };
    await trySendNotification(notificationBody);
  }
  for (const friendId of body.friendRequests?.removeOutgoing || []) {
    notificationBody.notifications.forIndividual = {
      userId: friendId,
      notification: {
        notificationType: "FriendRequestRemoved",
        data: {
          type: "incoming",
          userId,
        },
      },
    };
    await trySendNotification(notificationBody);
  }
}

export async function sendSelfUpdateNotifications(userId, requestBody) {
  const updatedItems = Object.keys(requestBody);
  if (updatedItems.length === 0) {
    return;
  }
  const notificationBody = {
    senderId: userId,
    notifications: {
      forSelf: {
        notificationType: "SelfProfileUpdated",
        data: {
          items: updatedItems,
        },
      },
    },
  };
  await trySendNotification(notificationBody);
}

async function trySendNotification(notificationBody) {
  const invokeClientNotifierParams = {
    FunctionName: process.env.NOTIFY_CLIENT_FUNCTION_NAME,
    InvocationType: "Event",
    Payload: JSON.stringify(notificationBody),
  };
  console.log(
    `Sending notification: ${JSON.stringify(invokeClientNotifierParams, null, 2)}`,
  );
  try {
    const result = await lambdaClient.send(
      new InvokeCommand(invokeClientNotifierParams),
    );
    if (result.$metadata.httpStatusCode !== 202) {
      throw new Error(
        `received non-202 status code from client notifier: ${result}`,
      );
    }
  } catch (error) {
    console.error("Error invoking client notifier:", error);
  }
}
