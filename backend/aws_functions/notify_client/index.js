import webpush from "web-push";

webpush.setGCMAPIKey(process.env.FIREBASE_API_KEY);
webpush.setVapidDetails(
  "mailto:stephenwdean@gmail.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
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

function handler(event, context) {
  webpush.sendNotification(pushSubscription, "push notification data");
}
