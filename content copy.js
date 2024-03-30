// TODO:
// Make it look good e.g. color choice, RMP logo, etc.
// Popup, etc. other stuff whatever
// Handle errors at top of extensions list

// Select highlight issue

// TODO: better organize code eg comments, parent wrapper folder eg for crx, pem? Need to reconfigure VS Code, npm?

// List of future optimizations that I shouldn't worry about right now e.g.
// O(n^2) -> O(n) by matching rowid's at same time rather than separate O (n^2) of matching lockedTableRow and mainTableRow 
    // (also with lockedTable and mainTable?) (see Mar 25 screenshot for copilot suggestion) (or at least don't implement until I decide if I'm going to highlight entire row or what)
    // Can use map or two pointer approach for O(1) space complexity
// Can use map to keep track of if I've already gotten a prof's RMP (assuming we don't switch to class-specific)

// import { getRmpRatings } from './scripts/fetchRMP.js';

const tempRatingDiv = document.createElement('div');
tempRatingDiv.innerHTML = `<a target="_blank" style="color: #005dba; text-decoration: none;">Score: 🔍</a>`;
const ratingDivMaxHeight = tempRatingDiv.offsetHeight;

function modifyScuFindCourseSectionsGrid(visibleGrid) {
    const mainTables = visibleGrid.querySelectorAll('[data-automation-id^="MainTable-"]');
    mainTables.forEach(mainTable => {
        if (mainTable.classList.contains('modified'))
            return;
        const mainTableRows = mainTable.querySelectorAll('.WLWG tr:not([data-automation-id="ghostRow"])'); 
        const dataAutomationId = mainTable.getAttribute('data-automation-id');
        const mainTableId = dataAutomationId.split('-')[1];
        const lockedTable = visibleGrid.querySelector(`[data-automation-id="LockedTable-${mainTableId}"]`);
        if (!lockedTable)
            return;
        mainTable.classList.add('modified');
        mainTableRows.forEach(mainTableRow => {
            const rowid = mainTableRow.getAttribute('rowid');
            const instructorsTd = mainTableRow.querySelector('td[headers^="columnheader6"]');
            if (!instructorsTd)
                return;
            const instructorsDiv = instructorsTd.querySelector('.WPOR');
            if (!instructorsDiv) 
                return;
            const instructorDivs = instructorsDiv.querySelectorAll('.WOFP.WHEP');
            let totalScore = 0;
            let validRatingsCount = 0;
            let ratingPromises = [];
            instructorDivs.forEach(instructorDiv => {
                const instructorName = instructorDiv.textContent
                const ratingDiv = document.createElement('div');
                ratingDiv.style.height = `${ratingDivMaxHeight}px`;
                ratingDiv.innerHTML = `<a target="_blank" style="color: #005dba; text-decoration: none;">Score: </a>`;
                instructorDiv.appendChild(ratingDiv);
                let promise = getRmpRatings(instructorName).then(rating => {
                    validRating = true;
                    let score = 0;
                    if (rating === null) {
                        validRating = false;
                    } else {
                        score = rating["avgRating"];
                        if (score === 0) {
                            validRating = false;
                        }
                    }
                    if (validRating) {
                        totalScore += score;
                        validRatingsCount++;
                        url = `https://www.ratemyprofessors.com/professor/${rating["legacyId"]}`;   
                        // ratingDiv.innerHTML = `<a href="${url}" target="_blank" style="color: #005dba; text-decoration: none;" class="fade-in">Score: <span>${score.toFixed(1)}/5.0</span></a>`; 
                        ratingDiv.innerHTML = `<a href="${url}" target="_blank" style="color: #005dba; text-decoration: none;">Score: ${score.toFixed(1)}/5.0</a>`; 
                    } else {
                        const index = instructorName.includes("|")
                            ? instructorName.lastIndexOf("|") - 1
                            : instructorName.length;
                        const firstInstructorName = instructorName.substring(0, index);
                        url = `https://www.ratemyprofessors.com/search/professors?q=${firstInstructorName}`;
                        // ratingDiv.innerHTML = `<a href="${url}" target="_blank" style="color: #005dba; text-decoration: none;" class="fade-in">Score: <span>🔍</span></a>`;
                        ratingDiv.innerHTML = `<a href="${url}" target="_blank" style="color: #005dba; text-decoration: none;">Score: 🔍</a>`;
                    }
                });
                ratingPromises.push(promise);
            });
            Promise.all(ratingPromises).then(() => {
                if (validRatingsCount === 0)
                    return;
                const averageScore = totalScore / validRatingsCount;
                const red = Math.floor(255 * (5 - averageScore) / 4);
                const green = Math.floor(255 * (averageScore - 1) / 4);
                const color = `rgba(${red}, ${green}, 0, 0.5)`;
                mainTableRow.querySelectorAll('td').forEach(cell => {
                    cell.style.transition = 'background-color 0.5s ease';
                    cell.style.backgroundColor = color;
                });
                const lockedTableRow = lockedTable.querySelector(`tr[rowid="${rowid}"]`);
                if (!lockedTableRow)
                    return;
                lockedTableRow.querySelectorAll('td').forEach(cell => {
                    cell.style.transition = 'background-color 0.5s ease';
                    cell.style.backgroundColor = color;
                });
            });
        });
    });
}

function checkForScuFindCourseSectionsGrid() {
    const loadingPanel = document.querySelector('[data-automation-loadingpanelhidden]');
    const isLoading = loadingPanel ? loadingPanel.getAttribute('data-automation-loadingpanelhidden') === 'false' : false;
    if (isLoading)
        return;
    const scuFindCourseSections = document.querySelector('div[title="SCU Find Course Sections"]')
    if (!scuFindCourseSections)
        return;
    const visibleGrid = document.querySelector('.WMNO');
    if (!visibleGrid)
        return;
    modifyScuFindCourseSectionsGrid(visibleGrid);
}

const observer = new MutationObserver(checkForScuFindCourseSectionsGrid);
observer.observe(document.documentElement, { childList: true, subtree: true });
checkForScuFindCourseSectionsGrid(); // Initial check in case the page is already loaded


