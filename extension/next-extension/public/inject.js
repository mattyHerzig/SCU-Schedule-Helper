(() => {
  chrome.runtime.sendMessage("downloadEvalsIfNeeded");

  function parseTime(timeString) {
    const [time, period] = timeString.trim().split(/\s+/);
    let [hours, minutes] = time.split(':').map(Number);
    
    if (period.toUpperCase() === 'PM' && hours !== 12) {
      hours += 12;
    }
    if (period.toUpperCase() === 'AM' && hours === 12) {
      hours = 0;
    }

    console.log(`Parsed time string: "${timeString}" into hours: ${hours}, minutes: ${minutes}`);
    return { hours, minutes };
  }

  function isTimeWithinPreference(meetingTime, preferences) {
    //not sure how to get user time preference
    if (!meetingTime || !preferences) return false;

    const { startHour, startMinute, endHour, endMinute } = preferences.preferredSectionTimeRange;

    console.log(`User's Preferred Time Range: Start - ${startHour}:${startMinute}, End - ${endHour}:${endMinute}`);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    const [startTimeStr, endTimeStr] = meetingTime.split('-').map(t => t.trim());
    const startTime = parseTime(startTimeStr);
    const endTime = parseTime(endTimeStr);

    console.log(`Course meeting time parsed: Start - ${startTimeStr}, End - ${endTimeStr}`);
    console.log(`Converted meeting times: Start - ${startTime.hours}:${startTime.minutes}, End - ${endTime.hours}:${endTime.minutes}`);

    return (
      (startTime.hours * 60 + startTime.minutes >= startMinutes &&
        startTime.hours * 60 + startTime.minutes <= endMinutes) ||
      (endTime.hours * 60 + endTime.minutes >= startMinutes &&
        endTime.hours * 60 + endTime.minutes <= endMinutes) ||
      (startTime.hours * 60 + startTime.minutes <= startMinutes &&
        endTime.hours * 60 + endTime.minutes >= endMinutes)
    );
  }

  function applyTimePreferenceColor(mainTableRow, userData) {
    const meetingPatternsTd = mainTableRow.querySelector(
      'td[headers^="columnheader8"]'
    );

    if (meetingPatternsTd) {
      const meetingPattern = meetingPatternsTd.innerText.trim();
      const timeMatch = meetingPattern.match(/\|\s*([^|]+)$/);
      
      if (timeMatch) {
        const meetingTime = timeMatch[1];
        
        chrome.storage.local.get(['data'], (storageData) => {
          const userData = storageData.data || {};

          console.log(`Checking time preference for meeting time: ${meetingTime}`);
          
          if (isTimeWithinPreference(meetingTime, userData.preferences)) {
            console.log(`Meeting time "${meetingTime}" is within user preferences.`);
            meetingPatternsTd.style.transition = "background-color 0.5s ease";
            meetingPatternsTd.style.setProperty("background-color", "rgba(25, 209, 56, 0.5)", "important");
          } else {
            console.log(`Meeting time "${meetingTime}" is outside user preferences.`);
            meetingPatternsTd.style.transition = "background-color 0.5s ease";
            meetingPatternsTd.style.setProperty("background-color", "rgba(209, 37, 25, 0.5)", "important"); 
          }
        });
      }
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
        applyTimePreferenceColor(mainTableRow);
        
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

  function calculateColorIntensity(rating) {
    if (rating <= 2.5) return `rgba(144, 238, 144, 0.5)`; // Light green
    if (rating <= 3.0) return interpolateColor([144, 238, 144], [255, 255, 224], (rating - 2.5) / 0.5); 
    if (rating <= 3.5) return interpolateColor([255, 255, 224], [255, 165, 0], (rating - 3.0) / 0.5); 
    if (rating <= 4.5) return interpolateColor([255, 165, 0], [255, 99, 71], (rating - 3.5) / 1.0); 
    return `rgba(255, 99, 71, 0.5)`; // Red
  }

  function interpolateColor(color1, color2, ratio) {
    const r = Math.round(color1[0] + ratio * (color2[0] - color1[0]));
    const g = Math.round(color1[1] + ratio * (color2[1] - color1[1]));
    const b = Math.round(color1[2] + ratio * (color2[2] - color1[2]));
    return `rgba(${r}, ${g}, ${b}, 0.5)`;
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
        chrome.storage.local.get(['evals', 'data'], (storageData) => {
          const evalsData = storageData.evals || {};
          const userData = storageData.data || {};
          const professorData = evalsData[professorName];
          const userPreferences = userData.preferences

          let rmpDifficulty = null;
          let courseEvalDifficulty = null;
          let finalDifficulty = null;

          if (rmpResponse && rmpResponse.avgDifficulty !== undefined) {
            rmpDifficulty = rmpResponse.avgDifficulty;
          }

          if (professorData && professorData.overall && 
              professorData.overall.difficultyAvg !== undefined) {
            courseEvalDifficulty = professorData.overall.difficultyAvg;
          }

          if (rmpDifficulty !== null && courseEvalDifficulty !== null) {
            const { weightScuEvals, weightRmp } = userPreferences.scoreWeighting;
            finalDifficulty = (
              (courseEvalDifficulty * weightScuEvals / 100) + 
              (rmpDifficulty * weightRmp / 100)
            );

            const colorIntensity = calculateColorIntensity(finalDifficulty);
            instructorCell.style.setProperty("background-color", colorIntensity, "important");

            const difficultyTexts = [
              `RMP Difficulty: ${rmpDifficulty.toFixed(1)}/5`,
              `Course Eval Difficulty: ${courseEvalDifficulty.toFixed(1)}/5`,
              `Weighted Difficulty: ${finalDifficulty.toFixed(1)}/5`
            ];
            difficultyContainer.innerHTML = difficultyTexts.join(' | ');
            instructorCell.appendChild(difficultyContainer);
          }
        });
      }
    );
  }

  function checkForGrid() {
    const loadingPanel = document.querySelector(
      "[data-automation-loadingpanelhidden]"
    );
    const isLoading = loadingPanel
      ? loadingPanel.getAttribute("data-automation-loadingpanelhidden") === "false"
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



