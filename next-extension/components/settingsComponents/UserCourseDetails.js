import React, { useState, useEffect } from "react";
import {
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CourseDetailsCard from "../utils/CourseDetailsCard";
import {
  mostRecentTermFirst,
  transformInterestedSections,
  transformTakenCourses,
} from "../utils/user";

export default function UserCourseDetails() {
  const [userCourses, setUserCourses] = useState({
    interested: [],
    taken: [],
  });
  const [transformedUserCourses, setTransformedUserCourses] = useState({
    interested: [],
    taken: [],
  });

  useEffect(() => {
    // Function to transform interested sections
    const transformedSections = transformInterestedSections(
      userCourses.interested,
    );
    const transformedCourses = transformTakenCourses(userCourses.taken).sort(
      mostRecentTermFirst,
    );
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

  return (
    <Accordion
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
        <CourseDetailsCard courses={transformedUserCourses} />
      </AccordionDetails>
    </Accordion>
  );
}
