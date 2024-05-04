// TODO:
// Make it look good e.g. color choice, RMP logo, etc.
// Popup, etc. other stuff whatever
// Handle errors at top of extensions list

// Better organize code eg comments, parent wrapper folder eg for crx, pem? Need to reconfigure VS Code, npm?

// Can use map to keep track of if I've already gotten a prof's RMP (assuming we don't switch to class-specific)?



// chrome.storage.sync.get(['extendColorHorizontally', 'individualDifficultyColor', 'includeColor2', 'color1', 'color2', 'color3'], function(data) {console.log(data)});

// console.log('content.js');

let extendColorHorizontally;
let individualDifficultyColor;
let reverseColor;
let includeColor2;
let color1;
let color2;
let color3;
let opacity;

let defaults;

async function getDefaults() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage('getDefaults', function (response) {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

function reloadVisuals() {
  const mainTables = document.querySelectorAll('[data-automation-id^="MainTable-"]');
    mainTables.forEach((mainTable) => {
      mainTable.classList.remove("modified");
  });
  checkForGrid();
}

function loadSettings() {
  chrome.storage.sync.get(['extendColorHorizontally', 'individualDifficultyColor', 'reverseColor', 'includeColor2', 'color1', 'color2', 'color3', 'opacity'], function (data) {
    // console.log('data', data);
    // console.log('defaults', defaults);

    let settingsChanged = false;

    const checkAndAssign = (currentValue, newValue, defaultValue) => {
      const finalValue = newValue !== undefined ? newValue : defaultValue;
      if (currentValue !== finalValue) {
        settingsChanged = true;
        return finalValue;
      }
      return currentValue;
    };

    extendColorHorizontally   = checkAndAssign(extendColorHorizontally,   data.extendColorHorizontally,   defaults.extendColorHorizontally  );
    individualDifficultyColor = checkAndAssign(individualDifficultyColor, data.individualDifficultyColor, defaults.individualDifficultyColor);
    reverseColor              = checkAndAssign(reverseColor,              data.reverseColor,              defaults.reverseColor             );
    includeColor2             = checkAndAssign(includeColor2,             data.includeColor2,             defaults.includeColor2            );
    color1                    = checkAndAssign(color1,                    data.color1,                    defaults.color1                   );
    color2                    = checkAndAssign(color2,                    data.color2,                    defaults.color2                   );
    color3                    = checkAndAssign(color3,                    data.color3,                    defaults.color3                   );
    opacity                   = checkAndAssign(opacity,                   data.opacity,                   defaults.opacity                  );

    if (settingsChanged) {
      reloadVisuals();
    }

    
  });
}

async function setupSettings() {
  defaults = await getDefaults();

  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    // console.log("content.js received message:", request);
    if (request === 'settingsChanged') {
      loadSettings();
    }
  });

  loadSettings();
  // chrome.runtime.sendMessage({ contentLoaded: true });
}

setupSettings();



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



function lerp(a, b, t) {
  return a * t + b * (1 - t);
}

function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
}

function changeColor(td, avgRating, reversed) {
  if (reverseColor) {
    reversed = !reversed;
  }
  let red, green, blue;
  let color1RGB = hexToRgb(reversed ? color3 : color1);
  let color2RGB = hexToRgb(color2);
  let color3RGB = hexToRgb(reversed ? color1 : color3);
  if (includeColor2) {
    if (avgRating >= 3) {
      let t = (avgRating - 3) / 2; // normalize to 0-1
      red   = lerp(color1RGB.r, color2RGB.r, t);
      green = lerp(color1RGB.g, color2RGB.g, t);
      blue  = lerp(color1RGB.b, color2RGB.b, t);
    } else {
      let t = (avgRating - 1) / 2; // normalize to 0-1
      red   = lerp(color2RGB.r, color3RGB.r, t);
      green = lerp(color2RGB.g, color3RGB.g, t);
      blue  = lerp(color2RGB.b, color3RGB.b, t);
    }
  } else {
    let t = (avgRating - 1) / 4; // normalize to 0-1
    red   = lerp(color1RGB.r, color3RGB.r, t);
    green = lerp(color1RGB.g, color3RGB.g, t);
    blue  = lerp(color1RGB.b, color3RGB.b, t);
  }
  const color = `rgba(${red}, ${green}, ${blue}, ${opacity / 100})`;
  td.style.transition = "background-color 0.5s ease";
  td.style.backgroundColor = color;
  td.style.setProperty("background-color", color, "important");
}

function removeColor(td) {
  td.style.transition = "background-color 0.5s ease";
  td.style.backgroundColor = "";
  td.style.setProperty("background-color", "", "important");
}

function colorTdsExtendAndIndividual(tds, avgQuality, avgDifficulty, instructorsTd) {
  let passedInstructorsTd = false;
  for (let td of tds) {
    if (!passedInstructorsTd) {
      changeColor(td, avgQuality, false);
      if (td === instructorsTd) {
        passedInstructorsTd = true;
      }
    } else {
      changeColor(td, avgDifficulty, true);
    }
  }
}

function colorTdsExtend(tds, avgQuality) {
  for (let td of tds) {
    changeColor(td, avgQuality, false);
  }
}

function colorTdsIndividual(tds, avgQuality, avgDifficulty, instructorsTd, unitsTd) {
  for (let td of tds) {
    if (td === instructorsTd) {
      changeColor(td, avgQuality, false);
    } else if (td === unitsTd) {
      changeColor(td, avgDifficulty, true);
    } else {
      removeColor(td);
    }
  }
}

function colorTdsDefault(tds, avgQuality, instructorsTd) {
  for (let td of tds) {
    if (td === instructorsTd) {
      changeColor(td, avgQuality, false);
    } else {
      removeColor(td);
    }
  }
}

function colorTds(lockedTableRow, mainTableRow, avgQuality, avgDifficulty, instructorsTd, unitsTd) {
  const lockedTds = Array.from(lockedTableRow.querySelectorAll('td'));
  const mainTds = Array.from(mainTableRow.querySelectorAll('td'));
  if (extendColorHorizontally && individualDifficultyColor) {
    colorTdsExtendAndIndividual(lockedTds, avgQuality, avgDifficulty, instructorsTd);
    colorTdsExtendAndIndividual(mainTds,   avgQuality, avgDifficulty, instructorsTd);
  } else if (extendColorHorizontally && !individualDifficultyColor) {
    colorTdsExtend(lockedTds, avgQuality);
    colorTdsExtend(mainTds,   avgQuality);
  } else if (!extendColorHorizontally && individualDifficultyColor) {
    colorTdsIndividual(lockedTds, avgQuality, avgDifficulty, instructorsTd, unitsTd);
    colorTdsIndividual(mainTds,   avgQuality, avgDifficulty, instructorsTd, unitsTd);
  } else {
    colorTdsDefault(lockedTds, avgQuality, instructorsTd);
    colorTdsDefault(mainTds,   avgQuality, instructorsTd);
  }
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
  if (instructorDiv.classList.contains("modified")) return; // TODO
  instructorDiv.classList.add("modified");
  const instructorName = instructorDiv.textContent;
  const qualityDiv = document.createElement("div");
  const difficultyDiv = document.createElement("div");
  qualityDiv.style.height = `${qualityDivMaxHeight}px`;
  difficultyDiv.style.height = `${difficultyDivMaxHeight}px`;
  qualityDiv.innerHTML = getEmptyRatingDivInnerHtml("Quality");
  difficultyDiv.innerHTML = getEmptyRatingDivInnerHtml("Difficulty");
  // instructorDiv.firstChild ? instructorDiv.replaceChild(qualityDiv, instructorDiv.firstChild) : instructorDiv.appendChild(qualityDiv);
  // unitsDiv.firstChild ? unitsDiv.replaceChild(difficultyDiv, unitsDiv.firstChild) : unitsDiv.appendChild(difficultyDiv);
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
    const dataAutomationId = mainTable.getAttribute('data-automation-id');
    const mainTableId = dataAutomationId.split('-')[1];
    const lockedTable = visibleGrid.querySelector(`[data-automation-id="LockedTable-${mainTableId}"]`);
    // if (!lockedTable) return;
    mainTableRows.forEach((mainTableRow) => {
      const rowid = mainTableRow.getAttribute('rowid');
      const lockedTableRow = lockedTable.querySelector(`tr[rowid="${rowid}"]`);
      // if (!lockedTableRow) return;
      const instructorsTd = mainTableRow.querySelector('td[headers^="columnheader6"]');
      const unitsTd = mainTableRow.querySelector('td[headers^="columnheader7"]');
      // if (!instructorsTd) return;
      const instructorDivs = instructorsTd.querySelectorAll('[data-automation-id^="selectedItem_"]');
      const unitsDiv = unitsTd.querySelector('[role="presentation"]');
      // if (instructorsTd.classList.contains("processing")) return;
      // instructorsTd.classList.add("processing");
      if (instructorsTd.hasAttribute('avg-quality') && unitsTd.hasAttribute('avg-difficulty')) {
        colorTds(lockedTableRow, mainTableRow, instructorsTd.getAttribute('avg-quality'), unitsTd.getAttribute('avg-difficulty'), instructorsTd, unitsTd);
      } else {
        let ratings = {
          totalQuality: 0,
          totalDifficulty: 0,
          validRatingsCount: 0,
          ratingPromises: []
        };
        instructorDivs.forEach((instructorDiv) => insertRatings(instructorDiv, unitsDiv, ratings));
        Promise.all(ratings.ratingPromises).then(() => {
          if (ratings.validRatingsCount !== 0) {
            let avgQuality = ratings.totalQuality / ratings.validRatingsCount;
            let avgDifficulty = ratings.totalDifficulty / ratings.validRatingsCount;
            instructorsTd.setAttribute('avg-quality', avgQuality);
            unitsTd.setAttribute('avg-difficulty', avgDifficulty);
            colorTds(lockedTableRow, mainTableRow, avgQuality, avgDifficulty, instructorsTd, unitsTd);
          }
          // instructorsTd.classList.remove("processing");
        });
      }
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
