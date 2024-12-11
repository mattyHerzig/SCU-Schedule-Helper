import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FriendCourseDetails from "../friendComponents/FriendCourseDetails";

export default function UserCourseDetails() {
  const [userCourses, setUserCourses] = useState({
    interested: [],
    taken: [],
  });
  const [transformedUserCourses, setTransformedUserCourses] = useState({
    interested: [],
    taken: [],
  });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Function to transform interested sections
    const transformInterestedSections = (interestedSections) => {
      return Object.keys(interestedSections || {})
        .map((encodedCourse) => {
          const courseMatch = encodedCourse.match(/P{(.*?)}S{(.*?)}M{(.*?)}/);
          if (!courseMatch) {
            console.error("Error parsing interested course:", encodedCourse);
            return null;
          }
          const meetingPatternMatch =
            courseMatch[3].match(/(.*) \| (.*) \| (.*)/);
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
    };

    // Function to transform taken courses
    const transformTakenCourses = (coursesTaken) => {
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
    };

    const transformedSections = transformInterestedSections(
      userCourses.interested,
    );
    const transformedCourses = transformTakenCourses(userCourses.taken);
    setTransformedUserCourses({
      interested: transformedSections,
      taken: transformedCourses,
    });
  }, [userCourses]);

  useEffect(() => {
    const fetchUserCourses = async () => {
      try {
        const { userInfo } = await chrome.storage.local.get("userInfo");

        if (userInfo) {
          userInfo.coursesTaken = userInfo.coursesTaken || [];
          userInfo.interestedSections = userInfo.interestedSections || {};
          userInfo.coursesTaken = userInfo.coursesTaken.filter(
            (course) => course,
          );
          setUserCourses({
            interested: userInfo.interestedSections,
            taken: userInfo.coursesTaken,
          });
        }
      } catch (error) {
        console.error("Error fetching user courses:", error);
      }
    };

    fetchUserCourses();
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === "local" && changes.userInfo) {
        fetchUserCourses();
      }
    });
  }, []);

  // Utility function for sorting taken courses (same as in FriendsAccordion)
  function mostRecentTermFirst(objA, objB) {
    const termA = objA.quarter || "Fall 2000";
    const termB = objB.quarter || "Fall 2000";
    const [quarterA, yearA] = termA.split(" ");
    const [quarterB, yearB] = termB.split(" ");
    if (yearA === yearB) {
      return quarterCompareDescending(quarterA, quarterB);
    } else {
      return parseInt(yearB) - parseInt(yearA);
    }
  }

  function quarterCompareDescending(quarterA, quarterB) {
    const quarters = ["Fall", "Summer", "Spring", "Winter"];
    return quarters.indexOf(quarterA) - quarters.indexOf(quarterB);
  }

  // Only render if there are courses to show
  if (
    !transformedUserCourses.interested.length &&
    !transformedUserCourses.taken.length
  ) {
    return null;
  }

  return (
    <Accordion
      expanded={isExpanded}
      onChange={() => setIsExpanded(!isExpanded)}
      sx={{
        mb: 2,
        "&:before": {
          display: "none",
        },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="user-courses-content"
        id="user-courses-header"
      >
        <Typography variant="subtitle1">My Courses</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <FriendCourseDetails courses={transformedUserCourses} />
      </AccordionDetails>
    </Accordion>
  );
}
