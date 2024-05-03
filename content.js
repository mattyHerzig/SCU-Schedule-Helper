// TODO:
// Make it look good e.g. color choice, RMP logo, etc.
// Popup, etc. other stuff whatever
// Handle errors at top of extensions list

// Select highlight issue

// Better organize code eg comments, parent wrapper folder eg for crx, pem? Need to reconfigure VS Code, npm?

// Can use map to keep track of if I've already gotten a prof's RMP (assuming we don't switch to class-specific)?

const tempQualityDiv = document.createElement("div");
const tempDifficultyDiv = document.createElement("div");
tempQualityDiv.style.visibility = "hidden";
tempDifficultyDiv.style.visibility = "hidden";
document.body.appendChild(tempQualityDiv);
document.body.appendChild(tempDifficultyDiv);
tempQualityDiv.innerHTML = `<a target="_blank" style="color: #005dba; text-decoration: none;">Quality: 🔍</a>`;
tempDifficultyDiv.innerHTML = `<a target="_blank" style="color: #005dba; text-decoration: none;">Difficulty: 🔍</a>`;
const qualityDivMaxHeight = tempQualityDiv.offsetHeight;
const difficultyDivMaxHeight = tempDifficultyDiv.offsetHeight;
document.body.removeChild(tempQualityDiv);
document.body.removeChild(tempDifficultyDiv);

const colorMax = 255;
const blue = (0 / 255) * colorMax;

function changeColor(td, avgRating, reversed) {
  let red, green;
  if (avgRating >= 3) {
    green = colorMax;
    red = colorMax * (5 - avgRating) / 2;
  } else {
    green = colorMax * (avgRating - 1) / 2;
    red = colorMax;
  }
  // red = colorMax * (5 - avgRating) / 4;
  // green = colorMax * (avgRating - 1) / 4;
  if (reversed) {
    const temp = red;
    red = green;
    green = temp;
  }
  const color = `rgba(${red}, ${green}, ${blue}, 0.5)`;
  td.style.transition = "background-color 0.5s ease";
  td.style.backgroundColor = color;
  td.style.setProperty("background-color", color, "important");
}

function getInvalidRatingDivInnerHtml(ratingType, includeMagnifyingGlass, instructorName) {
  const index = instructorName.includes("|")
    ? instructorName.lastIndexOf("|") - 1
    : instructorName.length;
  const firstInstructorName = instructorName.substring(0, index);
  return `<a href="https://www.ratemyprofessors.com/search/professors?q=${firstInstructorName}" target="_blank" style="color: #005dba; text-decoration: none;" onmouseover="this.style.textDecoration='underline';" onmouseout="this.style.textDecoration='none';">${ratingType}: ${includeMagnifyingGlass ? '🔍' : ''}</a>`;
}

function getValidRatingDivInnerHtml(ratingType, avgRating, legacyId) {
  return `<a href="https://www.ratemyprofessors.com/professor/${legacyId}" target="_blank" style="color: #005dba; text-decoration: none;" onmouseover="this.style.textDecoration='underline';" onmouseout="this.style.textDecoration='none';">${ratingType}: ${avgRating.toFixed(1) + "/5.0"}</a>`;
}

function getEmptyRatingDivInnerHtml(ratingType) {
  return `<a target="_blank" style="color: #005dba; text-decoration: none;">${ratingType}: </a>`;
}

function insertRatings(instructorDiv, unitsDiv, ratings) {
  const instructorName = instructorDiv.textContent;
  const qualityDiv = document.createElement("div");
  const difficultyDiv = document.createElement("div");
  qualityDiv.style.height = `${qualityDivMaxHeight}px`;
  difficultyDiv.style.height = `${difficultyDivMaxHeight}px`;
  qualityDiv.innerHTML = getEmptyRatingDivInnerHtml("Quality");
  difficultyDiv.innerHTML = getEmptyRatingDivInnerHtml("Difficulty");
  instructorDiv.appendChild(qualityDiv);
  unitsDiv.appendChild(difficultyDiv);
  let promise = getRmpRatings(instructorName).then((rating) => {
    if (rating !== null) {
      ratings.validRatingsCount++;
      ratings.totalQuality += rating["avgRating"];
      ratings.totalDifficulty += rating["avgDifficulty"];
      qualityDiv.innerHTML = getValidRatingDivInnerHtml("Quality", rating["avgRating"], rating["legacyId"]);
      difficultyDiv.innerHTML = getValidRatingDivInnerHtml("Difficulty", rating["avgDifficulty"], rating["legacyId"]);
    } else {
      qualityDiv.innerHTML = getInvalidRatingDivInnerHtml("Quality", true, instructorName);
      difficultyDiv.innerHTML = getInvalidRatingDivInnerHtml("Difficulty", false, instructorName);
    }
  });
  ratings.ratingPromises.push(promise);
}

function handleGrid(visibleGrid) {
  const mainTables = visibleGrid.querySelectorAll('[data-automation-id^="MainTable-"]');
  mainTables.forEach((mainTable) => {
    if (mainTable.classList.contains("modified")) return;
    mainTable.classList.add("modified");
    const mainTableRows = mainTable.querySelectorAll('.mainTable tr:not([data-automation-id="ghostRow"])');
    mainTableRows.forEach((mainTableRow) => {
      const instructorsTd = mainTableRow.querySelector('td[headers^="columnheader6"]');
      const unitsTd = mainTableRow.querySelector('td[headers^="columnheader7"]');
      if (!instructorsTd) return;
      let ratings = {
        totalQuality: 0,
        totalDifficulty: 0,
        validRatingsCount: 0,
        ratingPromises: []
      };
      const instructorDivs = instructorsTd.querySelectorAll('[data-automation-id^="selectedItem_"]');
      const unitsDiv = unitsTd.querySelector('[role="presentation"]');
      instructorDivs.forEach((instructorDiv) => insertRatings(instructorDiv, unitsDiv, ratings));
      Promise.all(ratings.ratingPromises).then(() => {
        if (ratings.validRatingsCount !== 0) {
          changeColor(instructorsTd, ratings.totalQuality / ratings.validRatingsCount, false);
          changeColor(unitsTd, ratings.totalDifficulty / ratings.validRatingsCount, true);
        }
      });
    });
  });
}

// function widenUnitsColumn(visibleGrid) {
//   const styleElements = Array.from(document.head.querySelectorAll('style[type="text/css"]'));
//   const widthStyleElements = styleElements.filter(style => style.textContent.includes('width:'));
//   if (widthStyleElements.length < 9) return;
//   visibleGrid.classList.add("modified");
//   let unitsColumnStyle = widthStyleElements[8];
//   unitsColumnStyle.textContent = unitsColumnStyle.textContent.replace(/width:\d+PX;/, "width:120PX;");
// }

function checkForGrid() {
  const loadingPanel = document.querySelector("[data-automation-loadingpanelhidden]");
  const isLoading = loadingPanel
    ? loadingPanel.getAttribute("data-automation-loadingpanelhidden") === "false"
    : false;
  if (isLoading) return;
  const scuFindCourseSections = document.querySelector('div[title="SCU Find Course Sections"]');
  if (!scuFindCourseSections) return;
  const visibleGrid = document.querySelector('[data-automation-id="VisibleGrid"]');
  if (!visibleGrid) return;
  // if (!visibleGrid.classList.contains("modified")) widenUnitsColumn(visibleGrid);
  handleGrid(visibleGrid);
}

const observer = new MutationObserver(checkForGrid);
observer.observe(document.documentElement, { childList: true, subtree: true });
checkForGrid(); // Initial check in case the page is already loaded
