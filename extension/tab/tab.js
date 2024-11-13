const authorizationButton = document.getElementById("authorization-button");
const authorizationStatus = document.getElementById("authorization-status");

authorizationButton.addEventListener("click", () => {
  chrome.runtime.sendMessage("authorize", ([authorized, failStatus]) => {
    if (authorized) {
      chrome.storage.sync.set({ useEvals: true });
      chrome.runtime.sendMessage("settingsChanged");
      authorizationStatus.className = "downloading";
      authorizationStatus.innerText =
        "Authorized! Downloading SCU Course Evaluations...";
      chrome.runtime.sendMessage("downloadEvals", () => {
        authorizationStatus.className = "downloaded";
        authorizationStatus.innerText =
          "Downloaded SCU Course Evaluations! You can close this tab.";
        // setTimeout(() => window.close(), 2000);
      });
    } else {
      authorizationStatus.innerText = failStatus;
      authorizationStatus.className = "authorization-failed";
    }
  });
});
