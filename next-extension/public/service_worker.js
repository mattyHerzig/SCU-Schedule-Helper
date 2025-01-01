import { signIn, signOut } from "./utils/authorization.js";
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

chrome.runtime.onInstalled.addListener((object) => {
  let internalUrl = chrome.runtime.getURL("landing_page/index.html");

  if (object.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.tabs.create({ url: internalUrl }, function (tab) {
      console.log("New tab launched with http://yoursite.com/");
    });
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
      },
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
  await downloadProfessorNameMappings();
  // Check if we need to expire any interestedSections.
  await refreshInterestedSections();
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Service worker received message:', request);
  
  if (request.type === 'SUBMIT_FEEDBACK') {
    console.log('Processing feedback submission');
    handleFeedbackSubmission(request.data)
      .then(response => {
        console.log('Submission successful:', response);
        sendResponse({ success: true, data: response });
      })
      .catch(error => {
        console.error('Submission failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

async function handleFeedbackSubmission(data) {
  const API_ENDPOINT = 'https://tgoa5fcyfb.execute-api.us-west-1.amazonaws.com/prod/feedback';
  
  console.log('Preparing API request:', {
    endpoint: API_ENDPOINT,
    data: data
  });

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': chrome.runtime.getURL(''),
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        feedbackType: data.feedbackType,
        feedbackDate: new Date().toISOString(),
        feedback: data.feedbackText,
        source: 'chrome_extension'
      })
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', errorText);
      throw new Error(`Server error: ${response.status}`);
    }

    const responseData = await response.json();
    console.log('API response:', responseData);
    return responseData;
  } catch (error) {
    console.error('Submission error:', error);
    throw new Error('Failed to submit feedback. Please try again.');
  }
}