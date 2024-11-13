const defaults = {
  extendColorHorizontally: false,
  individualDifficultyColor: true,
  includeColor2: true,
  color1: "#00FF00",
  color2: "#FFFF00",
  color3: "#FF0000",
  opacity: 50, // 0-100
  useEvals: false,
};

const downloadEvalsUrl = "https://api.scu-schedule-helper.me/evals"; // also in `manifest.json`

async function fetchUserInfo(token) {
  const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (userInfoResponse.ok) {
    const userInfo = await userInfoResponse.json();
    await chrome.storage.sync.set({
      accessToken: data.accessToken,
      accessTokenExpirationDate: data.accessTokenExpirationDate,
      refreshToken: data.refreshToken,
      userInfo: {
        name: userInfo.name,
        email: userInfo.email,
      },
    });
  }
}

async function authorize() {
  try {
    await chrome.identity.clearAllCachedAuthTokens();
    const { token } = await chrome.identity.getAuthToken({
      interactive: true,
    });
    const response = await fetch("https://api.scu-schedule-helper.me/auth_token", {
      method: "GET",
      headers: {
        Authorization: `OAuth ${token}`,
      },
    });
    const data = await response.json();

    if (response.status !== 200) {
      return [false, `Authorization failed. ${data.message}`];
    }

    await chrome.storage.sync.set({
      accessToken: data.accessToken,
      accessTokenExpirationDate: data.accessTokenExpirationDate,
      refreshToken: data.refreshToken,
    });

    await fetchUserInfo(data.accessToken);

    return [true, ""];
  } catch (error) {
    return [false, "Authorization failed. User cancelled."];
  }
}

async function downloadEvals() {
  const accessToken = await chrome.storage.sync.get(["accessToken"]);

  const response = await fetch(downloadEvalsUrl, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + accessToken.accessToken,
    },
  });
  const data = await response.json();

  const evalsExpirationDate = data.dataExpirationDate;
  const evals = await decodeAndDecompress(data.data);
}

async function decodeAndDecompress(base64EncodedGzippedData) {
  const binaryString = atob(base64EncodedGzippedData);
  const binaryData = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    binaryData[i] = binaryString.charCodeAt(i);
  }

  const decompressedStream = new Response(binaryData).body.pipeThrough(
    new DecompressionStream("gzip")
  );
  const decompressedText = await new Response(decompressedStream).text();
  const jsonData = JSON.parse(decompressedText);
  return jsonData;
}


async function downloadEvalsIfNeeded() {
  const { oauth_token: oAuthToken, accessToken } = await chrome.storage.sync.get([
    "oauth_token",
    "accessToken",
  ]);
  const { evals_expiration_date: evalsExpirationDate } = await chrome.storage.local.get(
    "evals_expiration_date"
  );

  if (oAuthToken && (evalsExpirationDate === undefined || evalsExpirationDate < new Date())) {
    await downloadEvals(accessToken);
  }
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.url !== undefined) {
    fetch(request.url)
      .then((response) => response.text())
      .then((data) => sendResponse(data))
      .catch((error) => console.error(error));
    return true;
  }

  switch (request) {
    case "settingsChanged":
      chrome.tabs.query({}, (tabs) => {
        for (let tab of tabs) {
          if (tab.url && tab.url.startsWith("https://www.myworkday.com/scu/")) {
            chrome.tabs.sendMessage(tab.id, "settingsChanged", (response) => {
              if (chrome.runtime.lastError) {
              } // ignore
            });
          }
        }
      });
      break;

    case "getDefaults":
      sendResponse(defaults);
      break;

    case "authorize":
      authorize().then(([authorized, failStatus]) => sendResponse([authorized, failStatus]));
      return true; // Keep the message channel open for asynchronous response

    case "downloadEvals":
      downloadEvals().then(() => sendResponse());
      return true;

    case "downloadEvalsIfNeeded":
      downloadEvalsIfNeeded().then(() => sendResponse());
      return true;
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url && tab.url.startsWith("https://www.myworkday.com/scu/")) {
      chrome.tabs.sendMessage(activeInfo.tabId, "settingsChanged", (response) => {
        if (chrome.runtime.lastError) {
        } // ignore
      });
    }
  });
});

/*
chrome.runtime.onInstalled.addListener(async (details) => {
  chrome.storage.sync.get("oauth_token", async ({ oauth_token: oAuthToken }) => {
    if (!oAuthToken) {
      chrome.tabs.create({ url: chrome.runtime.getURL("tab/index.html") });
    } else {
      const { accessToken } = await chrome.storage.sync.get(["accessToken"]);
      await fetchUserInfo(accessToken);
    }
  });

  if (details.reason === "install") {
    chrome.storage.sync.set(defaults);
  }
  // else if (details.reason == "update") {}
});
*/

self.addEventListener("push", function (event) {
  console.log(`Push had this data/text: "${event.data.text()}"`);
});

self.addEventListener("activate", (event) => {
  const serverSubscription = subscribe();
  chrome.storage.sync.set({ serverSubscription });
});

/*
// Download evals on startup if download was interrupted, or evals are expired
chrome.runtime.onStartup.addListener(() => {
  downloadEvalsIfNeeded();
});
*/

const SERVER_PUBLIC_KEY =
  "BLMxe4dFTN6sJ7U-ZFXgHUyhlI5udo11b4curIyRfCdGZMYjDx4kFoV3ejHzDf4hNZQOmW3UP6_dgyYTdg3LDIE";
const applicationServerKey = urlB64ToUint8Array(SERVER_PUBLIC_KEY);

async function subscribe() {
  try {
    let subscription = await self.registration.pushManager.subscribe({
      userVisibleOnly: false,
      applicationServerKey,
    });

    console.log(`Subscribed: ${JSON.stringify(subscription, 0, 2)}`);

    return subscription;
  } catch (error) {
    console.error("Subscribe error: ", error);
  }
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
