import React, { useState, useEffect, useMemo } from "react";
import {
  Typography,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Stack,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Autocomplete,
  TextField,
  Snackbar,
  Alert,
} from "@mui/material";
import { ExpandMore, Close } from "@mui/icons-material";
import {
  mostRecentTermFirst,
  parseInterestedSections,
  parseTakenCourses,
} from "../utils/user.js";

export default function CourseAccordion() {
  const [userCourses, setUserCourses] = useState({
    interested: [],
    taken: [],
  });
  const [evalsData, setEvalsData] = useState(null);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [courseToRemove, setCourseToRemove] = useState(null);
  const [courseRemoveType, setCourseRemoveType] = useState(null);
  const [showActionCompletedMessage, setShowActionCompletedMessage] =
    useState(false);
  const [message, setMessage] = useState("");
  const [messageSeverity, setMessageSeverity] = useState("success");

  useEffect(() => {
    async function fetchData () {
      try {
        const { userInfo } = await chrome.storage.local.get("userInfo");
        const { evals } = await chrome.storage.local.get("evals");

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

        if (evals) {
          setEvalsData(evals);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  const transformedCourses = {
    interested: parseInterestedSections(userCourses.interested),
    taken: parseTakenCourses(userCourses.taken).sort(mostRecentTermFirst),
  };

  function handleRemoveCourseClick (event, course) {
    event.stopPropagation();
    setCourseToRemove(course);
    setOpenConfirmDialog(true);
  };

  async function handleConfirmRemoveCourse () {
    if (courseToRemove) {
      try {
        const courseIdentifier = `P{${courseToRemove.professor}}C{${courseToRemove.courseCode}}T{${courseToRemove.quarter}}`;

        const messagePayload = {
          type: "updateUser",
          updateItems: {
            coursesTaken: {
              remove: [courseIdentifier],
            },
          },
        };

        const updateResponse = await chrome.runtime.sendMessage(messagePayload);

        if (updateResponse && !updateResponse.ok) {
          handleActionCompleted(updateResponse.message, "error");
        } else {
          setUserCourses((prevState) => {
            const updatedTakenCourses = prevState.taken.filter(
              (course) =>
                `P{${course.professor}}C{${course.courseCode}}T{${course.quarter}}` !==
                courseIdentifier,
            );
            return {
              ...prevState,
              taken: updatedTakenCourses,
            };
          });

          setMessage("Course successfully removed!");
          setMessageSeverity("success");
        }

        setOpenConfirmDialog(false);
        setCourseToRemove(null);
      } catch (error) {
        console.error("Error removing course:", error);
        setMessage("An error occurred while removing the course.");
        setMessageSeverity("error");
      }
    }
  };

  function handleCancelRemoveCourse () {
    setOpenConfirmDialog(false);
    setCourseToRemove(null);
    setCourseRemoveType(null);
  };

  const handleAddCourse = async (
    courseType,
    selectedCourse,
    selectedProfessor,
    quarter,
  ) => {
    if (!selectedCourse || !selectedProfessor || !quarter) {
      setMessage("Please select a course, professor, and specify the quarter.");
      setMessageSeverity("error");
      setShowActionCompletedMessage(true);
      return;
    }

    console.log("selectedCourse:", selectedCourse);
    console.log("selectedProfessor:", selectedProfessor);
    console.log("quarter:", quarter);

    const courseIdentifier = `P{${selectedProfessor.label}}C{${selectedCourse.label}}T{${quarter}}`;
    
    try {
      const updatePayload = {
        type: "updateUser",
        updateItems: {
          [courseType]: {
            add: [courseIdentifier],
          },
        },
      };

      console.log("updatePayload:", updatePayload);

      const response = await chrome.runtime.sendMessage(updatePayload);

      if (response && !response.ok) {
        setMessage(response.message || "Failed to add course.");
        setMessageSeverity("error");
      } else {
        if (courseType === "interestedSections") courseType = "interested";
        else courseType = "taken";
        setUserCourses((prev) => ({
          ...prev,
          [courseType]: [...prev[courseType], courseIdentifier],
        }));
        setMessage("Course successfully added!");
        setMessageSeverity("success");
      }
    } catch (error) {
      console.error("Error adding course:", error);
      setMessage("An error occurred while adding the course.");
      setMessageSeverity("error");
    }

    setShowActionCompletedMessage(true);
  };

  const courseOptions = useMemo(() => {
    if (!evalsData) return [];

    try {
      return Object.entries(evalsData || {})
        .filter(([key, value]) => value && value.type === "course")
        .map(([key, value]) => ({
          id: key,
          label: `${key} - ${value?.courseName || "Unnamed Course"}`,
        }));
    } catch (err) {
      console.error("Error processing course options:", err);
      return [];
    }
  }, [evalsData]);

  const professorOptions = useMemo(() => {
    if (!evalsData) return [];

    try {
      return Object.entries(evalsData || {})
        .filter(([key, value]) => value && value.type === "prof")
        .map(([key]) => ({ id: key, label: key }));
    } catch (err) {
      console.error("Error processing professor options:", err);
      return [];
    }
  }, [evalsData]);

  function CourseSection ({ title, courses, type }) {
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [selectedProfessor, setSelectedProfessor] = useState(null);
    const [quarter, setQuarter] = useState("");

    function handleAddClick () {
      if (!selectedCourse || !selectedProfessor || !quarter) {
        setMessage("Please fill in all fields before adding the course.");
        setMessageSeverity("error");
        setShowActionCompletedMessage(true);
        return;
      }

      handleAddCourse(
        type === "interested" ? "interestedSections" : "coursesTaken",
        selectedCourse,
        selectedProfessor,
        quarter,
      );

      setSelectedCourse(null);
      setSelectedProfessor(null);
      setQuarter("");
    };

    return (
      <Accordion sx={{ mb: 1 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography>{title}</Typography>
        </AccordionSummary>
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Add {title}
          </Typography>

          <Autocomplete
            options={courseOptions}
            getOptionLabel={(option) => option.label}
            filterOptions={(options, { inputValue }) =>
              inputValue.length >= 2
                ? options.filter((option) =>
                    option.label
                      .toLowerCase()
                      .includes(inputValue.toLowerCase()),
                  )
                : []
            }
            value={selectedCourse}
            onChange={(event, newValue) => setSelectedCourse(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select a Course"
                variant="outlined"
                size="small"
                sx={{ mb: 2 }}
              />
            )}
          />

          <Autocomplete
            options={professorOptions}
            getOptionLabel={(option) => option.label}
            filterOptions={(options, { inputValue }) =>
              inputValue.length >= 2
                ? options.filter((option) =>
                    option.label
                      .toLowerCase()
                      .includes(inputValue.toLowerCase()),
                  )
                : []
            }
            value={selectedProfessor}
            onChange={(event, newValue) => setSelectedProfessor(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select a Professor"
                variant="outlined"
                size="small"
                sx={{ mb: 2 }}
              />
            )}
          />

          <TextField
            label="Quarter (e.g., Fall 2024)"
            variant="outlined"
            value={quarter}
            onChange={(e) => setQuarter(e.target.value)}
            size="small"
            fullWidth
            sx={{ mb: 2 }}
          />

          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handleAddClick}
            sx={{
              backgroundColor: "#802a25",
              color: "white",
              "&:hover": {
                backgroundColor: "#671f1a",
              },
            }}
          >
            Add Course
          </Button>
        </Box>
        <AccordionDetails>
          {courses.length > 0 ? (
            courses.map((course, index) => (
              <Box
                key={`${type}-${index}`}
                sx={{
                  mb: 2,
                  p: 2,
                  borderRadius: 1,
                  backgroundColor: "background.paper",
                  boxShadow: 1,
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body1">
                    {course.courseCode} - {course.courseName}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => handleRemoveCourseClick(e, course, type)}
                    sx={{
                      color: "error.main",
                      "&:hover": {
                        backgroundColor: "error.light",
                        color: "white",
                      },
                    }}
                  >
                    <Close fontSize="small" />
                  </IconButton>
                </Stack>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {course.professor} | {course.quarter}
                </Typography>
              </Box>
            ))
          ) : (
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              No {title.toLowerCase()} available
            </Typography>
          )}
        </AccordionDetails>
      </Accordion>
    );
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography>Edit Courses</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {/* Interested Courses Section */}
          <CourseSection
            title="Interested Courses"
            courses={transformedCourses.interested}
            type="interested"
          />

          {/* Taken Courses Section */}
          <CourseSection
            title="Taken Courses"
            courses={transformedCourses.taken}
            type="taken"
          />
        </AccordionDetails>
      </Accordion>

      {/* Remove Course Confirmation Dialog */}
      <Dialog
        open={openConfirmDialog}
        onClose={handleCancelRemoveCourse}
        aria-labelledby="remove-course-dialog-title"
        aria-describedby="remove-course-dialog-description"
      >
        <DialogTitle id="remove-course-dialog-title">Remove Course</DialogTitle>
        <DialogContent>
          <DialogContentText id="remove-course-dialog-description">
            Are you sure you want to remove this course from your history?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelRemoveCourse} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmRemoveCourse}
            color="error"
            variant="contained"
            autoFocus
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      {/* Action Completed Snackbar */}
      <Snackbar
        open={showActionCompletedMessage}
        autoHideDuration={3000}
        onClose={() => setShowActionCompletedMessage(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setShowActionCompletedMessage(false)}
          severity={messageSeverity}
          sx={{ width: "100%" }}
        >
          {message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
