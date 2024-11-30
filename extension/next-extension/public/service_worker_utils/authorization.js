import { subscribe } from "./notifications.js";
import { prodAuthTokenEndpoint, prodUserEndpoint } from "./constants.js";
import { downloadEvals } from "./evals.js";
import { refreshUserData } from "./user.js";

/**
 * Triggers the OAuth flow to sign in the user, and creates an account for the user, using the OAuth info provided by Google.
 * @returns {Promise<string | null>} Error message or null if successful
 */
export async function signIn() {
  let oAuthToken;
  try {
    await chrome.identity.clearAllCachedAuthTokens();
    const { token } = await chrome.identity.getAuthToken({
      interactive: true,
    });
    oAuthToken = token;
  } catch (error) {
    return "Authorization failed. User cancelled.";
  }

  let subscription =
    (await self.registration.pushManager.getSubscription()) || null;
  if (!subscription) {
    subscription = await subscribe();
  }

  let response = await fetch(prodAuthTokenEndpoint, {
    method: "GET",
    headers: {
      Authorization: `OAuth ${oAuthToken}`,
    },
  });
  const data = await response.json();

  if (response.status !== 200) {
    return `Authorization failed. ${data.message}`;
  }

  await chrome.storage.sync.set({
    accessToken: data.accessToken,
    accessTokenExpirationDate: data.accessTokenExpirationDate,
    refreshToken: data.refreshToken,
  });

  // Start eval download in background.
  downloadEvals();

  const createdUser = await fetch(prodUserEndpoint, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + data.accessToken,
    },
    body: JSON.stringify({
      name: data.oAuthInfo.name,
      photoUrl: data.oAuthInfo.photoUrl,
      subscription: JSON.stringify(subscription),
    }),
  });
  const createdUserData = await createdUser.json();
  if (
    createdUser.status === 400 &&
    createdUserData.message.includes("user already exists")
  ) {
    return await updateSubscriptionAndRefreshUserData(
      JSON.stringify(subscription),
    );
  } else if (createdUser.status !== 201) {
    return `Error creating account. ${createdUser.message}`;
  }

  await chrome.storage.local.set({
    userInfo: {
      id: createdUserData.id,
      name: createdUserData.name,
      photoUrl: createdUserData.photoUrl,
      preferences: createdUserData.preferences,
      coursesTaken: createdUserData.coursesTaken,
      interestedSections: createdUserData.interestedSections,
    },
    friends: {},
    friendRequestsIn: {},
    friendRequestsOut: {},
    friendCoursesTaken: {},
    friendInterestedSections: {},
  });
  return null;
}

async function updateSubscriptionAndRefreshUserData(subscription) {
  const response = await fetchWithAuth(`${prodUserEndpoint}`, {
    method: "PUT",
    body: JSON.stringify({
      personal: {
        subscriptions: [subscription],
      },
    }),
  });
  if (!response || !response.ok) {
    return "Error adding subscription. Please try again later.";
  }
  return await refreshUserData();
}

/**
 * Signs out the user by clearing all local and sync storage.
 * Leaves the user's preferences in tact.
 */
export async function signOut() {
  const currentUserInfo = (await chrome.storage.local.get("userInfo"))
    ?.userInfo || {
    coursesTaken: [],
    interestedSections: [],
    preferences: {
      scoreWeighting: {
        scuEvals: 50,
        rmp: 50,
      },
      preferredSectionTimeRange: {
        startHour: 6,
        startMinute: 0,
        endHour: 20,
        endMinute: 0,
      },
    },
  };
  delete currentUserInfo.id;
  delete currentUserInfo.email;
  delete currentUserInfo.name;
  delete currentUserInfo.photoUrl;
  delete currentUserInfo.subscriptions;
  delete currentUserInfo.interestedSections;
  delete currentUserInfo.coursesTaken;
  await chrome.storage.local.clear();
  await chrome.storage.sync.clear();
  await chrome.storage.local.set({
    userInfo: currentUserInfo,
  });
}

/**
 * Fetch a URL with the user's access token.
 * @param {*} endpoint The URL to fetch.
 * @param {*} requestInit The request object to pass to fetch.
 * @param {*} retries Number of times to retry the request if it fails with a 401.
 * @returns {Promise<Response | null>} The response object from the fetch.
 */
export async function fetchWithAuth(endpoint, requestInit = {}, retries = 1) {
  const accessTokenData = await chrome.storage.sync.get([
    "accessToken",
    "accessTokenExpirationDate",
  ]);
  if (
    !accessTokenData.accessToken ||
    !accessTokenData.accessTokenExpirationDate ||
    new Date(accessTokenData.accessTokenExpirationDate) < new Date()
  ) {
    accessTokenData.accessToken = await refreshAccessToken();
  }
  if (!accessTokenData.accessToken) {
    return null;
  }
  if (!requestInit.headers) {
    requestInit.headers = {};
  }
  requestInit.headers.Authorization = `Bearer ${accessTokenData.accessToken}`;
  const response = await fetch(endpoint, {
    ...requestInit,
  });
  if (response.status === 401 && retries > 0) {
    await refreshAccessToken();
    return fetchWithAuth(endpoint, requestInit, retries - 1);
  }
  return response;
}

async function refreshAccessToken() {
  const refreshTokenData = await chrome.storage.sync.get("refreshToken");
  if (!refreshTokenData.refreshToken) {
    return null;
  }
  const response = await fetch(prodAuthTokenEndpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${refreshTokenData.refreshToken}`,
    },
  });
  const data = await response.json();
  if (response.status !== 200) {
    console.error("Error refreshing access token:", data.message);
    return null;
  }
  await chrome.storage.sync.set({
    accessToken: data.accessToken,
    accessTokenExpirationDate: data.accessTokenExpirationDate,
  });
  return data.accessToken;
}
