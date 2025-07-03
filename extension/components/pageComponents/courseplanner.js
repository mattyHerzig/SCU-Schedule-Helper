import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { CalendarMonth } from "@mui/icons-material";
import ShareCourseDataButton from "../plannerComponents/ShareCourseDataButton";
import GenerateCourseScheduleButton from "../plannerComponents/GenerateCourseScheduleButton";

export default function CoursePlannerPage() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: 3,
        textAlign: "center",
      }}
    >
      <CalendarMonth
        sx={{
          fontSize: 64,
          color: "#d1d1d1",
          marginBottom: 2,
        }}
      />
      <Typography
        variant="h5"
        sx={{
          color: "#703331",
          fontWeight: "bold",
          marginBottom: 1,
        }}
      >
        Course Planner
      </Typography>
      <Typography
        variant="body1"
        sx={{
          color: "#666",
          maxWidth: "300px",
          marginBottom: 3,
        }}
      >
        Course Planner feature coming soon! Plan your academic journey with our upcoming scheduling tools.
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
        <ShareCourseDataButton />
        <GenerateCourseScheduleButton />
      </Box>
    </Box>
  );
} 