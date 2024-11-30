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
          const section = data[3].innerText;
          let profName = data[6].innerText;
          const profIndexOfPipe = profName.indexOf("|");
          if (profIndexOfPipe !== -1) {
            // Removes the preferred name.
            profName = profName.slice(0, profIndexOfPipe).trim();
          }
          const meetingPatterns = data[9].innerText;
          if (!profName || !section || !meetingPatterns) return;

          // Expires in 1.5 months from now
          const interestedSectionString = `P{${profName}}S{${section}}M{${meetingPatterns}}E{${expDate.getTime()}}`;

          const message = {
            type: "updateUser",
            updateItems: {
              interestedSections: {
                add: [interestedSectionString],
              },
            },
          };

          if (!sentInterestedSections.has(interestedSectionString)) {
            sentInterestedSections.add(interestedSectionString);
            console.log("Sending message:", message);
            chrome.runtime.sendMessage(message).then((response) => {
              console.log("Response:", response);
            });
          }
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
