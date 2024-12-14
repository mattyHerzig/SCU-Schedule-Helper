const results = [];
const academicPeriodPattern = /(Winter|Spring|Summer|Fall) (\d{4})/;

async function processAllButtons() {
  const scuTables = Array.from(document.querySelectorAll("table > caption"))
    .filter((caption) => caption.innerText === "Enrollments")
    .map((caption) => caption.parentElement);

  const academicPeriods = selectAllByTextContent(
    document,
    "label",
    "Academic Period",
  ).map((caption) => caption.parentElement.nextElementSibling);
  const indexOfSpring2023 = academicPeriods.findIndex((el) =>
    el.innerText.includes("Spring 2023"),
  );
  const tablesAfterSpring2023 = scuTables.slice(0, indexOfSpring2023);
  const tablesBeforeAndIncludingSpring2023 = scuTables.slice(indexOfSpring2023);

  const nonScuTables = Array.from(document.querySelectorAll("table"))
    .filter((table) => table.querySelector("caption")?.innerText !== "Enrollments")
    .map((caption) => caption.parentElement);

  const buttons = [];
  for (const table of tablesAfterSpring2023) {
    const buttonList = table.querySelectorAll('[aria-label="Related Actions"]');
    buttons.push(...Array.from(buttonList));
  }
  for (let i = 0; i < buttons.length; i++) {
    await processButton(buttons[i], i);
  }
  for (let i = 0; i < tablesBeforeAndIncludingSpring2023.length; i++) {
    const academicPeriod =
      academicPeriods[i + indexOfSpring2023].innerText.trim();
    processTable(tablesBeforeAndIncludingSpring2023[i], academicPeriod);
  }
  for (const table of nonScuTables) {
    processTable(table, "Not taken at SCU", false);
  }
  await sendToPut(results);
}

async function processTable(table, academicPeriod, takenAtSCU = true) {
  const rows = Array.from(table.querySelectorAll("tbody > tr"));
  if (takenAtSCU) {
    rows.pop(); // Remove last row which is a total row.
  }
  const match = academicPeriod.match(academicPeriodPattern);
  academicPeriod = match ? `${match[1]} ${match[2]}` : academicPeriod;
  for (const row of rows) {
    const tds = row.querySelectorAll("td");
    results.push({
      courseName: tds[1].innerText.trim(),
      professor: takenAtSCU ? "" : "Not taken at SCU",
      academicPeriod,
    });
  }
}

// Helper function to process a single button
async function processButton(button, index) {
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
    const courseName = rows[0].innerText.trim();
    let professor = rows[5].innerText.trim();
    const profIndexOfPipe = professor.indexOf("|");
    if (profIndexOfPipe !== -1) {
      professor = professor.substring(0, profIndexOfPipe).trim();
    }
    professor = professor.replace("\n\n\n", " & ");
    const academicPeriodEl = selectByTextContent(
      popup,
      "label",
      "Academic Period",
    );
    const academicPeriod =
      academicPeriodEl.parentElement.nextElementSibling.textContent.trim();
    const match = academicPeriod.match(academicPeriodPattern);
    if (!match) {
      console.error(
        `Error: Could not parse academic period: ${academicPeriod}`,
      );
    }

    results.push({
      courseName,
      professor,
      academicPeriod: match ? `${match[1]} ${match[2]}` : academicPeriod,
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
}

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

function selectAllByTextContent(element, tag, text) {
  return Array.from(element.querySelectorAll(tag)).filter(
    (el) => el.textContent.trim() === text,
  );
}

async function sendToPut(results) {
  const payload = {
    coursesTaken: {
      add: formatResults(results),
    },
  };

  try {
    const message = {
      type: "updateUser",
      updateItems: payload,
    };

    const putError = await chrome.runtime.sendMessage(message);
    return putError;
  } catch (error) {
    console.error(
      "Error occurred while sending data to service worker:",
      error,
    );
  }
}

function formatResults(results) {
  return results.map((entry) => {
    const professor = `P{${entry.professor || ""}}`;
    const courseName = `C{${entry.courseName || ""}}`;
    const academicPeriod = `T{${entry.academicPeriod || ""}}`;
    return `${professor}${courseName}${academicPeriod}`;
  });
}

let lastTableCount = 0;
let tableCountStable = false;

const tableCountInterval = setInterval(() => {
  const tableCount = document.querySelectorAll("table").length;
  if (tableCount === lastTableCount && tableCount > 0) {
    if (tableCountStable) {
      clearInterval(tableCountInterval);
      chrome.storage.local.get("importCourseHistoryRequestTime", (data) => {
        const currentTime = new Date().getTime();
        const lastRequestTime = parseInt(
          data.importCourseHistoryRequestTime || 0,
        );
        if (currentTime - lastRequestTime > 60000) {
          return;
        } else {
          chrome.storage.local
            .set({ importCourseHistoryRequestTime: 0 })
            .then(() => {
              processAllButtons();
            });
        }
      });
    } else {
      tableCountStable = true;
    }
  } else {
    tableCountStable = false;
  }
  lastTableCount = tableCount;
}, 100);
