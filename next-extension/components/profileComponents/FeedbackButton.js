import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  MenuItem,
  TextField,
  Select,
  Stack,
} from "@mui/material";

export default function FeedbackButton({ handleActionCompleted }) {
  const [open, setOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [selectedFeedbackType, setSelectedFeedbackType] = useState("");

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setFeedbackText("");
    setSelectedFeedbackType("");
  };

  async function handleSubmit() {
    // TODO: Submit feedback to backend.
    console.log("Submitting feedback...");
    setOpen(false);
    setFeedbackText("");
    setSelectedFeedbackType("");
    handleActionCompleted("Feedback submitted successfully!", "success");
  }

  const customStyles = {
    "& .MuiOutlinedInput-root": {
      "& fieldset": {
        borderColor: "#ccc",
      },
      "&:hover fieldset": {
        borderColor: "#ccc",
      },
      "&.Mui-focused fieldset": {
        borderColor: "#703331",
      },
    },
    "& .MuiInputLabel-root": {
      color: "#ccc",
    },
    "& .MuiInputLabel-outlined-root": {
      "&.Mui-focused": {
        color: "#703331",
      },
    },
    "& .Mui-focused.MuiInputLabel-root": {
      color: "#703331",
    },
  };

  return (
    <>
      <Button
        sx={{
          backgroundColor: "#802a25",
          color: "white",
          "&:hover": {
            backgroundColor: "#671f1a",
          },
        }}
        onClick={handleOpen}
      >
        Submit Feedback
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Submit Feedback</DialogTitle>
        <DialogContent
          sx={{
            paddingBottom: 0,
          }}
        >
          <Stack spacing={2} marginTop={2}>
            <FormControl fullWidth sx={customStyles}>
              <InputLabel id="feedback-type-label">Feedback Type</InputLabel>
              <Select
                labelId="feedback-type-label"
                id="feedback-type"
                value={selectedFeedbackType}
                label="Feedback Type"
                onChange={(e) => setSelectedFeedbackType(e.target.value)}
              >
                <MenuItem value={"general"}>General</MenuItem>
                <MenuItem value={"feature request"}>Feature Request</MenuItem>
                <MenuItem value={"bug report"}>Bug Report</MenuItem>
                <MenuItem value={"other"}>Other</MenuItem>
              </Select>
            </FormControl>
            <TextField
              multiline
              rows={4}
              fullWidth
              variant="outlined"
              placeholder="Write your feedback here..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              sx={customStyles}
            />

            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!selectedFeedbackType || !feedbackText.trim()}
              sx={{
                backgroundColor: "#802a25",
                color: "white",
                "&:hover": {
                  backgroundColor: "#671f1a",
                },
              }}
            >
              Submit Feedback
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

