// TODO:
// Make it look good e.g. color choice, RMP logo, etc.
// Popup, etc. other stuff whatever
// Handle errors at top of extensions list

// Select highlight issue

// TODO: better organize code eg comments, parent wrapper folder eg for crx, pem? Need to reconfigure VS Code, npm?

// Can use map to keep track of if I've already gotten a prof's RMP (assuming we don't switch to class-specific)

const tempRatingDiv = document.createElement("div");
tempRatingDiv.style.visibility = "hidden";
document.body.appendChild(tempRatingDiv);
tempRatingDiv.innerHTML = `<a target="_blank" style="color: #005dba; text-decoration: none;">Score: 🔍</a>`;
const ratingDivMaxHeight = tempRatingDiv.offsetHeight;
document.body.removeChild(tempRatingDiv);



function changeColor(instructorsTd, ratings) {
  if (ratings.validRatingsCount === 0) return;
  const averageScore = ratings.totalScore / ratings.validRatingsCount;
  const red = Math.floor((255 * (5 - averageScore)) / 4);
  const green = Math.floor((255 * (averageScore - 1)) / 4);
  const color = `rgba(${red}, ${green}, 0, 0.5)`;
  instructorsTd.style.transition = "background-color 0.5s ease";
  instructorsTd.style.backgroundColor = color;
}

function getRatingDivInnerHtml(validRating, ratings, avgRating, legacyId, instructorName) {
  let url, score;
  if (validRating) {
    ratings.totalScore += avgRating;
    ratings.validRatingsCount++;
    url = `https://www.ratemyprofessors.com/professor/${legacyId}`;
    score = avgRating.toFixed(1) + "/5.0";
  } else {
    const index = instructorName.includes("|")
      ? instructorName.lastIndexOf("|") - 1
      : instructorName.length;
    const firstInstructorName = instructorName.substring(0, index);
    url = `https://www.ratemyprofessors.com/search/professors?q=${firstInstructorName}`;
    score = "🔍";
  }
  return `<a href="${url}" target="_blank" style="color: #005dba; text-decoration: none;" onmouseover="this.style.textDecoration='underline';" onmouseout="this.style.textDecoration='none';">Score: ${score}</a>`;
}

function insertRating(instructorDiv, ratings) {
  const instructorName = instructorDiv.textContent;
  const ratingDiv = document.createElement("div");
  ratingDiv.style.height = `${ratingDivMaxHeight}px`;
  ratingDiv.innerHTML = `<a target="_blank" style="color: #005dba; text-decoration: none;">Score: </a>`;
  instructorDiv.appendChild(ratingDiv);
  let promise = getRmpRatings(instructorName).then((rating) => {
    const validRating = rating !== null;
    const avgRating = validRating ? rating["avgRating"] : 0;
    const legacyId = validRating ? rating["legacyId"] : 0;
    ratingDiv.innerHTML = getRatingDivInnerHtml(validRating, ratings, avgRating, legacyId, instructorName);
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
      if (!instructorsTd) return;
      let ratings = {
        totalScore: 0,
        validRatingsCount: 0,
        ratingPromises: []
      };
      const instructorDivs = instructorsTd.querySelectorAll('[data-automation-id^="selectedItem_"]');
      instructorDivs.forEach((instructorDiv) => insertRating(instructorDiv, ratings));
      Promise.all(ratings.ratingPromises).then(() => changeColor(instructorsTd, ratings));
    });
  });
}

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
  handleGrid(visibleGrid);
}

const observer = new MutationObserver(checkForGrid);
observer.observe(document.documentElement, { childList: true, subtree: true });
checkForGrid(); // Initial check in case the page is already loaded
