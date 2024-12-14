/**
 * 
 * @param {*} interestedSections An object of interested sections from the userInfo object in Chrome storage.
 * @returns A transformed array of interested sections, that can be used for the interested courses accordion.
 */
export function transformInterestedSections(interestedSections) {
  return Object.keys(interestedSections || {})
    .map((encodedCourse) => {
      const courseMatch = encodedCourse.match(/P{(.*?)}S{(.*?)}M{(.*?)}/);
      if (!courseMatch) {
        console.error("Error parsing interested course:", encodedCourse);
        return null;
      }
      const meetingPatternMatch = courseMatch[3].match(/(.*) \| (.*) \| (.*)/);
      const meetingPattern = `${meetingPatternMatch[1]} at ${meetingPatternMatch[2]
        .replaceAll(" ", "")
        .replaceAll(":00", "")
        .toLowerCase()}`;

      const indexOfDash = courseMatch[2].indexOf("-");
      let indexOfEnd = courseMatch[2].indexOf("(-)");
      if (indexOfEnd === -1) indexOfEnd = courseMatch[2].length;

      const courseCode = courseMatch[2]
        .substring(0, indexOfDash)
        .replace(" ", "");
      const professor = courseMatch[1];
      const courseName = courseMatch[2]
        .substring(indexOfDash + 1, indexOfEnd)
        .trim();

      return courseMatch
        ? {
            courseCode,
            courseName,
            professor,
            meetingPattern,
          }
        : null;
    })
    .filter(Boolean);
}

/**
 * 
 * @param {*} coursesTaken A courses taken array from the userInfo object in Chrome storage.
 * @returns A transformed array of courses taken, that can be used for the courses taken accordion.
 */
export function transformTakenCourses(coursesTaken) {
  return coursesTaken
    .map((encodedCourse) => {
      const courseMatch = encodedCourse.match(/P{(.*?)}C{(.*?)}T{(.*?)}/);
      if (!courseMatch) return null;

      const firstDash = courseMatch[2].indexOf("-");
      let secondDash = courseMatch[2].indexOf("-", firstDash + 1);
      if (secondDash === -1 || secondDash - firstDash > 5) {
        secondDash = firstDash;
      }

      let indexOfEnd = courseMatch[2].indexOf("(-)");
      if (courseMatch[2].indexOf("((-))") !== -1)
        indexOfEnd = courseMatch[2].indexOf("((-))");
      if (indexOfEnd === -1) indexOfEnd = courseMatch[2].length;

      const courseCode = courseMatch[2]
        .substring(0, firstDash)
        .replace(" ", "");
      const professor = courseMatch[1] || "unknown";
      const courseName = courseMatch[2]
        .substring(secondDash + 1, indexOfEnd)
        .trim();
      return courseMatch
        ? {
            courseCode,
            courseName,
            professor,
            quarter: courseMatch[3],
          }
        : null;
    })
    .filter(Boolean)
    .sort(mostRecentTermFirst);
}

/**
 * Comparator function to sort courses by the most recent term first.
 */
export function mostRecentTermFirst(objA, objB) {
  let termA = objA.quarter || "Fall 2000";
  let termB = objB.quarter || "Fall 2000";
  if (termA === "Not taken at SCU") termA = "Fall 2000";
  if (termB === "Not taken at SCU") termB = "Fall 2000";
  const [quarterA, yearA] = termA.split(" ");
  const [quarterB, yearB] = termB.split(" ");
  if (termA === termB) {
    return objA.courseCode.localeCompare(objB.courseCode);
  } else if (yearA === yearB) {
    return quarterCompareDescending(quarterA, quarterB);
  } else {
    return parseInt(yearB) - parseInt(yearA);
  }
}

function quarterCompareDescending(quarterA, quarterB) {
  const quarters = ["Fall", "Summer", "Spring", "Winter"];
  return quarters.indexOf(quarterA) - quarters.indexOf(quarterB);
}
