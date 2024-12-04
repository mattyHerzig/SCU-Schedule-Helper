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

//functions used by inject
try {
  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
      chrome.scripting.executeScript({
        files: ['inject.js'],
        target: { tabId: tab.id }
      });
    }
  });
} catch (e) {
  console.error('Error in service worker:', e);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "getCourseEvalRatings") {
    getCourseEvalRatings(request.profName)
      .then((rating) => sendResponse(rating))
      .catch((error) => {
        console.error("CourseEval Query Error:", error);
        sendResponse(null);
      });
    return true;
  }
});

// Function to get overall average difficulty for a profe
// Handling the message to retrieve average difficulty
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "getProfessorAvgDifficulty") {
    const professorName = request.professorName;
    console.log("Fetching difficulty for professor:", professorName);

    // Retrieve data from chrome.storage
    chrome.storage.local.get("data", (result) => {
      if (chrome.runtime.lastError) {
        console.error("Error retrieving data from storage:", chrome.runtime.lastError);
        sendResponse({ error: chrome.runtime.lastError });
        return;
      }
      
      const data = result.data || {};
      const professorData = data[professorName];

      if (professorData && professorData.overall) {
        console.log("Professor data found:", professorData);
        sendResponse({
          avgDifficulty: professorData.overall.difficultyAvg,
        });
      } else {
        console.warn("Professor data not found:", professorName);
        sendResponse({ error: "Professor data not found." });
      }
    });
    return true; // Keep the message channel open until we respond
  }
});