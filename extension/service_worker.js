// console.log("service_worker.js");

// (oauth_token !== undefined) => (user is authorized), (evals_expiration_date !== undefined) => (evals have been downloaded)

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
  const { oauth_token: oAuthToken } = await chrome.storage.sync.get("oauth_token");
  const { evals_expiration_date: evalsExpirationDate } = await chrome.storage.local.get(
    "evals_expiration_date"
  );
  if (oAuthToken && (evalsExpirationDate === undefined || evalsExpirationDate < new Date())) {
    await downloadEvals();
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

    // case 'checkIfAuthorized':
    //     chrome.storage.sync.get('oauth_token', ({ oauth_token: oAuthToken }) => {
    //         sendResponse(oAuthToken !== undefined);
    //     });
    //     return true;
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

chrome.runtime.onInstalled.addListener((details) => {
  chrome.storage.sync.get("oauth_token", ({ oauth_token: oAuthToken }) => {
    if (!oAuthToken) {
      chrome.tabs.create({ url: chrome.runtime.getURL("tab/tab.html") });
    }
  });
  if (details.reason == "install") {
    chrome.storage.sync.set(defaults);
  }
  // else if (details.reason == "update") {}
});

// Download evals on startup if download was interrupted, or evals are expired
chrome.runtime.onStartup.addListener(() => {
  downloadEvalsIfNeeded();
});
