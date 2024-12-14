const results = [];
const academicPeriodPattern = /(Winter|Spring|Summer|Fall) (\d{4})/;

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  let lastTableCount = 0;
  let tableCountStable = false;

  const tableCountInterval = setInterval(() => {
    const tableCount = document.querySelectorAll("table").length;
    if (tableCount === lastTableCount && tableCount > 0) {
      if (tableCountStable) {
        clearInterval(tableCountInterval);
        processAllTables();
      } else {
        tableCountStable = true;
      }
    } else {
      tableCountStable = false;
    }
    lastTableCount = tableCount;
  }, 100);
  sendResponse("Processing tables...");
});

async function processAllTables() {
  const relevantTables = Array.from(
    document.querySelectorAll("table > caption"),
  )
    .filter((caption) => caption.innerText === "My Enrolled Courses")
    .map((caption) => caption.parentElement);

  const academicPeriods = Array.from(
    document.querySelectorAll("[data-automation-id='fieldSetLegendLabel'"),
  ).filter((caption) => caption.innerText.match(/Winter|Spring|Summer|Fall/));

  let results = [];
  for (let i = 0; i < academicPeriods.length; i++) {
    const table = relevantTables[i];
    const rows = Array.from(table.querySelectorAll("tbody > tr"));
    const academicPeriod = academicPeriods[i].innerText.trim();
    for (const row of rows) {
      const tds = row.querySelectorAll("td");
      const courseName = tds[4].innerText.trim();
      let professor = tds[9].innerText.trim();
      const profIndexOfPipe = professor.indexOf("|");
      if (profIndexOfPipe !== -1) {
        professor = professor.substring(0, profIndexOfPipe).trim();
      }
      professor = professor.replace("\n\n\n", " & ");
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
  }
  await sendToPut(results);
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
