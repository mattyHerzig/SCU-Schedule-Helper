(() => {
  chrome.runtime.sendMessage("downloadEvalsIfNeeded");

  function applyRedBackgroundToColumns(mainTableRow) {
    const instructorsTd = mainTableRow.querySelector(
      'td[headers^="columnheader6"]'
    );
    const meetingPatternsTd = mainTableRow.querySelector(
      'td[headers^="columnheader8"]' 
    );

    if (instructorsTd) {
      instructorsTd.style.transition = "background-color 0.5s ease";
      instructorsTd.style.backgroundColor = "rgba(255, 0, 0, 0.3)"; 
      instructorsTd.style.setProperty("background-color", "rgba(255, 0, 0, 0.3)", "important");
    }

    if (meetingPatternsTd) {
      meetingPatternsTd.style.transition = "background-color 0.5s ease";
      meetingPatternsTd.style.backgroundColor = "rgba(255, 0, 0, 0.3)";
      meetingPatternsTd.style.setProperty("background-color", "rgba(255, 0, 0, 0.3)", "important");
    }
  }

  function displayProfessorDifficulty(instructorCell, professorName) {
    const difficultyContainer = document.createElement('div');
    difficultyContainer.style.fontSize = '0.8em';
    difficultyContainer.style.color = 'gray';
    difficultyContainer.style.marginTop = '5px';

    chrome.runtime.sendMessage(
      { 
        type: "getRmpRatings", 
        profName: professorName 
      }, 
      (rmpResponse) => {
        chrome.storage.local.get('evals', (storageData) => {
          const evalsData = storageData.evals || {};
          const professorData = evalsData[professorName];

          const difficultyTexts = [];

          if (rmpResponse && rmpResponse.avgDifficulty !== undefined) {
            difficultyTexts.push(`RMP Difficulty: ${rmpResponse.avgDifficulty.toFixed(1)}/5`);
          }

          if (professorData && professorData.overall && professorData.overall.difficultyAvg !== undefined) {
            difficultyTexts.push(`Course Eval Difficulty: ${professorData.overall.difficultyAvg.toFixed(1)}/5`);
          }

          if (difficultyTexts.length > 0) {
            difficultyContainer.innerHTML = difficultyTexts.join(' | ');
            instructorCell.appendChild(difficultyContainer);
          }
        });
      }
    );
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
        
        const instructorCell = mainTableRow.querySelector('td[headers^="columnheader6"]');
        if (instructorCell) {
          const professorName = instructorCell.innerText.trim();
          if (professorName) {
            displayProfessorDifficulty(instructorCell, professorName);
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

  console.log("Course Difficulty Injection Script Loaded");
  const observer = new MutationObserver(checkForGrid);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  checkForGrid(); 
})();





