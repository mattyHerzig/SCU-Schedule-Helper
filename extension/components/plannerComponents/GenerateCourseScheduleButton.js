import React from "react";
import Button from "@mui/material/Button";
import EventNoteIcon from "@mui/icons-material/EventNote";

export default function GenerateCourseScheduleButton({ onClick, disabled = false }) {
  return (
    <Button
      variant="contained"
      color="primary"
      startIcon={<EventNoteIcon />}
      onClick={onClick}
      disabled={disabled}
      sx={{
        backgroundColor: "#703331",
        color: "white",
        fontWeight: "bold",
        borderRadius: 2,
        textTransform: "none",
        boxShadow: "0 2px 6px rgba(112, 51, 49, 0.15)",
        ":hover": {
          backgroundColor: "#8a443d",
        },
        minWidth: 200,
        fontSize: "1rem",
        py: 1.2,
      }}
    >
      Generate Course Schedule
    </Button>
  );
} 