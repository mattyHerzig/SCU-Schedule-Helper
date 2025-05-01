import React, { useEffect, useState } from 'react';

// Enums
enum FetchStatus {
  NotFetched = 0,
  Fetching = 1,
  Fetched = 2,
}

enum Difficulty {
  VeryEasy = 0,
  Easy = 1,
  Medium = 2,
  Hard = 3,
  VeryHard = 4,
}

// Interfaces
interface Rating {
  qualityTotal: number;
  qualityCount: number;
  difficultyTotal: number;
  difficultyCount: number;
  workloadTotal: number;
  workloadCount: number;
}

interface EvalsData {
  [key: string]: {
    [key: string]: Rating;
    overall?: Rating;
  };
  departmentStatistics?: {
    [key: string]: {
      qualityAvgs: number[];
      difficultyAvgs: number[];
      workloadAvgs: number[];
    };
  };
}

interface UserInfo {
  id?: string;
  preferences?: {
    showRatings?: boolean;
    difficulty?: Difficulty;
    scoreWeighting?: {
      scuEvals?: number;
      rmp?: number;
    };
    preferredSectionTimeRange?: {
      startHour: number;
      startMinute: number;
      endHour: number;
      endMinute: number;
    };
    courseTracking?: boolean;
  };
}

interface FriendSections {
  [courseCode: string]: {
    [friendId: string]: string;
  };
}

interface Friends {
  [friendId: string]: {
    name: string;
    [key: string]: any;
  };
}

interface EnrollmentStats {
  [meetingPattern: string]: string;
}

interface RmpResponse {
  legacyId?: string;
  avgRating?: number;
  avgDifficulty?: number;
}

interface RatingInfo {
  rmpLink: string;
  rmpQuality?: number;
  rmpDifficulty?: number;
  scuEvalsQuality: number | null;
  scuEvalsDifficulty: number | null;
  scuEvalsWorkload: number | null;
  scuEvalsQualityPercentile: number | null;
  scuEvalsDifficultyPercentile: number | null;
  scuEvalsWorkloadPercentile: number | null;
  matchesTimePreference: boolean;
  meetingPattern: string | null;
  friendsTaken: string[];
  friendsInterested: string[];
}

interface TimeFormat {
  hours: number;
  minutes: number;
}

interface CourseSection {
  meetingPattern: string;
  uri: string;
}

const CourseRatings: React.FC = () => {
  // State declarations
  const [evalsData, setEvalsData] = useState<EvalsData>({});
  const [userInfo, setUserInfo] = useState<UserInfo>({});
  const [inTooltip, setInTooltip] = useState(false);
  const [inButton, setInButton] = useState(false);
  const [friendInterestedSections, setFriendInterestedSections] = useState<FriendSections>({});
  const [friendCoursesTaken, setFriendCoursesTaken] = useState<FriendSections>({});
  const [friends, setFriends] = useState<Friends>({});
  const [currentUrl, setCurrentUrl] = useState(window.location.href);
  const [enrollmentStatsStatus, setEnrollmentStatsStatus] = useState<FetchStatus>(FetchStatus.NotFetched);
  const [enrollmentStats, setEnrollmentStats] = useState<EnrollmentStats>({});
  const [prefferedDifficulty, setPrefferedDifficulty] = useState<Difficulty>(Difficulty.VeryEasy);
  const [preferredDifficultyPercentile, setPreferredDifficultyPercentile] = useState(0);

  // Patterns for parsing data
  const courseTakenPattern = /P{(.*?)}C{(.*?)}T{(.*?)}/; // P{profName}C{courseCode}T{termName}
  const interestedSectionPattern = /P{(.*?)}S{(.*?)}M{(.*?)}/; // P{profName}S{full section string}M{meetingPattern}E{expirationTimestamp}

  useEffect(() => {
    // Initialize data from Chrome storage
    chrome.storage.local.get(
      [
        "evals",
        "userInfo",
        "friendInterestedSections",
        "friendCoursesTaken",
        "friends",
      ],
      (data: any) => {
        const userInfoData = data.userInfo || {};
        setUserInfo(userInfoData);
        
        if (userInfoData.preferences && userInfoData.preferences.difficulty) {
          const diffValue = userInfoData.preferences.difficulty;
          setPrefferedDifficulty(diffValue);
          setPreferredDifficultyPercentile(diffValue / 4);
        }
        
        // Return early if ratings should not be shown
        if (
          userInfoData.preferences &&
          userInfoData.preferences.showRatings !== undefined &&
          !userInfoData.preferences.showRatings
        ) {
          return;
        }
        
        setEvalsData(data.evals || {});
        setFriendInterestedSections(data.friendInterestedSections || {});
        setFriendCoursesTaken(data.friendCoursesTaken || {});
        setFriends(data.friends || {});

        checkPage();
        const observer = new MutationObserver(checkPage);
        observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
        });

        return () => {
          observer.disconnect();
        };
      }
    );
  }, []);

  const checkPage = async () => {
    if (currentUrl !== window.location.href) {
      setCurrentUrl(window.location.href);
      setEnrollmentStatsStatus(FetchStatus.NotFetched);
      setEnrollmentStats({});
      setInTooltip(false);
      setInButton(false);
    }
    
    const pageTitle = document.querySelector(
      '[data-automation-id="pageHeaderTitleText"]'
    );
    const isSavedSchedulePage =
      pageTitle?.textContent === "View Student Registration Saved Schedule";
      
    const isFindCoursesPage = document.querySelector(
      '[data-automation-label="SCU Find Course Sections"]'
    );
    
    if (isFindCoursesPage) {
      await handleFindSectionsGrid();
    } else if (isSavedSchedulePage) {
      if (enrollmentStatsStatus === FetchStatus.NotFetched) {
        setEnrollmentStatsStatus(FetchStatus.Fetching);
        await findEnrollmentStatistics();
        setEnrollmentStatsStatus(FetchStatus.Fetched);
        await handleSavedSchedulePageGrid();
      }
      if (enrollmentStatsStatus === FetchStatus.Fetched) {
        await handleSavedSchedulePageGrid();
      }
    }
  };

  const handleFindSectionsGrid = async () => {
    const courseSectionRows = document.querySelectorAll("table tbody tr");

    for (let i = 0; i < courseSectionRows.length; i++) {
      const row = courseSectionRows[i] as HTMLTableRowElement;
      row.style.height = "162px";
      const courseSectionCell = row.cells[0];
      let courseText = courseSectionCell.textContent?.trim() || "";
      if (courseText === "") continue;
      if (courseSectionCell.hasAttribute("has-ratings")) continue;
      courseSectionCell.setAttribute("has-ratings", "true");
      const instructorCell = row.cells[6];
      let professorName = (instructorCell.textContent?.trim().split("\n")[0] || "");
      const pushDown = document.createElement("div");
      pushDown.style.height = "100px";
      courseSectionCell.appendChild(pushDown);
      await displayProfessorDifficulty(
        courseSectionCell,
        row,
        professorName,
        false
      );
      courseSectionCell.removeChild(pushDown);
    }
  };

  const handleSavedSchedulePageGrid = async () => {
    const courses = document.querySelectorAll('[data-testid="table"] tbody tr');
    const displayPromises: Promise<void>[] = [];
    for (let i = 0; i < courses.length; i++) {
      const courseRow = courses[i] as HTMLTableRowElement;
      const courseCell = courseRow.cells[0];
      let courseText = courseCell.textContent?.trim() || "";
      if (courseText === "" || courseRow.cells.length < 10) continue;
      if (courseCell.hasAttribute("has-ratings")) continue;
      courseCell.setAttribute("has-ratings", "true");
      const instructorCell = courseRow.cells[6];
      let professorName = (instructorCell.textContent?.trim().split("\n")[0] || "");
      const pushDown = document.createElement("div");
      pushDown.style.height = "100px";

      courseCell.appendChild(pushDown);
      const displayPromise = new Promise<void>((resolve) => {
        displayProfessorDifficulty(
          courseCell,
          courseRow,
          professorName,
          true
        ).then(() => {
          courseCell.removeChild(pushDown);
          resolve();
        });
      });
      displayPromises.push(displayPromise);
    }
    await Promise.all(displayPromises);
  };

  const displayProfessorDifficulty = async (
    courseSectionCell: HTMLTableCellElement,
    mainSectionRow: HTMLTableRowElement,
    professorName: string,
    isSavedSchedulePage: boolean
  ) => {
    const difficultyContainer = document.createElement("div");
    difficultyContainer.style.fontSize = "1em";
    difficultyContainer.style.color = "gray";
    difficultyContainer.style.marginTop = "5px";

    const rmpResponse = await chrome.runtime.sendMessage({
      type: "getRmpRatings",
      profName: professorName,
    }) as RmpResponse;
    
    let scuEvalsQuality: number | null = null;
    let scuEvalsDifficulty: number | null = null;
    let scuEvalsWorkload: number | null = null;
    let rmpLink = `https://www.ratemyprofessors.com/search/professors?q=${getProfName(
      professorName,
      true
    )}`;
    if (rmpResponse && rmpResponse.legacyId)
      rmpLink = `https://www.ratemyprofessors.com/professor/${rmpResponse.legacyId}`;

    let prof = getProfName(professorName);
    let courseText = courseSectionCell.textContent?.trim() || "";

    const courseCode = courseText
      .substring(0, courseText.indexOf("-"))
      .replace(/\s/g, "");
    const department = courseText.substring(0, courseText.indexOf(" "));
    
    const evalResults = { scuEvalsQuality: null as number | null, scuEvalsDifficulty: null as number | null, scuEvalsWorkload: null as number | null };

    if (evalsData[prof]?.[courseCode]) {
      const results = getScuEvalsAvgMetric(evalsData[prof][courseCode]);
      if (results) {
        evalResults.scuEvalsQuality = results.scuEvalsQuality;
        evalResults.scuEvalsDifficulty = results.scuEvalsDifficulty;
        evalResults.scuEvalsWorkload = results.scuEvalsWorkload;
      }
    } else if (evalsData[prof]?.[department]) {
      const results = getScuEvalsAvgMetric(evalsData[prof][department]);
      if (results) {
        evalResults.scuEvalsQuality = results.scuEvalsQuality;
        evalResults.scuEvalsDifficulty = results.scuEvalsDifficulty;
        evalResults.scuEvalsWorkload = results.scuEvalsWorkload;
      }
    } else if (evalsData[prof]?.overall) {
      const results = getScuEvalsAvgMetric(evalsData[prof].overall);
      if (results) {
        evalResults.scuEvalsQuality = results.scuEvalsQuality;
        evalResults.scuEvalsDifficulty = results.scuEvalsDifficulty;
        evalResults.scuEvalsWorkload = results.scuEvalsWorkload;
      }
    } else if (evalsData[courseCode]) {
      const results = getScuEvalsAvgMetric(evalsData[courseCode] as any);
      if (results) {
        evalResults.scuEvalsQuality = results.scuEvalsQuality;
        evalResults.scuEvalsDifficulty = results.scuEvalsDifficulty;
        evalResults.scuEvalsWorkload = results.scuEvalsWorkload;
      }
    }

    scuEvalsQuality = evalResults.scuEvalsQuality;
    scuEvalsDifficulty = evalResults.scuEvalsDifficulty;
    scuEvalsWorkload = evalResults.scuEvalsWorkload;

    // Decide which cell to get meeting pattern from
    let meetingPattern: string | null = null;
    if (isSavedSchedulePage) {
      meetingPattern = mainSectionRow.cells[9].textContent?.trim() || null;
    } else {
      meetingPattern = mainSectionRow.cells[8].textContent?.trim() || null;
    }

    const timeMatch = meetingPattern?.match(
      /\d{1,2}:\d{2} [AP]M - \d{1,2}:\d{2} [AP]M/
    );
    let timeWithinPreference = false;
    if (timeMatch) {
      const meetingTime = timeMatch[0];
      if (isTimeWithinPreference(meetingTime)) {
        timeWithinPreference = true;
      }
    }

    const friendsTaken: string[] = [];
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

    const friendsInterested: string[] = [];
    for (const friend in friendInterestedSections[courseCode]) {
      if (friendInterestedSections[courseCode][friend].includes(prof)) {
        const match = friendInterestedSections[courseCode][friend].match(
          interestedSectionPattern
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
    let scuEvalsDifficultyPercentile = getPercentile(
      scuEvalsDifficulty,
      difficultyAvgs
    );
    if (scuEvalsDifficulty && !scuEvalsDifficultyPercentile) {
      scuEvalsDifficultyPercentile = (scuEvalsDifficulty - 1) / 4;
    }
    let scuEvalsWorkloadPercentile = getPercentile(
      scuEvalsWorkload,
      workloadAvgs
    );
    if (scuEvalsWorkload && !scuEvalsWorkloadPercentile) {
      scuEvalsWorkloadPercentile = scuEvalsWorkload / 15.0;
    }

    await appendRatingInfoToCell(courseSectionCell, isSavedSchedulePage, {
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
      meetingPattern,
      friendsTaken,
      friendsInterested,
    });
  };

  const getScuEvalsAvgMetric = (rating: Rating | undefined) => {
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
  };

  const calcOverallScore = (scores: RatingInfo): number | null => {
    let { scuEvals = 50, rmp = 50 } = userInfo?.preferences?.scoreWeighting || {};
    let {
      rmpQuality,
      rmpDifficulty,
      scuEvalsQualityPercentile,
      scuEvalsDifficultyPercentile,
      scuEvalsWorkloadPercentile,
    } = scores;
    
    // Check if we have any valid data
    if (
      (!rmpQuality && rmpQuality !== 0) &&
      (!rmpDifficulty && rmpDifficulty !== 0) &&
      !scuEvalsQualityPercentile &&
      !scuEvalsDifficultyPercentile &&
      !scuEvalsWorkloadPercentile
    )
      return null;

    // If RMP data is missing but we have SCU evals data
    if ((rmpQuality === undefined || rmpDifficulty === undefined) && 
        (scuEvalsQualityPercentile !== null && 
         scuEvalsDifficultyPercentile !== null && 
         scuEvalsWorkloadPercentile !== null)) {
      
      return scuEvalsScore(
        scuEvalsQualityPercentile,
        scuEvalsDifficultyPercentile,
        scuEvalsWorkloadPercentile
      );
    }
    
    // If SCU evals data is missing but we have RMP data
    if ((scuEvalsQualityPercentile === null || 
         scuEvalsDifficultyPercentile === null || 
         scuEvalsWorkloadPercentile === null) &&
        (rmpQuality !== undefined && rmpDifficulty !== undefined)) {
      
      return rmpScore(rmpQuality, rmpDifficulty);
    }
    
    // If we have both types of data
    if (scuEvalsQualityPercentile !== null && 
        scuEvalsDifficultyPercentile !== null && 
        scuEvalsWorkloadPercentile !== null &&
        rmpQuality !== undefined && 
        rmpDifficulty !== undefined) {
      
      return (
        scuEvalsScore(
          scuEvalsQualityPercentile,
          scuEvalsDifficultyPercentile,
          scuEvalsWorkloadPercentile
        ) * (scuEvals / 100) +
        rmpScore(rmpQuality, rmpDifficulty) * (rmp / 100)
      );
    }
    
    // Default fallback case
    return null;
  };

  const scuEvalsScore = (
    qualityPercentile: number | null,
    difficultyPercentile: number | null,
    workloadPercentile: number | null
  ): number => {
    // If any value is null, return default score of 0
    if (qualityPercentile === null || difficultyPercentile === null || workloadPercentile === null) {
      return 0;
    }
    
    const qualityScore = qualityPercentile * 100;
    const difficultyScore =
      100 - Math.abs(preferredDifficultyPercentile - difficultyPercentile) * 100;
    const workloadScore =
      100 - Math.abs(preferredDifficultyPercentile - workloadPercentile) * 100;
    return ((qualityScore + difficultyScore + workloadScore) / 300) * 10;
  };

  const rmpScore = (quality: number | undefined, difficulty: number | undefined): number => {
    // If any value is undefined, return default score of 0
    if (quality === undefined || difficulty === undefined) {
      return 0;
    }
    
    // Ranges go from 1 to 5, so we normalize them to 0 to 4.
    quality -= 1;
    difficulty -= 1;
    // Percentiles would be better, but we don't have that data.
    const difficultyScore = 4 - Math.abs(prefferedDifficulty - difficulty);
    return ((quality + difficultyScore) / 8) * 10;
  };

  const appendRatingInfoToCell = async (
    tdElement: HTMLTableCellElement,
    isSavedSchedulePage: boolean,
    ratingInfo: RatingInfo
  ) => {
    const overallScore = calcOverallScore(ratingInfo);
    const scoreContainer = document.createElement("div");
    scoreContainer.style.display = "flex";
    scoreContainer.style.alignItems = "center";
    scoreContainer.style.gap = "4px";

    // Create score text
    const scoreText = document.createElement("div");
    scoreText.innerHTML = `
      <span style="font-size: 24px; font-weight: bold; color: ${getRatingColor(
        overallScore !== null ? overallScore : undefined,
        0,
        10,
        true
      )}; ">${overallScore?.toFixed(2) || "N/A"}</span>
      <span style="color: #6c757d; font-size: 16px;">/ 10</span>
    `;

    // Create info button with tooltip
    const infoButton = document.createElement("div");
    infoButton.innerHTML = `<img src="${chrome.runtime.getURL(
      "images/info_icon.png"
    )}" alt ="info" width="17" height="17"/>`;
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

    infoButton.addEventListener("mouseenter", () => {
      setInButton(true);
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
      setInButton(false);
      if (inTooltip) return;
      tooltip.style.display = "none";

      // Remove tooltip from the body
      if (tooltip.parentElement) {
        document.body.removeChild(tooltip);
      }
    });

    tooltip.addEventListener("mouseenter", () => {
      setInTooltip(true);
      tooltip.style.display = "block"; // Ensure it's visible
    });

    tooltip.addEventListener("mouseleave", () => {
      setInTooltip(false);
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
          <span style="margin-right: 4px; font-weight:bold">${
            (ratingInfo.matchesTimePreference && "✓") || "X"
          }</span> Section Time
        </div>
      </div>`;
      
    const friendsTaken = document.createElement("div");
    friendsTaken.innerHTML = `
      <div style="display: flex; gap: 20px; margin: 5px 0  5px 0;">
        <div style="color: #666;">
          <span style="margin-right: 4px; font-weight:bold">${
            ratingInfo.friendsTaken.length
          }</span> ${
      (ratingInfo.friendsTaken.length === 1 && "Friend") || "Friends"
    } Took
        </div>
      </div>
    `;
    
    const friendsTakenTooltip = createFriendsToolTip(ratingInfo.friendsTaken);
    friendsTaken.addEventListener("mouseenter", () => {
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
          <span style="margin-right: 4px; font-weight:bold">${
            ratingInfo.friendsInterested.length
          }</span> ${
      (ratingInfo.friendsInterested.length === 1 && "Friend") || "Friends"
    } Interested
        </div>
      </div>
    `;

    const friendsInterestedTooltip = createFriendsToolTip(
      ratingInfo.friendsInterested
    );
    friendsInterested.addEventListener("mouseenter", () => {
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
    
    if (isSavedSchedulePage) {
      const meetingPattern = tdElement.parentElement?.lastChild?.textContent;
      const enrollmentStat = meetingPattern && enrollmentStats[meetingPattern];
      const enrollmentStatsDiv = document.createElement("div");
      enrollmentStatsDiv.innerHTML = `
        <div style="display: flex; gap: 20px; margin: 5px 0  5px 0;">
          <div style="color: #666;">
            <span style="margin-right: 4px; font-weight:bold">Seats Left: </span> ${
              enrollmentStat || "N/A"
            }
          </div>
        </div>
      `;
      tdElement.appendChild(enrollmentStatsDiv);
    }
  };

  const createRatingToolTip = (ratingInfo: RatingInfo) => {
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
      rmpDifficulty !== undefined ? Math.abs(prefferedDifficulty - rmpDifficulty + 1) : undefined,
      0,
      4,
      false
    );
    const scuEvalsQualityScore = scuEvalsQualityPercentile !== null
      ? scuEvalsQualityPercentile * 100
      : undefined;
    const scuEvalsQualityColor = getRatingColor(
      scuEvalsQualityScore,
      0,
      100,
      true
    );
    const scuEvalsDifficultyScore = scuEvalsDifficultyPercentile !== null
      ? Math.abs(preferredDifficultyPercentile - scuEvalsDifficultyPercentile) *
        100
      : undefined;
    const scuEvalsDifficultyColor = getRatingColor(
      scuEvalsDifficultyScore,
      0,
      100,
      false
    );
    const scuEvalsWorkloadScore = scuEvalsWorkloadPercentile !== null
      ? Math.abs(preferredDifficultyPercentile - scuEvalsWorkloadPercentile) * 100
      : undefined;
    const scuEvalsWorkloadColor = getRatingColor(
      scuEvalsWorkloadScore,
      0,
      100,
      false
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
              <span style="color: ${getRatingColor(
                rmpQuality,
                1,
                5,
                true
              )}; font-size: 16px; font-weight: bold;">${
    rmpQuality?.toFixed(2) || "N/A"
  }</span>
              <span style="color: #666;"> / 5</span>
              <div style="color: #666; font-size: 12px;">quality</div>
            </div>
            <div>
              <span style="color: ${rmpDifficultyColor};font-size: 16px; font-weight: bold;">${
    rmpDifficulty?.toFixed(2) || "N/A"
  }</span>
              <span style="color: #666;"> / 5</span>
              <div style="color: #666; font-size: 12px;">difficulty</div>
            </div>
          </div>
    
          <div style="font-size: 13px; margin: 12px 0 8px 0;">
            SCU Course Evaluations
          </div>
          
          <div style="display: flex; gap: 20px; margin: 8px 0;">
          ${
            (!userInfo.id &&
              `<div style="white-space: normal; width: 180px;">You must be signed in to view SCU evals data. Sign-in with the extension popup. </div>`) ||
            `
            <div>
              <span style="color: ${scuEvalsQualityColor}; font-size: 16px; font-weight: bold;">${
              scuEvalsQuality?.toFixed(2) || "N/A"
            }</span>
              <span style="color: #666;"> / 5</span>
              <div style="color: #666; font-size: 12px;">quality</div>
            </div>
            <div>
              <span style="color: ${scuEvalsDifficultyColor}; font-size: 16px; font-weight: bold;">${
              scuEvalsDifficulty?.toFixed(2) || "N/A"
            }</span>
              <span style="color: #666;"> / 5</span>
              <div style="color: #666; font-size: 12px;">difficulty</div>
            </div>
            <div>
              <span style="color: ${scuEvalsWorkloadColor}; font-size: 16px; font-weight: bold;">${
              scuEvalsWorkload?.toFixed(2) || "N/A"
            }</span>
              <div style="color: #666; font-size: 12px;">hrs / wk</div>
            </div>
            `
          }
          </div>
        </div>
      </div>
    `;

    return ratingDiv;
  };

  const createFriendsToolTip = (friendsTakenOrInterested: string[]) => {
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
  };

  const getProfName = (profName: string, usePreferred = false) => {
    if (profName.includes("|")) {
      return profName.split("|")[+usePreferred].trim();
    }
    return profName;
  };

  const getRatingColor = (rating: number | undefined, ratingMin: number, ratingMax: number, goodValuesAreHigher: boolean) => {
    if (nullOrUndefined(rating)) return "rgba(0, 0, 0, 0.5)";
    
    // At this point, TypeScript doesn't know that rating is defined
    // Use a local variable to track the valid rating value
    let validRating = rating as number;
    
    if (validRating < ratingMin) validRating = ratingMin;
    if (validRating > ratingMax) validRating = ratingMax;
    
    const greenShade = [66, 134, 67];
    const yellowShade = [255, 165, 0];
    const redShade = [194, 59, 34];
    const ratingMid = ratingMin + (ratingMax - ratingMin) / 2;
    
    if (validRating <= ratingMid && goodValuesAreHigher) {
      return interpolateColor(
        redShade,
        yellowShade,
        (validRating - ratingMin) / (ratingMid - ratingMin)
      );
    }
    if (validRating <= ratingMid && !goodValuesAreHigher) {
      return interpolateColor(
        greenShade,
        yellowShade,
        (validRating - ratingMin) / (ratingMid - ratingMin)
      );
    }
    if (goodValuesAreHigher) {
      return interpolateColor(
        yellowShade,
        greenShade,
        (validRating - ratingMid) / (ratingMax - ratingMid)
      );
    }
    return interpolateColor(
      yellowShade,
      redShade,
      (validRating - ratingMid) / (ratingMax - ratingMid)
    );
  };

  const interpolateColor = (color1: number[], color2: number[], ratio: number) => {
    const r = Math.round(color1[0] + ratio * (color2[0] - color1[0]));
    const g = Math.round(color1[1] + ratio * (color2[1] - color1[1]));
    const b = Math.round(color1[2] + ratio * (color2[2] - color1[2]));
    return `rgba(${r}, ${g}, ${b}, 1)`;
  };

  const isTimeWithinPreference = (meetingTime: string) => {
    if (!meetingTime || !userInfo?.preferences?.preferredSectionTimeRange) return false;

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
  };

  const parseTime = (timeString: string): TimeFormat => {
    const [time, period] = timeString.trim().split(/\s+/);
    let [hours, minutes] = time.split(":").map(Number);

    if (period.toUpperCase() === "PM" && hours !== 12) hours += 12;
    if (period.toUpperCase() === "AM" && hours === 12) hours = 0;

    return { hours, minutes };
  };

  const getPercentile = (value: number | null, array: number[] | undefined) => {
    if (!value || !array || array.length === 0) return null;
    return bsFind(array, value) / array.length;
  };

  const bsFind = (sortedArray: number[], target: number) => {
    let left = 0;
    let right = sortedArray.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (sortedArray[mid] === target) return mid;
      if (sortedArray[mid] < target) left = mid + 1;
      else right = mid - 1;
    }
    return left;
  };

  const findEnrollmentStatistics = async () => {
    const currentUrl = window.location.href;
    if (!currentUrl.includes("scu/d/inst")) {
      console.error("Page URL did not include /d/ :", currentUrl);
      return;
    }
    const apiUrl = currentUrl.replace(/scu\/d\/inst/, "scu/inst");

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        console.error("Failed to fetch course data:", response);
        return;
      }
      const data = await response.json();
      const coursesData = data?.body?.children?.[6]?.rows;
      let courseSections: CourseSection[] = [];

      for (const row of coursesData) {
        const courseSectionData = row.cellsMap?.["162.1"];
        const sectionMeetingPattern =
          row.cellsMap?.["162.7"]?.instances?.[0]?.text;

        if (courseSectionData) {
          if (courseSectionData.selfUriTemplate) {
            courseSections.push({
              meetingPattern: sectionMeetingPattern,
              uri: courseSectionData.selfUriTemplate,
            });
          }
        }
      }

      // Create and wait for all enrollment fetch promises concurrently.
      await Promise.all(
        courseSections.map(async (courseSection) => {
          const sectionUrl = `${courseSection.uri}.htmld`;
          const meetingPattern = courseSection.meetingPattern;

          try {
            const sectionResponse = await fetch(sectionUrl);
            if (!sectionResponse.ok) {
              console.error(
                "Failed to fetch section data:",
                sectionResponse.statusText
              );
              return;
            }

            const sectionData = await sectionResponse.json();
            let enrolledStats = findObjectByPropertyValue(
              sectionData,
              "label",
              "Seats Available"
            )?.value;

            if (enrolledStats) {
              if (enrolledStats.match(/\d+ of \d+/)){
                let [enrolled, total] = enrolledStats.split(" of ");
                if(parseInt(enrolled) < 0) enrolled = "0";
                enrolledStats = `${enrolled}/${total}`;
              }
              const updatedStats = {...enrollmentStats};
              updatedStats[meetingPattern] = enrolledStats;
              setEnrollmentStats(updatedStats);
            }
          } catch (error) {
            console.error("Error fetching section data:", error);
          }
        })
      );
    } catch (error) {
      console.error("Error fetching course data:", error);
    }
  };

  const findObjectByPropertyValue = (obj: any, key: string, value: any): any => {
    if (typeof obj !== "object" || obj === null) {
      return null;
    }

    if (obj[key] === value) {
      return obj;
    }

    if (Array.isArray(obj)) {
      for (const item of obj) {
        const result = findObjectByPropertyValue(item, key, value);
        if (result) {
          return result;
        }
      }
    } else {
      for (const prop in obj) {
        if (typeof obj[prop] === "object") {
          const result = findObjectByPropertyValue(obj[prop], key, value);
          if (result) {
            return result;
          }
        }
      }
    }

    return null;
  };

  const nullOrUndefined = (object: any): boolean => {
    return object === null || object === undefined || isNaN(object);
  };

  // Component doesn't render anything visible
  return null;
};

export default CourseRatings;