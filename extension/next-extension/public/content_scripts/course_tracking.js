// Automatically tracks courses and sections that the user is interested in, if feature is enabled.
let debounceTimer;
const debounceDelay = 100;
const expDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 45);
const sentInterestedSections = new Set();
const checkForInterestedSections = function (mutationsList) {
  // Clear the previous debounce timer
  clearTimeout(debounceTimer);

  // Set up a new debounce timer to wait for mutations to settle
  debounceTimer = setTimeout(() => {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList") {
        const element = document.querySelector(
          '[data-automation-id="pageHeaderTitleText"]',
        );
        if (
          element &&
          element.textContent === "Add Course Section to Saved Schedule"
        ) {
          const tables = document.querySelectorAll("table");
          if (tables.length !== 1) return;
          const table = tables[0];
          const data = table.querySelectorAll("td");
          const add = {};
          let curSection = null;
          let curProf = null;
          let curMeetingPatterns = null;
          for (let i = 0; i < data.length; i++) {
            if (i % 10 === 3) {
              curSection = data[i].innerText;
            }
            if (i % 10 === 6) {
              curProf = data[i].innerText;
              const profIndexOfPipe = curProf.indexOf("|");
              if (profIndexOfPipe !== -1) {
                // Removes the preferred name.
                curProf = curProf.slice(0, profIndexOfPipe).trim();
              }
            }
            if (i % 10 === 9) {
              curMeetingPatterns = data[i].innerText;
              if (curSection && curProf && curMeetingPatterns) {
                const interestedSectionString = `P{${curProf}}S{${curSection}}M{${curMeetingPatterns}}`;
                if (!sentInterestedSections.has(interestedSectionString)) {
                  sentInterestedSections.add(interestedSectionString);
                  add[interestedSectionString] = expDate.getTime();
                }
              }
              curSection = null;
              curProf = null;
              curMeetingPatterns = null;
            }
          }
          if (Object.keys(add).length === 0) return;
          // Expires in 1.5 months from now
          const message = {
            type: "updateUser",
            updateItems: {
              interestedSections: {
                add,
              },
            },
          };
          chrome.runtime.sendMessage(message).then((errorMessage) => {
            if (errorMessage)
              console.error(
                `Error updating interested sections: ${errorMessage}`,
              );
          });
        }
      }
    }
  }, debounceDelay);
};

chrome.storage.local.get("userInfo", (data) => {
  if (
    data.userInfo &&
    data.userInfo.preferences &&
    data.userInfo.preferences.courseTracking
  ) {
    const targetNode = document.body;
    const config = { childList: true, subtree: true };
    const observer = new MutationObserver(checkForInterestedSections);
    observer.observe(targetNode, config);
  }
});
