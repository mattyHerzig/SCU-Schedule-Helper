import { signIn, signOut } from "./service_worker_utils/authorization.js";
import { downloadEvals } from "./service_worker_utils/evals.js";
import {
  handleNotification,
  subscribe,
} from "./service_worker_utils/notifications.js";
import { getRmpRatings } from "./service_worker_utils/rmp.js";
import {
  clearCourseHistory,
  deleteAccount,
  importCourseHistory,
  queryUserByName,
  refreshInterestedSections,
  refreshUserData,
  updateUser,
} from "./service_worker_utils/user.js";

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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.url !== undefined) {
    fetch(request.url)
      .then((response) => response.text())
      .then((data) => sendResponse(data))
      .catch((error) => console.error(error));
  }

  if (request.type === "updateUser") {
    updateUser(request.updateItems).then((response) => {
      sendResponse(response);
    });
  }

  if (request.type === "getRmpRatings") {
    getRmpRatings(request.profName, false)
      .then((response) => {
        sendResponse(response);
      })
      .catch((error) => {
        console.error("RMP Rating Query Error:", error);
        sendResponse(null);
      });
  }

  if (request.type === "queryUserByName") {
    queryUserByName(request.name).then((response) => {
      sendResponse(response);
    });
  }

  if (request.type === "replacePhoto") {
    const { photoUrl, isDefault } = request; 
    const updateItems = {
      personal: {
        photoUrl: isDefault
          ? "https://scu-schedule-helper.s3.us-west-1.amazonaws.com/default-avatar.png"
          : photoUrl,
      },
    };

    updateUser(updateItems)
      .then((response) => {
        if (response) {
          sendResponse(response);
        } else {
          refreshUserData(["personal"]).then(() => {
            sendResponse({ success: true });
          });
        }
      })
      .catch((error) => {
        console.error("Error replacing photo:", error);
        sendResponse({ success: false, error: error.message });
      });

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
    case "clearCourseHistory":
      clearCourseHistory().then((response) => {
        sendResponse(response);
      });
    case "getDefaults":
      sendResponse(defaults);
      break;
    case "signIn":
      signIn().then((response) => {
        sendResponse(response);
      });
      break;
    case "signOut":
      signOut().then((response) => {
        sendResponse(response);
      });
      break;
    case "deleteAccount":
      deleteAccount().then((response) => {
        sendResponse(response);
      });
      break;
    case "downloadEvals":
      downloadEvals().then(() => {
        sendResponse();
      });
      break;
    case "importCourseHistory":
      importCourseHistory().then((response) => {
        sendResponse(response);
      });
    case "runStartupChecks":
      runStartupChecks().then(() => {
        sendResponse();
      });
    default:
      break;
  }
  return true;
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

self.addEventListener("push", function (event) {
  console.log(
    `Push had this data: "${JSON.stringify(event.data.json(), null, 2)}"`,
  );
  handleNotification(event.data.json());
});

self.addEventListener("activate", async (event) => {
  // Set refresh date to 4 days from now.
  await chrome.storage.local.set({
    refreshSelfDataDate: new Date(
      Date.now() + 4 * 24 * 60 * 60 * 1000,
    ).getTime(),
  });
  await subscribe();
});

async function runStartupChecks() {
  const refreshSelfDataDate = (
    await chrome.storage.local.get("refreshSelfDataDate")
  ).refreshSelfDataDate;
  if (
    refreshSelfDataDate === undefined ||
    new Date() > new Date(refreshSelfDataDate)
  ) {
    await refreshUserData();
    await chrome.storage.local.set({
      refreshSelfDataDate: new Date(
        Date.now() + 4 * 24 * 60 * 60 * 1000,
      ).getTime(),
    });
  }
  // Check if the evals need to be redownloaded.
  await downloadEvals();
  // Check if we need to expire any interestedSections.
  await refreshInterestedSections();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "closePopup") {
    if (sender.tab) {
      chrome.windows.remove(sender.tab.windowId);
    }
  }
});
