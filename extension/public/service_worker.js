import {
  signIn,
  signOut,
  updateSubscriptionAndRefreshUserData,
} from "./utils/authorization.js";
import { PROD_SERVER_URL } from "./utils/constants.js";
import {
  downloadEvals,
  downloadProfessorNameMappings,
} from "./utils/evalsAndMappings.js";
import { handleNotification, subscribe } from "./utils/notifications.js";
import { getRmpRatings } from "./utils/rmp.js";
import {
  importCurrentCourses,
  deleteAccount,
  importCourseHistory,
  queryUserByName,
  refreshInterestedSections,
  refreshUserData,
  updateUser,
} from "./utils/user.js";

chrome.runtime.onInstalled.addListener(async (object) => {
  let internalUrl = chrome.runtime.getURL("landing_page/index.html");

  if (object.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    const accessToken = (await chrome.storage.sync.get("accessToken"))
      .accessToken;
    if (accessToken) {
      const subscription = await subscribe();
      downloadEvals();
      downloadProfessorNameMappings();
      const refreshError = await updateSubscriptionAndRefreshUserData(
        JSON.stringify(subscription)
      );
      if (refreshError) {
        await signOut();
        chrome.tabs.create({ url: internalUrl }, function (tab) {});
      }
    } else chrome.tabs.create({ url: internalUrl }, function (tab) {});
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.url !== undefined) {
    fetch(request.url)
      .then((response) => response.text())
      .then((data) => sendResponse(data))
      .catch((error) => console.error(error));
  }

  if (request.type === "updateUser") {
    updateUser(request.updateItems, request.allowLocalOnly || false).then(
      (response) => {
        sendResponse(response);
      }
    );
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

  if (request.type === "submitFeedback") {
    handleFeedbackSubmission(request.data).then((response) => {
      sendResponse(response);
    });
  }

  switch (request) {
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
    case "getOrImportCourses":
      getOrImportCourses().then((response) => {
          sendResponse(response);
        })
        .catch((err) => {
          console.error(err);
          sendResponse({ ok: false, message: err.toString() });
        });
      return true; // Keep the message channel open for async
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
    case "importCurrentCourses":
      importCurrentCourses().then((response) => {
        sendResponse(response);
      });
      break;
    case "importCourseHistory":
      importCourseHistory().then((response) => {
        sendResponse(response);
      });
      break;

    case "runStartupChecks":
      runStartupChecks().then(() => {
        sendResponse();
      });
      break;
    default:
      break;
  }
  return true;
});

self.addEventListener("push", function (event) {
  console.log(
    `Push had this data: "${JSON.stringify(event.data.json(), null, 2)}"`
  );
  handleNotification(event.data.json());
});

self.addEventListener("activate", async (event) => {
  // Set refresh date to 4 days from now.
  await chrome.storage.local.set({
    refreshSelfDataDate: new Date(
      Date.now() + 4 * 24 * 60 * 60 * 1000
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
        Date.now() + 4 * 24 * 60 * 60 * 1000
      ).getTime(),
    });
  }
  // Check if the evals need to be redownloaded.
  await downloadEvals();
  await downloadProfessorNameMappings();
  // Check if we need to expire any interestedSections.
  await refreshInterestedSections();
}

// Pseudocode function that checks if user has courses in DB and, if not, calls importCurrentCourses
async function getOrImportCourses() {
  // 1. Check if DB has courses:
  const existingCourses = await getCoursesFromDbOrServer();
  if (existingCourses && existingCourses.length > 0) {
    // Return them immediately
    return { ok: true, courses: existingCourses };
  }

  // 2. Otherwise, we need to scrape using your "importCurrentCourses" flow:
  //    The background script typically calls `chrome.tabs.sendMessage`
  //    but we need to know which tab to inject into.
  //    You might track the active tab if the user is on Workday, for example.
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    return { ok: false, message: "No active Workday tab found." };
  }

  // 3. Send message to the content script that triggers CurrentCourseImporter
  const importResponse = await new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id, "importCurrentCourses", (resp) => {
      resolve(resp);
    });
  });

  if (importResponse !== "Successfully imported courses.") {
    return { ok: false, message: importResponse || "Course import failed." };
  }

  // 4. Now that import is done, we should have courses in DB
  const newCourses = await getCoursesFromDbOrServer();
  if (!newCourses || !newCourses.length) {
    return { ok: false, message: "No courses found after import." };
  }

  return { ok: true, courses: newCourses };
}

// Stub function: depends on your real DB logic
async function getCoursesFromDbOrServer() {
  // Maybe you have queryUserByName or something similar in user.js
  // e.g.:
  // const userData = await queryUserByName("CURRENT_USER");
  // return userData?.coursesTaken || [];
  // For now, just returning an empty array if no data
  return [];
}

async function handleFeedbackSubmission(data) {
  try {
    const response = await fetch(`${PROD_SERVER_URL}/feedback`, {
      method: "POST",
      body: JSON.stringify({ ...data }),
    });
    const responseData = await response.json();
    return {
      ok: response.ok,
      message: responseData.message,
    };
  } catch (error) {
    console.error("Error in handleFeedbackSubmission:", error);
    return {
      ok: false,
      message: "An unknown error occurred. Please try again later.",
    };
  }
}
