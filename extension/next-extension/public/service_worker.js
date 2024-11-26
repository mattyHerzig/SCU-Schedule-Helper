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

async function authorize() {
  try {
    await chrome.identity.clearAllCachedAuthTokens();
    const { token } = await chrome.identity.getAuthToken({
      interactive: true,
    });
    let subscription =
      (await self.registration.pushManager.getSubscription()) || null;
    if (!subscription) {
      console.log("No subscription found");
      subscription = await subscribe();
    }

    let response = fetch("https://api.scu-schedule-helper.me/auth_token", {
      method: "GET",
      headers: {
        Authorization: `OAuth ${token}`,
      },
    });
    [response, subscription] = await Promise.all([response, subscription]);
    const data = await response.json();

    if (response.status !== 200) {
      // Return a tuple with false and the error message
      return [false, `Authorization failed. ${data.message}`];
    }

    console.log(data.oAuthInfo);
    const createdUser = await fetch("https://api.scu-schedule-helper.me/user", {
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
    console.log(await createdUser.json());
    console.log(
      "Created account with sub" + JSON.stringify(subscription, null, 2),
    );

    await chrome.storage.sync.set({
      accessToken: data.accessToken,
      accessTokenExpirationDate: data.accessTokenExpirationDate,
      refreshToken: data.refreshToken,
      oAuthInfo: data.oAuthInfo,
    });

    // Return a tuple with true and null (no error)
    return [true, null];
  } catch (error) {
    // Return a tuple with false and the error message
    return [false, "Authorization failed. User cancelled."];
  }
}
async function downloadEvals() {
  try {
    // Get access token
    const { accessToken } = await chrome.storage.sync.get(["accessToken"]);
    
    console.log("Access Token:", accessToken);
    
    if (!accessToken) {
      console.error("No access token found. User may need to authorize.");
      // Trigger authorization if needed
      await authorize();
      return null;
    }

    // Fetch evals
    const response = await fetch(downloadEvalsUrl, {
      method: "GET",
      headers: {
        Authorization: "Bearer " + accessToken,
      },
    });

    console.log("Fetch Response Status:", response.status);

    // Check if response is successful
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to fetch evals:", errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    // Parse response
    const data = await response.json();
    console.log("Raw Eval Data:", data);

    // Validate data structure
    if (!data || !data.data) {
      console.error("Invalid data structure. Expected data.data to exist.");
      throw new Error("No evaluation data found in response");
    }

    // Decode and decompress
    const evals = await decodeAndDecompress(data.data);
    const evalsExpirationDate = data.dataExpirationDate;

    console.log("Decoded Evals:", evals);

    // Store in multiple keys
    await chrome.storage.local.set({ 
      evals: evals, 
      courseEvals: evals,
      evalsExpirationDate: evalsExpirationDate 
    });

    // Verify storage
    const storedData = await chrome.storage.local.get(['evals', 'courseEvals', 'evalsExpirationDate']);
    console.log("Stored Eval Data:", storedData);

    return evals;
  } catch (error) {
    console.error("Complete Error in downloadEvals:", error);
    
    if (error.message.includes("Failed to fetch")) {
      console.error("Network error. Check internet connection and API endpoint.");
    }
    
    throw error;
  }
}

async function downloadEvalsIfNeeded() {
  try {
    console.log('SERVICE WORKER: Starting downloadEvalsIfNeeded');
    
    const { accessToken } = await chrome.storage.sync.get(["accessToken"]);
    console.log('SERVICE WORKER: Access Token', accessToken ? 'EXISTS' : 'NOT FOUND');

    if (!accessToken) {
      console.warn('SERVICE WORKER: No access token. Attempting to authorize.');
      await authorize();
    }

    const { evalsExpirationDate } = await chrome.storage.local.get("evalsExpirationDate");
    console.log('SERVICE WORKER: Evals Expiration', evalsExpirationDate);

    const shouldDownload = !evalsExpirationDate || new Date(evalsExpirationDate) < new Date();
    console.log('SERVICE WORKER: Should download evals?', shouldDownload);

    if (shouldDownload) {
      console.log('SERVICE WORKER: Triggering evals download');
      await downloadEvals();
    }
  } catch (error) {
    console.error('SERVICE WORKER: Error in downloadEvalsIfNeeded', error);
    throw error;
  }
}


async function decodeAndDecompress(base64EncodedGzippedData) {
  const binaryString = atob(base64EncodedGzippedData);
  const binaryData = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    binaryData[i] = binaryString.charCodeAt(i);
  }

  const decompressedStream = new Response(binaryData).body.pipeThrough(
    new DecompressionStream("gzip"),
  );
  const decompressedText = await new Response(decompressedStream).text();
  const jsonData = JSON.parse(decompressedText);
  return jsonData;
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
      authorize().then(([authorized, failStatus]) => {
        console.log('Authorization result:', authorized, failStatus);
        sendResponse({ authorized, failStatus });
      });
      return true; 
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
      chrome.tabs.sendMessage(
        activeInfo.tabId,
        "settingsChanged",
        (response) => {
          if (chrome.runtime.lastError) {
          } // ignore
        },
      );
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

self.addEventListener("activate", async (event) => {
  await subscribe();
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
