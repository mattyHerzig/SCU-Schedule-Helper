(() => {
  chrome.runtime.sendMessage("downloadEvalsIfNeeded");

  // Function to request professor's average difficulty from the service worker
  function getProfessorAvgDifficulty(professorName) {
    console.log(`Requesting average difficulty for professor: ${professorName}`);
    
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: "getProfessorAvgDifficulty", professorName },
        (response) => {
          console.log("Response from service worker:", response);

          if (response && response.avgDifficulty !== undefined) {
            resolve(response.avgDifficulty);
          } else {
            reject("Failed to retrieve average difficulty");
          }
        }
      );
    });
  }

  function applyRedBackgroundToColumns(mainTableRow) {
    const instructorsTd = mainTableRow.querySelector(
      'td[headers^="columnheader6"]' // Assuming columnheader6 is "All Instructors"
    );
    const meetingPatternsTd = mainTableRow.querySelector(
      'td[headers^="columnheader8"]' // Assuming columnheader8 is "Meeting Patterns"
    );

    if (instructorsTd) {
      instructorsTd.style.transition = "background-color 0.5s ease";
      instructorsTd.style.backgroundColor = "rgba(255, 0, 0, 0.3)"; // Red with transparency
      instructorsTd.style.setProperty("background-color", "rgba(255, 0, 0, 0.3)", "important");
    }

    if (meetingPatternsTd) {
      meetingPatternsTd.style.transition = "background-color 0.5s ease";
      meetingPatternsTd.style.backgroundColor = "rgba(255, 0, 0, 0.3)";
      meetingPatternsTd.style.setProperty("background-color", "rgba(255, 0, 0, 0.3)", "important");
    }
  }

  function handleGrid(visibleGrid) {
    const mainTables = visibleGrid.querySelectorAll(
      '[data-automation-id^="MainTable-"]'
    );
    mainTables.forEach((mainTable) => {
      if (mainTable.classList.contains("modified")) return;
      mainTable.classList.add("modified");

      const mainTableRows = mainTable.querySelectorAll(
        '.mainTable tr:not([data-automation-id="ghostRow"])'
      );

      mainTableRows.forEach((mainTableRow) => {
        applyRedBackgroundToColumns(mainTableRow);
        
        // Extract professor name and get their average difficulty
        const instructorCell = mainTableRow.querySelector('td[headers^="columnheader6"]');
        if (instructorCell) {
          const professorName = instructorCell.innerText.trim();
          if (professorName) {
            getProfessorAvgDifficulty(professorName)
              .then((avgDifficulty) => {
                console.log(`Professor: ${professorName} | Average Difficulty: ${avgDifficulty}`);
                // You can now use avgDifficulty to update UI or add more logic as needed
              })
              .catch((error) => {
                console.error(`Error fetching average difficulty for ${professorName}:`, error);
              });
          }
        }
      });
    });
  }

  function checkForGrid() {
    const loadingPanel = document.querySelector(
      "[data-automation-loadingpanelhidden]"
    );
    const isLoading = loadingPanel
      ? loadingPanel.getAttribute("data-automation-loadingpanelhidden") ===
        "false"
      : false;
    if (isLoading) return;

    const scuFindCourseSections = document.querySelector(
      'div[title="SCU Find Course Sections"]'
    );
    if (!scuFindCourseSections) return;

    const visibleGrid = document.querySelector(
      '[data-automation-id="VisibleGrid"]'
    );
    if (!visibleGrid) return;

    handleGrid(visibleGrid);
  }

  console.log("hello world");
  const observer = new MutationObserver(checkForGrid);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  checkForGrid(); // Initial check in case the page is already loaded
})();



/*
(() => {
chrome.runtime.sendMessage("downloadEvalsIfNeeded");

function applyRedBackgroundToColumns(mainTableRow) {
  const instructorsTd = mainTableRow.querySelector(
    'td[headers^="columnheader6"]' // Assuming columnheader6 is "All Instructors"
  );
  const meetingPatternsTd = mainTableRow.querySelector(
    'td[headers^="columnheader8"]' // Assuming columnheader8 is "Meeting Patterns"
  );

  if (instructorsTd) {
    instructorsTd.style.transition = "background-color 0.5s ease";
    instructorsTd.style.backgroundColor = "rgba(255, 0, 0, 0.3)"; // Red with transparency
    instructorsTd.style.setProperty("background-color", "rgba(255, 0, 0, 0.3)", "important");
  }

  if (meetingPatternsTd) {
    meetingPatternsTd.style.transition = "background-color 0.5s ease";
    meetingPatternsTd.style.backgroundColor = "rgba(255, 0, 0, 0.3)";
    meetingPatternsTd.style.setProperty("background-color", "rgba(255, 0, 0, 0.3)", "important");
  }
}

function handleGrid(visibleGrid) {
  const mainTables = visibleGrid.querySelectorAll(
    '[data-automation-id^="MainTable-"]'
  );
  mainTables.forEach((mainTable) => {
    if (mainTable.classList.contains("modified")) return;
    mainTable.classList.add("modified");

    const mainTableRows = mainTable.querySelectorAll(
      '.mainTable tr:not([data-automation-id="ghostRow"])'
    );

    mainTableRows.forEach((mainTableRow) => {
      applyRedBackgroundToColumns(mainTableRow);
    });
  });
}

function checkForGrid() {
  const loadingPanel = document.querySelector(
    "[data-automation-loadingpanelhidden]"
  );
  const isLoading = loadingPanel
    ? loadingPanel.getAttribute("data-automation-loadingpanelhidden") ===
      "false"
    : false;
  if (isLoading) return;

  const scuFindCourseSections = document.querySelector(
    'div[title="SCU Find Course Sections"]'
  );
  if (!scuFindCourseSections) return;

  const visibleGrid = document.querySelector(
    '[data-automation-id="VisibleGrid"]'
  );
  if (!visibleGrid) return;

  handleGrid(visibleGrid);
}

const observer = new MutationObserver(checkForGrid);
observer.observe(document.documentElement, { childList: true, subtree: true });
checkForGrid(); // Initial check in case the page is already loaded
})();
*/




