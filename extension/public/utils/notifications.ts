// Allow use of ServiceWorkerGlobalScope 'self' in this module
declare const self: ServiceWorkerGlobalScope;
import { fetchWithAuth, signOut } from "./authorization.ts";
import { PROD_USER_ENDPOINT } from "./constants.ts";
import {
  addFriendLocally,
  refreshUserData,
  addFriendRequestLocally,
  removeFriendRequestLocally,
  removeFriendLocally,
  clearFriendCourseAndSectionIndexes,
  updateFriendCourseAndSectionIndexes,
} from "./user.ts";

const SERVER_PUBLIC_KEY =
  "BLMxe4dFTN6sJ7U-ZFXgHUyhlI5udo11b4curIyRfCdGZMYjDx4kFoV3ejHzDf4hNZQOmW3UP6_dgyYTdg3LDIE";
const applicationServerKey = urlB64ToUint8Array(SERVER_PUBLIC_KEY);

/**
 * Subscribes the user to push notifications from the production server.
 * @returns {Promise<PushSubscription>}
 */
export async function subscribe() {
  const existingSubscription =
    await self.registration.pushManager.getSubscription();
  if (existingSubscription) {
    return existingSubscription;
  }
  try {
    let subscription = await self.registration.pushManager.subscribe({
      userVisibleOnly: false,
      applicationServerKey,
    });
    return subscription;
  } catch (error) {
    console.error("Subscribe error: ", error);
  }
}

/**
 * Respond to a notification received from the server.
 * @param {*} notification A JSON notification object received from the server with a notificationType and data field. 
 */
export async function handleNotification(notification) {
  const { notificationType, data } = notification;
  switch (notificationType) {
    case "FriendRequestAccepted":
      await handleFriendRequestAccepted(data.userId);
      break;
    case "FriendRequestReceived":
      await addFriendRequestLocally(data.userId, "incoming");
      break;
    case "FriendRequestRemoved":
      await removeFriendRequestLocally(data.userId, data.type);
      break;
    case "FriendRemoved":
      await removeFriendLocally(data.userId);
      break;
    case "FriendProfileUpdated":
      await handleFriendProfileUpdated(data.userId);
      break;
    case "FriendRequestProfileUpdated":
      await addFriendRequestLocally(data.userId, data.type);
      break;
    case "SelfProfileUpdated":
      await refreshUserData(data.items);
      break;
    case "SelfProfileDeleted":
      await signOut();
      break;
    default:
      break;
  }
}

async function handleFriendRequestAccepted(friendId) {
  const addFriendError = await addFriendLocally(friendId, "outgoing");
  if (addFriendError) {
    console.error("Error adding friend: ", addFriendError);
    return;
  }
}

async function handleFriendProfileUpdated(friendId) {
  const friendProfileResponse = await fetchWithAuth(
    `${PROD_USER_ENDPOINT}/${friendId}`,
  );
  if (!friendProfileResponse || !friendProfileResponse.ok) {
    return;
  }
  const friendProfile = await friendProfileResponse.json();
  const existingFriends =
    (await chrome.storage.local.get("friends")).friends || {};
  await chrome.storage.local.set({
    friends: {
      ...existingFriends,
      [friendId]: friendProfile,
    },
  });
  await clearFriendCourseAndSectionIndexes(friendId);
  await updateFriendCourseAndSectionIndexes(friendId, friendProfile.coursesTaken, friendProfile.interestedSections);
}

function urlB64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
