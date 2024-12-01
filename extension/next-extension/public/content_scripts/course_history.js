// Select all "Related Actions" buttons

const results = [];
const academicPeriodPattern = /(Winter|Spring|Summer|Fall) (\d{4})/;
const processAllButtons = async () => {
  console.time("processAllButtons");
  const relevantTables = Array.from(
    document.querySelectorAll("table > caption")
)
    .filter((caption) => caption.innerText === "Enrollments")
    .map((caption) => caption.parentElement);

  const buttons = [];
  for (const table of relevantTables) {
    const buttonList = table.querySelectorAll('[aria-label="Related Actions"]');
    buttons.push(...Array.from(buttonList));
  }
  for (let i = 0; i < buttons.length; i++) {
    await processButton(buttons[i], i);
  }
  console.log(`Expecting ${buttons.length} courses to be processed`);
  console.log(results);
  await sendToPut(results);
  console.log(results);
};
// Helper function to process a single button
const processButton = (button, index) => {
  return new Promise(async (resolve) => {
    const mouseDownEvent = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
      view: window,
    });
    button.dispatchEvent(mouseDownEvent);
    await waitForSelector(".wd-popup");
    const popup = document.querySelector(".wd-popup");
    await waitForSelector("table", popup);
    if (popup) {
      const table = popup.querySelector("table");
      const rows = table.querySelectorAll("td");
      // course name : 0, prof: 5
      const courseName = rows[0].innerText.trim();
      const professor = rows[5].innerText.trim();
      const academicPeriodEl = selectByTextContent(
        popup,
        "label",
        "Academic Period",
      );
      const academicPeriod =
        academicPeriodEl.parentElement.nextElementSibling.textContent.trim();
      const match = academicPeriod.match(academicPeriodPattern);
      if (!match) {
        console.log(
          `Error: Could not parse academic period: ${academicPeriod}`,
        );
        console.log(
          `User took ${courseName} with ${professor} during ${academicPeriod}`,
        );
      } else {
        const [, quarter, year] = match;
        console.log(
          `User took ${courseName} with ${professor} during ${quarter} ${year}`,
        );
      }

      results.push({
        courseName,
        professor,
        academicPeriod,
      });
    }
    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window,
    });
    const closeButton = document.querySelector(
      "[data-automation-id='closeButton']",
    );
    if (closeButton) {
      closeButton.dispatchEvent(clickEvent);
    }
    await waitForSelectorGone(".wd-popup");
    // Resolve the promise to indicate this button's processing is complete
    resolve();
  });
};

async function waitForSelector(selector, parentElement = document) {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const el = parentElement.querySelector(selector);
      if (el) {
        clearInterval(interval);
        resolve(el);
      }
    }, 10);
  });
}

async function waitForSelectorGone(selector, parentElement = document) {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const el = parentElement.querySelector(selector);
      if (!el) {
        clearInterval(interval);
        resolve();
      }
    }, 10);
  });
}

function selectByTextContent(element, tag, text) {
  return Array.from(element.querySelectorAll(tag)).find(
    (el) => el.textContent.trim() === text,
  );
}


let lastTableCount = 0;
let tableCountStable = false;
const tableCountInterval = setInterval(() => {
  const tableCount = document.querySelectorAll("table").length;
  if (tableCount === lastTableCount && tableCount > 0) {
    if (tableCountStable) {
      clearInterval(tableCountInterval);
      processAllButtons();
    } else {
      tableCountStable = true;
    }
  } else {
    tableCountStable = false;
  }
  lastTableCount = tableCount;
}, 100);
async function sendToPut(results) {
  const formattedResults = formatResults(results); // Format the results array

  const payload = {
    coursesTaken: {
      add: formattedResults,
    },
  };

  try {
    const message = {
      type: "updateUser", 
      updateItems: payload, 
    };

   
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error sending message to service worker:", chrome.runtime.lastError);
      } else {
        if (response) {
          console.log("Data successfully updated:", response);
        } else {
          console.error("Failed to update data.");
        }
      }
    });
  } catch (error) {
    console.error("Error occurred while sending data to service worker:", error);
  }
}

function formatResults(results) {
  return results.map((entry) => {
    const professor = entry.professor ? `P{${entry.professor}}` : "";
    const courseName = entry.courseName ? `C{${entry.courseName}}` : "";
    const academicPeriod = entry.academicPeriod ? `T{${entry.academicPeriod}}` : "";

    return `${professor}${courseName}${academicPeriod}`;
  });
}





