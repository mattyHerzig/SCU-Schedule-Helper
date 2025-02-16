let evalsData = {};
let userInfo = {};
let inTooltip = false;
let inButton = false;
let friendInterestedSections = {};
let friendCoursesTaken = {};
let friends = {};

const Difficulty = Object.freeze({
  VeryEasy: 0,
  Easy: 1,
  Medium: 2,
  Hard: 3,
  VeryHard: 4,
});

let prefferedDifficulty = Difficulty.VeryEasy;
let preferredDifficultyPercentile = prefferedDifficulty / 4;

const courseTakenPattern = /P{(.*?)}C{(.*?)}T{(.*?)}/; // P{profName}C{courseCode}T{termName}
const interestedSectionPattern = /P{(.*?)}S{(.*?)}M{(.*?)}/; // P{profName}S{full section string}M{meetingPattern}E{expirationTimestamp}

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
    if (userInfo.preferences && userInfo.preferences.difficulty) {
      prefferedDifficulty = userInfo.preferences.difficulty;
      preferredDifficultyPercentile = prefferedDifficulty / 4;
    }
    if (
      userInfo.preferences &&
      !nullOrUndefined(userInfo.preferences.showRatings)
    ) {
      if (!userInfo.preferences.showRatings) return;
    }
    evalsData = data.evals || {};
    friendInterestedSections = data.friendInterestedSections || {};
    friendCoursesTaken = data.friendCoursesTaken || {};
    friends = data.friends || {};
    await checkForGrid();

    const observer = new MutationObserver(checkForGrid);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  },
);

async function checkForGrid() {
  const visibleGrid = document.querySelector('[data-automation-id="VisibleGrid"]'); // Find Courses Page
  const rivaWidget = document.querySelector('[data-automation-id="rivaWidget"]'); // Saved Schedule Page
  if (visibleGrid) {
    await handleFindSectionsGrid();
  } else if (rivaWidget) {
    await handleSavedSchedulePageGrid();
  }
}

async function handleFindSectionsGrid() {
  const courseSectionRows = document.querySelectorAll(
    "table.lockedTable tbody tr",
  );
  const mainSectionRows = document.querySelectorAll("table.mainTable tbody tr");

  for (let i = 0; i < courseSectionRows.length; i++) {
    const row = courseSectionRows[i];
    const courseSectionCell = row.cells[0];
    let courseText = courseSectionCell.innerText.trim();
    if (courseText === "") continue;
    if (courseSectionCell.hasAttribute("has-ratings")) continue;
    courseSectionCell.setAttribute("has-ratings", "true");
    const mainRow = mainSectionRows[i];
    const instructorCell = mainRow.cells[5];
    let professorName = instructorCell.innerText.trim().split("\n")[0];
    const pushDown = document.createElement("div");
    pushDown.style.height = "100px";
    courseSectionCell.appendChild(pushDown);
    await displayProfessorDifficulty(courseSectionCell, mainRow, professorName, false);
    courseSectionCell.removeChild(pushDown);
    mainRow.cells[0].appendChild(document.createElement("br"));
    mainRow.cells[0].appendChild(document.createElement("br"));
    mainRow.cells[0].appendChild(document.createElement("br"));
  }
}

async function handleSavedSchedulePageGrid() {
  const courses = document.querySelectorAll(
    '[data-testid="table"] tbody tr',
  );
  for (let i = 0; i < courses.length; i++) {
    const courseRow = courses[i];
    const courseCell = courseRow.cells[0];
    let courseText = courseCell.innerText.trim();
    if (courseText === "" || courseRow.cells.length < 10) continue;
    if (courseCell.hasAttribute("has-ratings")) continue;
    courseCell.setAttribute("has-ratings", "true");
    const instructorCell = courseRow.cells[6];
    let professorName = instructorCell.innerText.trim().split("\n")[0];
    const pushDown = document.createElement("div");
    pushDown.style.height = "100px";
    courseCell.appendChild(pushDown);
    await displayProfessorDifficulty(courseCell, courseRow, professorName,true);
    courseCell.removeChild(pushDown);
    courseRow.cells[0].appendChild(document.createElement("br"));
    courseRow.cells[0].appendChild(document.createElement("br"));
    courseRow.cells[0].appendChild(document.createElement("br"));
  }
}

async function displayProfessorDifficulty(
  courseSectionCell,
  mainSectionRow,
  professorName,
  isSavedSchedulePage
) {
  const difficultyContainer = document.createElement("div");
  difficultyContainer.style.fontSize = "1em";
  difficultyContainer.style.color = "gray";
  difficultyContainer.style.marginTop = "5px";

  const rmpResponse = await chrome.runtime.sendMessage({
    type: "getRmpRatings",
    profName: professorName,
  });
  let scuEvalsQuality = null;
  let scuEvalsDifficulty = null;
  let scuEvalsWorkload = null;
  let rmpLink = `https://www.ratemyprofessors.com/search/professors?q=${getProfName(professorName, true)}`;
  if (rmpResponse && rmpResponse.legacyId)
    rmpLink = `https://www.ratemyprofessors.com/professor/${rmpResponse.legacyId}`;

  let prof = getProfName(professorName);
  let courseText = courseSectionCell.innerText.trim();
  const courseCode = courseText
    .substring(0, courseText.indexOf("-"))
    .replace(/\s/g, "");
  const department = courseText.substring(0, courseText.indexOf(" "));
  if (evalsData[prof]?.[courseCode]) {
    ({ scuEvalsQuality, scuEvalsDifficulty, scuEvalsWorkload } =
      getScuEvalsAvgMetric(evalsData[prof][courseCode]));
  } else if (evalsData[prof]?.[department]) {
    ({ scuEvalsQuality, scuEvalsDifficulty, scuEvalsWorkload } =
      getScuEvalsAvgMetric(evalsData[prof][department]));
  } else if (evalsData[prof]?.overall) {
    ({ scuEvalsQuality, scuEvalsDifficulty, scuEvalsWorkload } =
      getScuEvalsAvgMetric(evalsData[prof].overall));
  } else if (evalsData[courseCode]) {
    ({ scuEvalsQuality, scuEvalsDifficulty, scuEvalsWorkload } =
      getScuEvalsAvgMetric(evalsData[courseCode]));
  }

  // Decide which cell to get meeting pattern from
  let meetingPattern = null;
  if (isSavedSchedulePage) {
    meetingPattern = mainSectionRow.cells[9].textContent.trim();
  } else {
    meetingPattern = mainSectionRow.cells[7].textContent.trim();
  }
  
  const timeMatch = meetingPattern.match(/\d{1,2}:\d{2} [AP]M - \d{1,2}:\d{2} [AP]M/);
  let timeWithinPreference = false;
  if (timeMatch) {

    const meetingTime = timeMatch[0];
    if (isTimeWithinPreference(meetingTime)) {
      timeWithinPreference = true;
    }
  }

  const friendsTaken = [];
  for (const friend in friendCoursesTaken[courseCode]) {
    const match =
      friendCoursesTaken[courseCode][friend].match(courseTakenPattern);
    if (!match) continue;
    if (
      !match[1] ||
      match[1].includes(prof) ||
      match[1] === "Not taken at SCU"
    ) {
      friendsTaken.push(friends[friend].name);
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

  const qualityAvgs = evalsData.departmentStatistics?.[department]?.qualityAvgs;
  const difficultyAvgs =
    evalsData.departmentStatistics?.[department]?.difficultyAvgs;
  const workloadAvgs =
    evalsData.departmentStatistics?.[department]?.workloadAvgs;

  // Edge case: course eval data is available, but percentile is not.
  let scuEvalsQualityPercentile = getPercentile(scuEvalsQuality, qualityAvgs);
  if (scuEvalsQuality && !scuEvalsQualityPercentile) {
    scuEvalsQualityPercentile = (scuEvalsQuality - 1) / 4;
  }
  let scuEvalsDifficultyPercentile = getPercentile(scuEvalsDifficulty, difficultyAvgs);
  if (scuEvalsDifficulty && !scuEvalsDifficultyPercentile) {
    scuEvalsDifficultyPercentile = (scuEvalsDifficulty - 1) / 4;
  }
  let scuEvalsWorkloadPercentile = getPercentile(scuEvalsWorkload, workloadAvgs);
  if (scuEvalsWorkload && !scuEvalsWorkloadPercentile) {
    scuEvalsWorkloadPercentile = scuEvalsWorkload / 15.0;
  }

  appendRatingInfoToCell(courseSectionCell, {
    rmpLink,
    rmpQuality: rmpResponse?.avgRating,
    rmpDifficulty: rmpResponse?.avgDifficulty,
    scuEvalsQuality,
    scuEvalsDifficulty,
    scuEvalsWorkload,
    scuEvalsQualityPercentile,
    scuEvalsDifficultyPercentile,
    scuEvalsWorkloadPercentile,
    matchesTimePreference: timeWithinPreference,
    friendsTaken,
    friendsInterested,
  });
}

function getScuEvalsAvgMetric(rating) {
  if (
    !rating ||
    !rating.qualityTotal ||
    !rating.qualityCount ||
    !rating.difficultyTotal ||
    !rating.difficultyCount ||
    !rating.workloadTotal ||
    !rating.workloadCount
  )
    return null;
  return {
    scuEvalsQuality: rating.qualityTotal / rating.qualityCount,
    scuEvalsDifficulty: rating.difficultyTotal / rating.difficultyCount,
    scuEvalsWorkload: rating.workloadTotal / rating.workloadCount,
  };
}

function calcOverallScore(scores) {
  let { scuEvals = 50, rmp = 50 } = userInfo?.preferences?.scoreWeighting || {};
  let {
    rmpQuality,
    rmpDifficulty,
    scuEvalsQualityPercentile,
    scuEvalsDifficultyPercentile,
    scuEvalsWorkloadPercentile,
  } = scores;
  if (
    !rmpQuality &&
    !rmpDifficulty &&
    !scuEvalsQualityPercentile &&
    !scuEvalsDifficultyPercentile &&
    !scuEvalsWorkloadPercentile
  )
    return null;

  if (nullOrUndefined(rmpQuality) || nullOrUndefined(rmpDifficulty)) {
    return scuEvalsScore(
      scuEvalsQualityPercentile,
      scuEvalsDifficultyPercentile,
      scuEvalsWorkloadPercentile,
    );
  }
  if (
    nullOrUndefined(scuEvalsQualityPercentile) ||
    nullOrUndefined(scuEvalsDifficultyPercentile) ||
    nullOrUndefined(scuEvalsWorkloadPercentile)
  ) {
    return rmpScore(rmpQuality, rmpDifficulty);
  }
  return (
    scuEvalsScore(
      scuEvalsQualityPercentile,
      scuEvalsDifficultyPercentile,
      scuEvalsWorkloadPercentile,
    ) *
    (scuEvals / 100) +
    rmpScore(rmpQuality, rmpDifficulty) * (rmp / 100)
  );
}

function scuEvalsScore(
  qualityPercentile,
  difficultyPercentile,
  workloadPercentile,
) {
  const qualityScore = qualityPercentile * 100;
  const difficultyScore =
    100 - Math.abs(preferredDifficultyPercentile - difficultyPercentile) * 100;
  const workloadScore =
    100 - Math.abs(preferredDifficultyPercentile - workloadPercentile) * 100;
  return ((qualityScore + difficultyScore + workloadScore) / 300) * 10;
}

function rmpScore(quality, difficulty) {
  // Ranges go from 1 to 5, so we normalize them to 0 to 4.
  quality -= 1;
  difficulty -= 1;
  // Percentiles would be better, but we don't have that data.
  const difficultyScore = 4 - Math.abs(prefferedDifficulty - difficulty);
  return ((quality + difficultyScore) / 8) * 10;
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
  infoButton.innerHTML = `<img src="${chrome.runtime.getURL("images/info_icon.png")}" alt ="info" width="17" height="17"/>`;
  infoButton.style.cssText = `
        cursor: help;
        color: #6c757d;
        font-size: 14px;
        margin-left: 4px;
        position: relative;
      `;

  // Create tooltip
  const tooltip = document.createElement("div");
  tooltip.innerHTML = createRatingToolTip(ratingInfo).innerHTML;
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
                <span style="margin-right: 4px; font-weight:bold">${ratingInfo.friendsTaken.length}</span> ${(ratingInfo.friendsTaken.length === 1 && "Friend") || "Friends"} Took
              </div>
            </div>
          `;
  const friendsTakenTooltip = createFriendsToolTip(ratingInfo.friendsTaken);
  friendsTaken.addEventListener("mouseenter", (event) => {
    if (ratingInfo.friendsTaken.length === 0) return;
    document.body.appendChild(friendsTakenTooltip);
    friendsTakenTooltip.style.display = "block";

    const rect = friendsTaken.getBoundingClientRect();

    const tooltipX = rect.left + rect.width + window.scrollX;
    const tooltipY =
      rect.top - friendsTakenTooltip.offsetHeight + window.scrollY;

    friendsTakenTooltip.style.position = "absolute";
    friendsTakenTooltip.style.left = `${tooltipX - 10}px`;
    friendsTakenTooltip.style.top = `${tooltipY + 10}px`;
  });

  friendsTaken.addEventListener("mouseleave", () => {
    friendsTakenTooltip.style.display = "none";

    // Remove tooltip from the body
    if (friendsTakenTooltip.parentElement) {
      document.body.removeChild(friendsTakenTooltip);
    }
  });

  const friendsInterested = document.createElement("div");
  friendsInterested.innerHTML = `
            <div style="display: flex; gap: 20px; margin: 5px 0  5px 0;">
              <div style="color: #666;">
                <span style="margin-right: 4px; font-weight:bold">${ratingInfo.friendsInterested.length}</span> ${(ratingInfo.friendsInterested.length === 1 && "Friend") || "Friends"} Interested
              </div>
            </div>
          `;

  const friendsInterestedTooltip = createFriendsToolTip(
    ratingInfo.friendsInterested,
  );
  friendsInterested.addEventListener("mouseenter", (event) => {
    if (ratingInfo.friendsInterested.length === 0) return;
    document.body.appendChild(friendsInterestedTooltip);
    friendsInterestedTooltip.style.display = "block";

    const rect = friendsInterested.getBoundingClientRect();

    const tooltipX = rect.left + rect.width + window.scrollX;
    const tooltipY =
      rect.top - friendsInterestedTooltip.offsetHeight + window.scrollY;

    friendsInterestedTooltip.style.position = "absolute";
    friendsInterestedTooltip.style.left = `${tooltipX}px`;
    friendsInterestedTooltip.style.top = `${tooltipY}px`;
  });

  friendsInterested.addEventListener("mouseleave", () => {
    friendsInterestedTooltip.style.display = "none";

    // Remove tooltip from the body
    if (friendsInterestedTooltip.parentElement) {
      document.body.removeChild(friendsInterestedTooltip);
    }
  });
  infoButton.appendChild(tooltip);
  scoreContainer.appendChild(scoreText);
  scoreContainer.appendChild(infoButton);
  tdElement.appendChild(scoreContainer);
  tdElement.appendChild(sectionTimeMatch);
  tdElement.appendChild(friendsTaken);
  tdElement.appendChild(friendsInterested);
}

function createRatingToolTip(ratingInfo) {
  let {
    rmpLink,
    rmpQuality,
    rmpDifficulty,
    scuEvalsQuality,
    scuEvalsDifficulty,
    scuEvalsWorkload,
    scuEvalsQualityPercentile,
    scuEvalsDifficultyPercentile,
    scuEvalsWorkloadPercentile,
  } = ratingInfo;
  const ratingDiv = document.createElement("div");

  const rmpDifficultyColor = getRatingColor(
    Math.abs(prefferedDifficulty - rmpDifficulty + 1),
    0,
    4,
    false,
  );
  const scuEvalsQualityScore = scuEvalsQualityPercentile
    ? scuEvalsQualityPercentile * 100
    : undefined;
  const scuEvalsQualityColor = getRatingColor(
    scuEvalsQualityScore,
    0,
    100,
    true,
  );
  const scuEvalsDifficultyScore = scuEvalsDifficultyPercentile
    ? Math.abs(preferredDifficultyPercentile - scuEvalsDifficultyPercentile) *
    100
    : undefined;
  const scuEvalsDifficultyColor = getRatingColor(
    scuEvalsDifficultyScore,
    0,
    100,
    false,
  );
  const scuEvalsWorkloadScore = scuEvalsWorkloadPercentile
    ? Math.abs(preferredDifficultyPercentile - scuEvalsWorkloadPercentile) * 100
    : undefined;
  const scuEvalsWorkloadColor = getRatingColor(
    scuEvalsWorkloadScore,
    0,
    100,
    false,
  );
  ratingDiv.innerHTML = `
        <div style="
          position: absolute;
          background-color:rgb(255, 255, 255);
          padding: 16px 16px;
          border-radius: 10px;
          border: 1px solid black;
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
            top: -20px;
            left: -20px;
            right: -20px;
            bottom: -20px;
            
            background-color: transparent;
            pointer-events: auto;
          "></div>
          <div style="position: relative; pointer-events: auto;">
            <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">
              Section Ratings
            </div>
            
            <div>
              <a href="${rmpLink}" target="_blank" style="color: blue; text-decoration: none; font-size: 13px;">RateMyProfessor</a>
            </div>
            
            <div style="display: flex; gap: 20px; margin: 8px 0;">
              <div>
                <span style="color: ${getRatingColor(rmpQuality, 1, 5, true)}; font-size: 16px; font-weight: bold;">${rmpQuality?.toFixed(2) || "N/A"}</span>
                <span style="color: #666;"> / 5</span>
                <div style="color: #666; font-size: 12px;">quality</div>
              </div>
              <div>
                <span style="color: ${rmpDifficultyColor};font-size: 16px; font-weight: bold;">${rmpDifficulty?.toFixed(2) || "N/A"}</span>
                <span style="color: #666;"> / 5</span>
                <div style="color: #666; font-size: 12px;">difficulty</div>
              </div>
            </div>
      
            <div style="font-size: 13px; margin: 12px 0 8px 0;">
              SCU Course Evaluations
            </div>
            
            <div style="display: flex; gap: 20px; margin: 8px 0;">
            ${!userInfo.id &&
    `<div style="white-space: normal; width: 180px;">You must be signed in to view SCU evals data. Sign-in with the extension popup. </div>`
    ||
    `
              <div>
                <span style="color: ${scuEvalsQualityColor}; font-size: 16px; font-weight: bold;">${scuEvalsQuality?.toFixed(2) || "N/A"}</span>
                <span style="color: #666;"> / 5</span>
                <div style="color: #666; font-size: 12px;">quality</div>
              </div>
              <div>
                <span style="color: ${scuEvalsDifficultyColor}; font-size: 16px; font-weight: bold;">${scuEvalsDifficulty?.toFixed(2) || "N/A"}</span>
                <span style="color: #666;"> / 5</span>
                <div style="color: #666; font-size: 12px;">difficulty</div>
              </div>
              <div>
                <span style="color: ${scuEvalsWorkloadColor}; font-size: 16px; font-weight: bold;">${scuEvalsWorkload?.toFixed(2) || "N/A"}</span>
                <div style="color: #666; font-size: 12px;">hrs / wk</div>
              </div>
              `}
            </div>
          </div>
        </div>
      `;

  return ratingDiv;
}

function createFriendsToolTip(friendsTakenOrInterested) {
  const friendsTooltipDiv = document.createElement("div");
  friendsTooltipDiv.innerHTML = `
        <div style="
          position: absolute;
          background-color: #f0f0f0;
          padding: 8px 8px;
          border-radius: 10px;
          font-family: Arial, sans-serif;
          max-width: 250px;
          margin: 5px;
          transform: translateX(-50%);
          pointer-events: auto;
          bottom: 0px;
        ">
          <div style="
            position: absolute;
            top: -10px;
            left: -10px;
            right: -10px;
            bottom: -10px;
            background-color: transparent;
            pointer-events: auto;
          "></div>
          <div style="position: relative; pointer-events: auto; width:max-content">
          ${friendsTakenOrInterested.reduce((acc, friend) => {
    return (
      acc + `<div style="color: #666; font-size:14px">${friend}</div>`
    );
  }, "")}
          </div>
        </div>
      `;
  return friendsTooltipDiv;
}

function getProfName(profName, usePreferred = false) {
  if (profName.includes("|")) {
    return profName.split("|")[+usePreferred].trim();
  }
  return profName;
}

function getRatingColor(rating, ratingMin, ratingMax, goodValuesAreHigher) {
  if (nullOrUndefined(rating)) return "rgba(0, 0, 0, 0.5)";
  if (rating < ratingMin) rating = ratingMin;
  if (rating > ratingMax) rating = ratingMax;
  const greenShade = [66, 134, 67];
  const yellowShade = [255, 234, 0];
  const redShade = [194, 59, 34];
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

function parseTime(timeString) {
  const [time, period] = timeString.trim().split(/\s+/);
  let [hours, minutes] = time.split(":").map(Number);

  if (period.toUpperCase() === "PM" && hours !== 12) hours += 12;
  if (period.toUpperCase() === "AM" && hours === 12) hours = 0;

  return { hours, minutes };
}

function getPercentile(value, array) {
  if (!value || !array || array.length === 0) return null;
  return bsFind(array, value) / array.length;
}

function bsFind(sortedArray, target) {
  let left = 0;
  let right = sortedArray.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (sortedArray[mid] === target) return mid;
    if (sortedArray[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return left;
}

function nullOrUndefined(object) {
  return object === null || object === undefined || isNaN(object);
}
