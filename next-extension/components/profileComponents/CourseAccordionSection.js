import { useState, useMemo } from "react";
import {
  Typography,
  Box,
  IconButton,
  Button,
  Autocomplete,
  TextField,
  Stack,
  Tooltip,
} from "@mui/material";
import { Add, Delete, Description, ImportContacts } from "@mui/icons-material";
import CourseBox from "./CourseBox";
import { getRelevantCourseTimes } from "../utils/user.js";

export default function CourseAccordionSection({
  courseOptions,
  professorOptions,
  handleAddCourse,
  handleEditCourse,
  handleRemoveCourseClick,
  handleDeleteAllCoursesClick,
  title,
  courses,
  type,
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedProfessor, setSelectedProfessor] = useState(null);
  const [selectedCourseTime, setSelectedCourseTime] = useState(null);

  const timeOptions = useMemo(() => getRelevantCourseTimes(type), [type]);

  const handleAddClick = async (type) => {
    await handleAddCourse(
      type === "interested" ? "interestedSections" : "coursesTaken",
      selectedCourse,
      selectedProfessor,
      selectedCourseTime,
    );

    setSelectedCourse(null);
    setSelectedProfessor(null);
    setSelectedCourseTime(null);
    setExpanded(false);
  };

  async function startImport(functionName) {
    try {
      const errorMessage = await chrome.runtime.sendMessage(functionName);
      if (errorMessage) {
        handleActionCompleted(errorMessage, "error");
      }
    } catch (error) {
      console.error("Error importing courses:", error);
      handleActionCompleted(
        "An unknown error occurred while importing courses.",
        "error",
      );
    }
  }

  return (
    <Box sx={{ mb: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
        <Typography variant="h6">{title}</Typography>
        <Tooltip title="Add a course">
          <IconButton onClick={() => setExpanded(!expanded)} sx={{ ml: 1 }}>
            <Add />
          </IconButton>
        </Tooltip>
        {type === "taken" && (
          <>
            <Tooltip title="Import current courses from Workday (opens in tab)">
              <IconButton
                onClick={() => {
                  startImport("importCurrentCourses");
                }}
                sx={{ ml: 1 }}
              >
                <ImportContacts />
              </IconButton>
            </Tooltip>
            <Tooltip title="Import all previous courses from Workday (opens in tab)">
              <IconButton
                onClick={() => {
                  startImport("importCourseHistory");
                }}
                sx={{ ml: 1 }}
              >
                <Description />
              </IconButton>
            </Tooltip>
          </>
        )}
        <Tooltip title={`Delete all ${title.toLowerCase()}`}>
          <IconButton
            onClick={(e) => handleDeleteAllCoursesClick(e, type)}
            sx={{ ml: 1 }}
          >
            <Delete />
          </IconButton>
        </Tooltip>
      </Box>
      {expanded && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
          }}
        >
          <Autocomplete
            freeSolo
            options={courseOptions}
            value={selectedCourse}
            onInputChange={(event, newInputValue) => {
              setSelectedCourse(newInputValue);
            }}
            onChange={(event, newValue) => setSelectedCourse(newValue)}
            sx={{ mb: 2 }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Course"
                variant="outlined"
                size="small"
              />
            )}
          />
          <Autocomplete
            freeSolo
            options={professorOptions}
            value={selectedProfessor}
            onInputChange={(event, newInputValue) => {
              setSelectedProfessor(newInputValue);
            }}
            onChange={(event, newValue) => setSelectedProfessor(newValue)}
            sx={{ mb: 2 }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Professor"
                variant="outlined"
                size="small"
              />
            )}
          />
          <Autocomplete
            freeSolo
            options={timeOptions}
            value={selectedCourseTime}
            onInputChange={(event, newInputValue) => {
              setSelectedCourseTime(newInputValue);
            }}
            onChange={(event, newValue) => setSelectedCourseTime(newValue)}
            sx={{ mb: 2 }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={type === "interested" ? "Meeting Pattern" : "Quarter"}
                variant="outlined"
                size="small"
              />
            )}
          />
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={() => {
              handleAddClick(type);
            }}
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
          <Button
            variant="outlined"
            color="primary"
            fullWidth
            onClick={() => setExpanded(false)}
            sx={{
              mt: 1,
              backgroundColor: "white",
              color: "#802a25",
              borderColor: "#802a25",
              "&:hover": {
                backgroundColor: "rgba(128, 42, 37, 0.1)",
              },
            }}
          >
            Cancel
          </Button>
        </Box>
      )}
      {courses.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {courses.map((course, index) => (
            <CourseBox
              key={index}
              courseOptions={courseOptions}
              professorOptions={professorOptions}
              timeOptions={timeOptions}
              course={course}
              onCourseChange={handleEditCourse}
              onRemoveCourse={handleRemoveCourseClick}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
