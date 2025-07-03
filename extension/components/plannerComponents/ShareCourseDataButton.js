import React from "react";
import Button from "@mui/material/Button";
import ShareIcon from "@mui/icons-material/Share";

export default function ShareCourseDataButton({ onClick, disabled = false }) {
  return (
    <Button
      variant="contained"
      color="primary"
      startIcon={<ShareIcon />}
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
        minWidth: 180,
        fontSize: "1rem",
        py: 1.2,
      }}
    >
      Share Course Data
    </Button>
  );
} 