let evalsData = {};
let userInfo = {};
let inTooltip = false;
let inButton = false;
let friendInterestedSections = {};
let friendCoursesTaken = {};
let friends = {};
const processedSections = new Set();
const courseTakenPattern = /P{(.*?)}C{(.*?)}T{(.*?)}/; // P{profName}C{courseCode}T{termName}
const interestedSectionPattern = /P{(.*?)}S{(.*?)}M{(.*?)}/; // P{profName}S{full section string}M{meetingPattern}E{expirationTimestamp}

function parseTime(timeString) {
  const [time, period] = timeString.trim().split(/\s+/);
  let [hours, minutes] = time.split(":").map(Number);

  if (period.toUpperCase() === "PM" && hours !== 12) hours += 12;
  if (period.toUpperCase() === "AM" && hours === 12) hours = 0;

  return { hours, minutes };
}

function isTimeWithinPreference(meetingTime) {
  if (!meetingTime || !userInfo?.preferences) return false;

  const { startHour, startMinute, endHour, endMinute } =
    userInfo.preferences.preferredSectionTimeRange;

  const [startTimeStr, endTimeStr] = meetingTime
    .split("-")
    .map((t) => t.trim());
  const startTime = parseTime(startTimeStr);
  const endTime = parseTime(endTimeStr);

  return (
    (startTime.hours > startHour ||
      (startTime.hours === startHour && startTime.minutes >= startMinute)) &&
    (endTime.hours < endHour ||
      (endTime.hours === endHour && endTime.minutes <= endMinute))
  );
}

async function displayProfessorDifficulty(
  courseSectionCell,
  mainSectionRow,
  professorName,
) {
  const difficultyContainer = document.createElement("div");
  difficultyContainer.style.fontSize = "1em";
  difficultyContainer.style.color = "gray";
  difficultyContainer.style.marginTop = "5px";
  difficultyContainer.setAttribute("data-from-scu-schedule-helper", "true");

  const rmpResponse = await chrome.runtime.sendMessage({
    type: "getRmpRatings",
    profName: professorName,
  });
  let courseEvalQuality = null;
  let courseEvalDifficulty = null;
  let courseEvalWorkload = null;
  let rmpLink = `https://www.ratemyprofessors.com/search/professors?q=${getProfPreferredName(professorName)}`;
  if (rmpResponse && rmpResponse.legacyId)
    rmpLink = `https://www.ratemyprofessors.com/professor/${rmpResponse.legacyId}`;

  let prof = getRealProfName(professorName);
  let courseText = courseSectionCell.innerText.trim();
  const courseCode = courseText
    .substring(0, courseText.indexOf("-"))
    .replace(/\s/g, "");
  const department = courseText.substring(0, courseText.indexOf(/\d/));

  if (evalsData[prof]?.[courseCode]?.difficultyAvg) {
    courseEvalQuality = evalsData[prof][courseCode].qualityAvg;
    courseEvalDifficulty = evalsData[prof][courseCode].difficultyAvg;
    courseEvalWorkload = evalsData[prof][courseCode].workloadAvg;
  } else if (evalsData[prof]?.[department]?.difficultyAvg) {
    courseEvalQuality = evalsData[prof][department].qualityAvg;
    courseEvalDifficulty = evalsData[prof][department].difficultyAvg;
    courseEvalWorkload = evalsData[prof][department].workloadAvg;
  } else if (evalsData[prof]?.overall?.difficultyAvg) {
    courseEvalQuality = evalsData[prof].overall.qualityAvg;
    courseEvalDifficulty = evalsData[prof].overall.difficultyAvg;
    courseEvalWorkload = evalsData[prof].overall.workloadAvg;
  } else if (evalsData.data?.[courseCode]?.difficultyAvg) {
    courseEvalQuality = evalsData.data[courseCode].qualityAvg;
    courseEvalDifficulty = evalsData.data[courseCode].difficultyAvg;
    courseEvalWorkload = evalsData.data[courseCode].workload;
  }

  const meetingPattern = mainSectionRow.cells[7].textContent.trim();
  const timeMatch = meetingPattern.match(/\|\s*([^|]+)$/);
  let timeWithinPreference = false;
  if (timeMatch) {
    const meetingTime = timeMatch[1];
    if (isTimeWithinPreference(meetingTime)) {
      timeWithinPreference = true;
    }
  }

  const friendsTaken = [];
  for (const friend in friendCoursesTaken[courseCode]) {
    if (friendCoursesTaken[courseCode][friend].includes(prof)) {
      const match =
        friendCoursesTaken[courseCode][friend].match(courseTakenPattern);
      if (match) {
        friendsTaken.push(friends[friend].name);
      }
    }
  }
  const friendsInterested = [];
  for (const friend in friendInterestedSections[courseCode]) {
    if (friendInterestedSections[courseCode][friend].includes(prof)) {
      const match = friendInterestedSections[courseCode][friend].match(
        interestedSectionPattern,
      );
      if (match && courseText === match[2]) {
        friendsInterested.push(friends[friend].name);
      }
    }
  }

  appendRatingInfoToCell(courseSectionCell, {
    rmpLink,
    rmpQuality: rmpResponse?.avgRating,
    rmpDifficulty: rmpResponse?.avgDifficulty,
    scuDifficulty: courseEvalDifficulty,
    scuQuality: courseEvalQuality,
    scuWorkload: courseEvalWorkload,
    matchesTimePreference: timeWithinPreference,
    friendsTaken,
    friendsInterested,
  });
}

function calcOverallScore(scores) {
  let { scuEvals = 50, rmp = 50 } = userInfo.preferences.scoreWeighting || {};
  let { rmpQuality, rmpDifficulty, scuQuality, scuDifficulty, scuWorkload } =
    scores;
  if (
    !rmpQuality &&
    !rmpDifficulty &&
    !scuQuality &&
    !scuDifficulty &&
    !scuWorkload
  )
    return null;

  scuDifficulty = scuDifficulty ? Math.max(scuDifficulty - 1.5, 0) : undefined;
  rmpDifficulty = rmpDifficulty ? Math.max(rmpDifficulty - 1.5, 0) : undefined;
  if (nullOrUndefined(rmpQuality) || nullOrUndefined(rmpDifficulty)) {
    return ((scuQuality + (5 - scuDifficulty) + (11 - scuWorkload)) / 21) * 10;
  }
  if (
    nullOrUndefined(scuQuality) ||
    nullOrUndefined(scuDifficulty) ||
    nullOrUndefined(scuWorkload)
  ) {
    return rmpQuality + (5 - rmpDifficulty);
  }
  const qualityScore = (rmpQuality * rmp + scuQuality * scuEvals) / 100;
  const difficultyScore =
    5 - (rmpDifficulty * rmp + scuDifficulty * scuEvals) / 100;
  const workloadScore = (11 - scuWorkload) * (scuEvals / 100);
  const denominator = 10 + (scuEvals / 100) * 11;
  return Math.min(
    ((qualityScore + difficultyScore + workloadScore) / denominator) * 10,
    10,
  );
}

function nullOrUndefined(object) {
  return object === null || object === undefined;
}

function getRealProfName(profName) {
  if (profName.includes("|")) {
    return profName.split("|")[0].trim();
  }
  return profName;
}

function getProfPreferredName(profName) {
  if (profName.includes("|")) {
    return profName.split("|")[1].trim();
  }
  return profName;
}

async function handleGrid() {
  const courseSectionRows = document.querySelectorAll(
    "table.lockedTable tbody tr",
  );
  const mainSectionRows = document.querySelectorAll("table.mainTable tbody tr");

  for (let i = 0; i < courseSectionRows.length; i++) {
    const subjectSectionSectionNumber = `{${mainSectionRows[i].cells[0].textContent}}{${mainSectionRows[i].cells[1].textContent}}{${mainSectionRows[i].cells[2].textContent}}`;
    if (processedSections.has(subjectSectionSectionNumber)) continue;
    processedSections.add(subjectSectionSectionNumber);
    const row = courseSectionRows[i];
    const courseSectionCell = row.cells[0];
    const mainRow = mainSectionRows[i];
    if (
      !courseSectionCell ||
      courseSectionCell.querySelector("[data-from-scu-schedule-helper]")
    ) {
      continue; // Skip if already processed
    }
    let courseText = courseSectionCell.innerText.trim();
    if (courseText === "") continue;
    const instructorCell = mainRow.cells[5];

    let professorName = instructorCell.innerText.trim().split("\n")[0];

    await displayProfessorDifficulty(courseSectionCell, mainRow, professorName);
    mainRow.cells[0].appendChild(document.createElement("br"));
    mainRow.cells[0].appendChild(document.createElement("br"));
    mainRow.cells[0].appendChild(document.createElement("br"));
  }
}

chrome.storage.local.get(
  [
    "evals",
    "userInfo",
    "friendInterestedSections",
    "friendCoursesTaken",
    "friends",
  ],
  async (data) => {
    userInfo = data.userInfo || {};
    evalsData = data.evals || {};
    friendInterestedSections = data.friendInterestedSections || {};
    friendCoursesTaken = data.friendCoursesTaken || {};
    friends = data.friends || {};
    console.log("Loaded User Preferences:", userInfo.preferences);
    await checkForGrid();

    const observer = new MutationObserver(checkForGrid);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  },
);

async function checkForGrid() {
  const visibleGrid = document.querySelector(
    '[data-automation-id="VisibleGrid"]',
  );
  if (visibleGrid) await handleGrid();
}

function createToolTip(
  rmpLink,
  rmpQuality,
  rmpDifficulty,
  scuQuality,
  scuDifficulty,
  scuWorkload,
) {
  const ratingDiv = document.createElement("div");
  ratingDiv.innerHTML = `
        <div style="
          position: absolute;
          background-color: #f0f0f0;
          padding: 16px 16px;
          border-radius: 10px;
          font-family: Arial, sans-serif;
          max-width: 250px;
          margin: 5px;
          transform: translateX(-50%);
          pointer-events: auto;
          bottom: 0px;
        ">
          <!-- Add invisible padding wrapper that maintains absolute positioning -->
          <div style="
            position: absolute;
            top: -10px;
            left: -10px;
            right: -10px;
            bottom: -10px;
            background-color: transparent;
            pointer-events: auto;
          "></div>
          <div style="position: relative; pointer-events: auto;">
            <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">
              Section Ratings
            </div>
            
            <div>
              <a href="${rmpLink}" target="_blank" style="color: blue; text-decoration: none; font-weight: 450;">RateMyProfessor</a>
            </div>
            
            <div style="display: flex; gap: 20px; margin: 8px 0;">
              <div>
                <span style="color: ${getRatingColor(rmpQuality, 0, 5, true)}; font-size: 16px; font-weight: bold;">${rmpQuality?.toFixed(2) || "N/A"}</span>
                <span style="color: #666;"> / 5</span>
                <div style="color: #666; font-size: 12px;">quality</div>
              </div>
              <div>
                <span style="color: ${getRatingColor(rmpDifficulty, 1.5, 5, false)};font-size: 16px; font-weight: bold;">${rmpDifficulty?.toFixed(2) || "N/A"}</span>
                <span style="color: #666;"> / 5</span>
                <div style="color: #666; font-size: 12px;">difficulty</div>
              </div>
            </div>
      
            <div style="font-weight: 450; margin: 12px 0 8px 0;">
              SCU Course Evaluations
            </div>
            
            <div style="display: flex; gap: 20px; margin: 8px 0;">
              <div>
                <span style="color: ${getRatingColor(scuQuality, 1, 5, true)}; font-size: 16px; font-weight: bold;">${scuQuality?.toFixed(2) || "N/A"}</span>
                <span style="color: #666;"> / 5</span>
                <div style="color: #666; font-size: 12px;">quality</div>
              </div>
              <div>
                <span style="color: ${getRatingColor(scuDifficulty, 1.5, 5, false)}; font-size: 16px; font-weight: bold;">${scuDifficulty?.toFixed(2) || "N/A"}</span>
                <span style="color: #666;"> / 5</span>
                <div style="color: #666; font-size: 12px;">difficulty</div>
              </div>
              <div>
                <span style="color: ${getRatingColor(scuWorkload, 0, 11, false)}; font-size: 16px; font-weight: bold;">${scuWorkload?.toFixed(2) || "N/A"}</span>
                <div style="color: #666; font-size: 12px;">hrs / wk</div>
              </div>
            </div>
          </div>
        </div>
      `;

  return ratingDiv;
}

function getRatingColor(rating, ratingMin, ratingMax, goodValuesAreHigher) {
  if (!rating) return "rgba(0, 0, 0, 0.5)";
  if (rating < ratingMin) rating = ratingMin;
  if (rating > ratingMax) rating = ratingMax;
  const greenShade = [104, 227, 0];
  const yellowShade = [255, 234, 0];
  const redShade = [148, 0, 0];
  const ratingMid = ratingMin + (ratingMax - ratingMin) / 2;
  if (rating <= ratingMid && goodValuesAreHigher) {
    return interpolateColor(
      redShade,
      yellowShade,
      (rating - ratingMin) / (ratingMid - ratingMin),
    );
  }
  if (rating <= ratingMid && !goodValuesAreHigher) {
    return interpolateColor(
      greenShade,
      yellowShade,
      (rating - ratingMin) / (ratingMid - ratingMin),
    );
  }
  if (goodValuesAreHigher) {
    return interpolateColor(
      yellowShade,
      greenShade,
      (rating - ratingMid) / (ratingMax - ratingMid),
    );
  }
  return interpolateColor(
    yellowShade,
    redShade,
    (rating - ratingMid) / (ratingMax - ratingMid),
  );
}

function interpolateColor(color1, color2, ratio) {
  const r = Math.round(color1[0] + ratio * (color2[0] - color1[0]));
  const g = Math.round(color1[1] + ratio * (color2[1] - color1[1]));
  const b = Math.round(color1[2] + ratio * (color2[2] - color1[2]));
  return `rgba(${r}, ${g}, ${b}, 1)`;
}

function appendRatingInfoToCell(tdElement, ratingInfo) {
  const overallScore = calcOverallScore(ratingInfo);
  const scoreContainer = document.createElement("div");
  scoreContainer.style.display = "flex";
  scoreContainer.style.alignItems = "center";
  scoreContainer.style.gap = "4px";

  // Create score text
  const scoreText = document.createElement("div");
  scoreText.innerHTML = `
        <span style="font-size: 24px; font-weight: bold; color: ${getRatingColor(overallScore, 0, 10, true)};">${overallScore?.toFixed(2) || "N/A"}</span>
        <span style="color: #6c757d; font-size: 16px;">/ 10</span>
      `;

  // Create info button with tooltip
  const infoButton = document.createElement("div");
  infoButton.innerHTML = "ⓘ"; // Unicode info symbol
  infoButton.style.cssText = `
        cursor: help;
        color: #6c757d;
        font-size: 14px;
        margin-left: 4px;
        position: relative;
      `;

  // Create tooltip
  const tooltip = document.createElement("div");
  tooltip.innerHTML = createToolTip(
    ratingInfo.rmpLink,
    ratingInfo.rmpQuality,
    ratingInfo.rmpDifficulty,
    ratingInfo.scuQuality,
    ratingInfo.scuDifficulty,
    ratingInfo.scuWorkload,
  ).innerHTML;
  tooltip.style.cssText = `
        transform: translateX(-50%);
        color: black;
        font-size: 12px;
        white-space: nowrap;
        display: none;
        z-index: 1000;
        pointer-events: auto; 
      `;

  infoButton.addEventListener("mouseenter", (event) => {
    inButton = true;
    document.body.appendChild(tooltip);
    tooltip.style.display = "block";

    const rect = infoButton.getBoundingClientRect();

    const tooltipX = rect.left + rect.width + 100 + window.scrollX;
    const tooltipY = rect.top - tooltip.offsetHeight + window.scrollY;

    tooltip.style.position = "absolute";
    tooltip.style.left = `${tooltipX}px`;
    tooltip.style.top = `${tooltipY}px`;
  });

  infoButton.addEventListener("mouseleave", () => {
    inButton = false;
    if (inTooltip) return;
    tooltip.style.display = "none";

    // Remove tooltip from the body
    if (tooltip.parentElement) {
      document.body.removeChild(tooltip);
    }
  });

  tooltip.addEventListener("mouseenter", () => {
    inTooltip = true;
    tooltip.style.display = "block"; // Ensure it's visible
  });

  tooltip.addEventListener("mouseleave", () => {
    inTooltip = false;
    if (inButton) return;
    tooltip.style.display = "none";

    // Remove tooltip from the body
    if (tooltip.parentElement) {
      document.body.removeChild(tooltip);
    }
  });
  const sectionTimeMatch = document.createElement("div");
  sectionTimeMatch.innerHTML = `      
            <div style="display: flex; gap: 20px; margin: 5px 0  5px 0;">
              <div style="color: #666;">
                <span style="margin-right: 4px; font-weight:bold">${(ratingInfo.matchesTimePreference && "✓") || "X"}</span> Section Time
              </div>
            </div>`;
  const friendsTaken = document.createElement("div");
  friendsTaken.innerHTML = `
            <div style="display: flex; gap: 20px; margin: 5px 0  5px 0;">
              <div style="color: #666;">
                <span style="margin-right: 4px; font-weight:bold">${ratingInfo.friendsTaken.length}</span> Friends Taken
              </div>
            </div>
          `;
  const friendsInterested = document.createElement("div");
  friendsInterested.innerHTML = `
            <div style="display: flex; gap: 20px; margin: 5px 0  5px 0;">
              <div style="color: #666;">
                <span style="margin-right: 4px; font-weight:bold">${ratingInfo.friendsInterested.length}</span> Friends Interested
              </div>
            </div>
          `;
  infoButton.appendChild(tooltip);
  scoreContainer.appendChild(scoreText);
  scoreContainer.appendChild(infoButton);
  tdElement.appendChild(scoreContainer);
  tdElement.appendChild(sectionTimeMatch);
  tdElement.appendChild(friendsTaken);
  tdElement.appendChild(friendsInterested);
}
