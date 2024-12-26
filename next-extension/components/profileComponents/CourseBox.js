import { useState } from "react";
import {
  Box,
  TextField,
  Stack,
  Button,
  Typography,
  IconButton,
  Autocomplete,
} from "@mui/material";
import { Edit, Close } from "@mui/icons-material";

export default function CourseBox({
  courseOptions,
  professorOptions,
  timeOptions,
  course,
  onCourseChange,
  onRemoveCourse,
}) {
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [editedCourseName, setEditedCourseName] = useState(course.courseName);
  const [editedProfessor, setEditedProfessor] = useState(course.professor);
  const [editedCourseTime, setEditedCourseTime] = useState(null);

  function handleEditClick(e, course) {
    e.preventDefault();
    setIsEditingCourse(true);
    setEditedCourseName(getCourseString());
    setEditedProfessor(course.professor);
    setEditedCourseTime(
      course.type === "interested" ? course.meetingPattern : course.quarter,
    );
  }

  function handleCancelEdit() {
    setIsEditingCourse(false);
  }

  async function handleSaveEdit() {
    const newKey =
      course.type === "interested"
        ? `P{${editedProfessor}}S{${editedCourseName}}M{${editedCourseTime}}`
        : `P{${editedProfessor}}C{${editedCourseName}}T{${editedCourseTime}}`;
    await onCourseChange(course.type, course.key, newKey);
    setIsEditingCourse(false);
  }

  function getCourseString() {
    if (course.courseCode) return `${course.courseCode} - ${course.courseName}`;
    else return course.courseName;
  }

  return (
    <Box
      sx={{
        mb: 2,
        p: 2,
        borderRadius: 1,
        backgroundColor: "background.paper",
        boxShadow: 1,
      }}
    >
      {isEditingCourse ? (
        <Box>
          <Autocomplete
            freeSolo
            options={courseOptions}
            value={editedCourseName}
            onInputChange={(event, newInputValue) =>
              setEditedCourseName(newInputValue)
            }
            onChange={(event, newValue) => setEditedCourseName(newValue)}
            sx={{ mb: 1.5 }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Course Name"
                variant="outlined"
                size="small"
              />
            )}
          />
          <Stack direction="row" spacing={1}>
            <Autocomplete
              freeSolo
              options={professorOptions}
              value={editedProfessor}
              onInputChange={(event, newInputValue) =>
                setEditedProfessor(newInputValue)
              }
              onChange={(event, newValue) => setEditedProfessor(newValue)}
              sx={{ mb: 1.5, width: "50%" }}
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
              value={editedCourseTime}
              onInputChange={(event, newInputValue) =>
                setEditedCourseTime(newInputValue)
              }
              onChange={(event, newValue) => setEditedCourseTime(newValue)}
              sx={{ mb: 1.5, width: "50%" }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={
                    course.type === "interested" ? "Meeting Pattern" : "Quarter"
                  }
                  variant="outlined"
                  size="small"
                />
              )}
            />
          </Stack>
          <Stack
            direction="row"
            spacing={1}
            justifyContent="flex-end"
            sx={{
              py: 1,
            }}
          >
            <Button size="small" onClick={handleCancelEdit} color="inherit">
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
            <Typography variant="body1">{getCourseString()}</Typography>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                pr: 2,
              }}
            >
              <IconButton
                size="small"
                onClick={(e) => handleEditClick(e, course)}
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
                onClick={(e) => onRemoveCourse(e, course)}
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
            {course.type === "interested"
              ? `${course.professor} | ${course.meetingPattern}`
              : (course.professor === "Not taken at SCU" &&
                  "Not taken at SCU") ||
                `Prof. ${course.professor} | ${course.quarter}`}
          </Typography>
        </>
      )}
    </Box>
  );
}
