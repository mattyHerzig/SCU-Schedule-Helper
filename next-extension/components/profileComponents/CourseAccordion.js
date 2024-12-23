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
import { Edit, Close, Add, ExpandMore } from "@mui/icons-material";
import {
  mostRecentTermFirst,
  parseInterestedSections,
  parseTakenCourses,
} from "../utils/user.js";

export default function CourseAccordion() {
  const [userCourses, setUserCourses] = useState({
    interested: {},
    taken: [],
  });
  const [evalsData, setEvalsData] = useState(null);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [courseToRemove, setCourseToRemove] = useState(null);
  const [courseRemoveType, setCourseRemoveType] = useState(null);
  const [showActionCompletedMessage, setShowActionCompletedMessage] = useState(false);
  const [message, setMessage] = useState("");
  const [messageSeverity, setMessageSeverity] = useState("success");
  const [editingCourse, setEditingCourse] = useState(null);
  const [editedCourseName, setEditedCourseName] = useState("");
  const [editedProfessor, setEditedProfessor] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const { userInfo } = await chrome.storage.local.get("userInfo");
        const { evals } = await chrome.storage.local.get("evals");

        if (userInfo) {
          userInfo.coursesTaken = userInfo.coursesTaken || [];
          userInfo.interestedSections = userInfo.interestedSections || {};
          userInfo.coursesTaken = userInfo.coursesTaken.filter(course => course);

          setUserCourses({
            interested: userInfo.interestedSections || {},
            taken: userInfo.coursesTaken || [],
          });
        }

        if (evals) {
          setEvalsData(evals);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    fetchData();
  }, []);

  const handleEditClick = (event, course, type) => {
    event.stopPropagation();
    setEditingCourse({ ...course, type });
    setEditedCourseName(course.courseName);
    setEditedProfessor(course.professor);
  };

  const handleSaveEdit = async () => {
    if (!editingCourse) return;

    try {
      // First remove the old course
      await handleConfirmRemoveCourse(true);

      // Then add the new course with edited information
      if (editingCourse.type === "interested") {
        await handleAddCourse(
          "interestedSections",
          { label: editedCourseName },
          { label: editedProfessor },
          null,
          editingCourse.meetingTime
        );
      } else {
        await handleAddCourse(
          "coursesTaken",
          { label: `${editingCourse.courseCode} - ${editedCourseName}` },
          { label: editedProfessor },
          editingCourse.quarter,
          null
        );
      }

      setMessage("Course successfully updated!");
      setMessageSeverity("success");
      setShowActionCompletedMessage(true);
      setEditingCourse(null);
    } catch (error) {
      console.error("Error updating course:", error);
      setMessage("An error occurred while updating the course.");
      setMessageSeverity("error");
      setShowActionCompletedMessage(true);
    }
  };

  const handleCancelEdit = () => {
    setEditingCourse(null);
    setEditedCourseName("");
    setEditedProfessor("");
  };

  const transformedCourses = {
    interested: Object.keys(userCourses.interested || {}).map(section => {
      const matches = section.match(/P{(.+?)}S{(.+?)}M{(.+?)}/);
      if (matches) {
        const [_, professor, courseName, meetingTime] = matches;
        return {
          professor,
          courseName,
          meetingTime,
          originalString: section
        };
      }
      return null;
    }).filter(Boolean),
    taken: (userCourses.taken || []).map(course => {
      const matches = course.match(/P{(.+?)}C{(.+?)}T{(.+?)}/);
      if (matches) {
        const [_, professor, courseInfo, term] = matches;
        const [courseCode, courseName] = courseInfo.split(' - ');
        return {
          professor,
          courseCode,
          courseName: courseName || '',
          quarter: term,
          originalString: course
        };
      }
      return null;
    }).filter(Boolean).sort(mostRecentTermFirst),
  };

  const handleRemoveCourseClick = (event, course, type) => {
    event.stopPropagation();
    setCourseToRemove(course);
    setCourseRemoveType(type);
    setOpenConfirmDialog(true);
  };

  const handleConfirmRemoveCourse = async () => {
    if (courseToRemove) {
      try {
        const updateItems = {};
        if (courseRemoveType === "interested") {
          updateItems.interestedSections = {
            remove: [courseToRemove.originalString],
          };
        } else {
          updateItems.coursesTaken = {
            remove: [courseToRemove.originalString],
          };
        }

        const messagePayload = {
          type: "updateUser",
          updateItems,
        };

        const updateResponse = await chrome.runtime.sendMessage(messagePayload);

        if (updateResponse && !updateResponse.ok) {
          handleActionCompleted(updateResponse.message, "error");
        } else {
          setUserCourses(prevState => {
            if (courseRemoveType === "interested") {
              const newInterested = { ...prevState.interested };
              delete newInterested[courseToRemove.originalString];
              return { ...prevState, interested: newInterested };
            } else {
              const newTaken = prevState.taken.filter(
                course => course !== courseToRemove.originalString
              );
              return { ...prevState, taken: newTaken };
            }
          });

          setMessage("Course successfully removed!");
          setMessageSeverity("success");
        }

        setOpenConfirmDialog(false);
        setCourseToRemove(null);
        setCourseRemoveType(null);
      } catch (error) {
        console.error("Error removing course:", error);
        setMessage("An error occurred while removing the course.");
        setMessageSeverity("error");
      }
    }
  };

  const handleAddCourse = async (courseType, selectedCourse, selectedProfessor, quarter, meetingTime) => {
    if (!selectedCourse || !selectedProfessor) {
      setMessage("Please select both a course and professor.");
      setMessageSeverity("error");
      setShowActionCompletedMessage(true);
      return;
    }

    try {
      let courseIdentifier;
      if (courseType === "interestedSections") {
        if (!meetingTime) {
          setMessage("Please specify the meeting time for interested sections.");
          setMessageSeverity("error");
          setShowActionCompletedMessage(true);
          return;
        }
        courseIdentifier = `P{${selectedProfessor.label}}S{${selectedCourse.label}}M{${meetingTime}}`;
      } else {
        if (!quarter) {
          setMessage("Please specify the quarter for taken courses.");
          setMessageSeverity("error");
          setShowActionCompletedMessage(true);
          return;
        }
        courseIdentifier = `P{${selectedProfessor.label}}C{${selectedCourse.label}}T{${quarter}}`;
      }

      const updatePayload = {
        type: "updateUser",
        updateItems: {
          [courseType]: {
            add: [courseIdentifier],
          },
        },
      };

      const response = await chrome.runtime.sendMessage(updatePayload);

      if (response && !response.ok) {
        setMessage(response.message || "Failed to add course.");
        setMessageSeverity("error");
      } else {
        if (courseType === "interestedSections") {
          setUserCourses(prev => ({
            ...prev,
            interested: {
              ...prev.interested,
              [courseIdentifier]: { S: new Date().toISOString() }
            }
          }));
        } else {
          setUserCourses(prev => ({
            ...prev,
            taken: [...prev.taken, courseIdentifier]
          }));
        }
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

  function CourseSection({ title, courses, type }) {
    const [expanded, setExpanded] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [selectedProfessor, setSelectedProfessor] = useState(null);
    const [quarter, setQuarter] = useState("");
    const [meetingTime, setMeetingTime] = useState("");
    const [courseTag, setCourseTag] = useState("");

    const handleCourseChange = (event, newValue) => {
      setSelectedCourse(newValue);
      if (newValue) {
        const courseCode = newValue.label.split(' - ')[0];
        const tag = courseCode.replace(/\s+/g, '');
        setCourseTag(tag);
      } else {
        setCourseTag("");
      }
    };

    const handleAddClick = () => {
      if (type === "interested") {
        if (!selectedCourse || !selectedProfessor || !meetingTime) {
          setMessage("Please fill out all fields.");
          setMessageSeverity("error");
          setShowActionCompletedMessage(true);
          return;
        }
    
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 14);
    
        const sectionKey = `P{${selectedProfessor.label}}S{${selectedCourse.label}}M{${meetingTime}}`;
    
        const userId = data?.userInfo?.id;
    
        if (!userId) {
          setMessage("User ID not found.");
          setMessageSeverity("error");
          setShowActionCompletedMessage(true);
          return;
        }
    
        const sectionData = {
          pk: { S: `u#${userId}` },
          sk: { S: "info#interestedSections" },
          sections: {
            M: {
              [sectionKey]: {
                S: expirationDate.toISOString(),
              },
            },
          },
        };
    
        handleAddCourse(
          "interestedSections",
          selectedCourse,
          selectedProfessor,
          null,
          meetingTime,
          sectionData
        );
      } else {
        handleAddCourse(
          "coursesTaken",
          selectedCourse,
          selectedProfessor,
          quarter,
          null
        );
      }
    
      setSelectedCourse(null);
      setSelectedProfessor(null);
      setQuarter("");
      setMeetingTime("");
      setExpanded(false);
    };

    return (
      <Box sx={{ mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6">{title}</Typography>
          <IconButton 
            onClick={() => setExpanded(!expanded)}
            sx={{ ml: 1 }}
          >
            <Add />
          </IconButton>
        </Box>
        
        {expanded && (
          <Box sx={{ mt: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Autocomplete
              options={courseOptions}
              getOptionLabel={(option) => option.label}
              value={selectedCourse}
              onChange={handleCourseChange}
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

            {type === "interested" ? (
              <TextField
                label="Meeting Time (e.g., M W F | 1:00 PM - 2:05 PM | Rm 206)"
                variant="outlined"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                size="small"
                fullWidth
                sx={{ mb: 2 }}
              />
            ) : (
              <TextField
                label="Quarter (e.g., Fall 2024)"
                variant="outlined"
                value={quarter}
                onChange={(e) => setQuarter(e.target.value)}
                size="small"
                fullWidth
                sx={{ mb: 2 }}
              />
            )}

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
        )}

        {courses.length > 0 && (
          <Box sx={{ mt: 2 }}>
            {courses.map((course, index) => (
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
                {editingCourse?.originalString === course.originalString ? (
                  <Box sx={{ mb: 2 }}>
                    <TextField
                      fullWidth
                      label="Course Name"
                      value={editedCourseName}
                      onChange={(e) => setEditedCourseName(e.target.value)}
                      size="small"
                      sx={{ mb: 1 }}
                    />
                    <TextField
                      fullWidth
                      label="Professor"
                      value={editedProfessor}
                      onChange={(e) => setEditedProfessor(e.target.value)}
                      size="small"
                      sx={{ mb: 1 }}
                    />
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        size="small"
                        onClick={handleCancelEdit}
                        color="inherit"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="small"
                        onClick={handleSaveEdit}
                        variant="contained"
                        color="primary"
                      >
                        Save
                      </Button>
                    </Stack>
                  </Box>
                ) : (
                  <>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography variant="body1">
                        {type === "interested" ? course.courseName : `${course.courseCode} - ${course.courseName}`}
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        <IconButton
                          size="small"
                          onClick={(e) => handleEditClick(e, course, type)}
                          sx={{
                            color: "primary.main",
                            "&:hover": {
                              backgroundColor: "primary.light",
                              color: "white",
                            },
                          }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
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
                    </Stack>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {type === "interested" ? 
                        course.professor : 
                        `${course.professor} | ${course.quarter}`}
                    </Typography>
                  </>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    );
  }
  const courseOptions = useMemo(() => {
    if (!evalsData) return [];
    return Object.entries(evalsData || {})
      .filter(([key, value]) => value && value.type === "course")
      .map(([key, value]) => ({
        id: key,
        label: `${key} - ${value?.courseName || "Unnamed Course"}`,
      }));
  }, [evalsData]);

  const professorOptions = useMemo(() => {
    if (!evalsData) return [];
    return Object.entries(evalsData || {})
      .filter(([key, value]) => value && value.type === "prof")
      .map(([key]) => ({ id: key, label: key }));
  }, [evalsData]);

  return (
    <Box sx={{ width: "100%" }}>
      <Accordion>
        <AccordionSummary 
          expandIcon={<ExpandMore />}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Edit fontSize="small" />
            <Typography>Edit Courses</Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <CourseSection
            title="Interested Courses"
            courses={transformedCourses.interested}
            type="interested"
          />
          <CourseSection
            title="Taken Courses"
            courses={transformedCourses.taken}
            type="taken"
          />
        </AccordionDetails>
      </Accordion>

      <Dialog
        open={openConfirmDialog}
        onClose={() => {
          setOpenConfirmDialog(false);
          setCourseToRemove(null);
          setCourseRemoveType(null);
        }}
        aria-labelledby="remove-course-dialog-title"
        aria-describedby="remove-course-dialog-description"
      >
        <DialogTitle id="remove-course-dialog-title">Remove Course</DialogTitle>
        <DialogContent>
          <DialogContentText id="remove-course-dialog-description">
            Are you sure you want to remove this course?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenConfirmDialog(false);
            setCourseToRemove(null);
            setCourseRemoveType(null);
          }} color="primary">
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