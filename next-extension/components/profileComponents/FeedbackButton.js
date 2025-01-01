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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpen = () => {
    console.log("Opening feedback dialog");
    setOpen(true);
  };

  const handleClose = () => {
    console.log("Closing feedback dialog");
    setOpen(false);
    setFeedbackText("");
    setSelectedFeedbackType("");
    setIsSubmitting(false); 
  };

  async function handleSubmit() {
    console.log("Starting feedback submission...", {
      feedbackType: selectedFeedbackType,
      feedbackText: feedbackText,
      timestamp: new Date().toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles',
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    });
    
    if (!selectedFeedbackType || !feedbackText.trim()) {
      console.error("Missing required fields");
      handleActionCompleted("Please fill in all required fields.", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Sending message to service worker...");
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'SUBMIT_FEEDBACK',
          data: {
            feedbackType: selectedFeedbackType,
            feedbackText: feedbackText.trim(),
            timestamp: new Date().toLocaleString('en-US', {
              timeZone: 'America/Los_Angeles',
              month: 'numeric',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })
          }
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Chrome runtime error:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
            return;
          }
          resolve(response);
        });
      });

      console.log("Service worker response:", response);

      if (response?.success) {
        console.log("Feedback submitted successfully");
        handleActionCompleted("Feedback submitted successfully!", "success");
        handleClose();
      } else {
        throw new Error(response?.error || "Unknown error occurred");
      }
    } catch (error) {
      console.error('Submission error:', error);
      handleActionCompleted(error.message || "Error submitting feedback. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  const customStyles = {
    "& .MuiOutlinedInput-root": {
      "& fieldset": { borderColor: "#ccc" },
      "&:hover fieldset": { borderColor: "#ccc" },
      "&.Mui-focused fieldset": { borderColor: "#703331" },
    },
    "& .MuiInputLabel-root": { color: "#ccc" },
    "& .Mui-focused.MuiInputLabel-root": { color: "#703331" },
  };

  return (
    <>
      <Button
        sx={{
          backgroundColor: "#802a25",
          color: "white",
          "&:hover": { backgroundColor: "#671f1a" },
        }}
        onClick={handleOpen}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Submitting..." : "Submit Feedback"}
      </Button>

      <Dialog 
        open={open} 
        onClose={!isSubmitting ? handleClose : undefined}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Submit Feedback</DialogTitle>
        <DialogContent sx={{ paddingBottom: 0 }}>
          <Stack spacing={2} marginTop={2}>
            <FormControl fullWidth sx={customStyles}>
              <InputLabel id="feedback-type-label">Feedback Type</InputLabel>
              <Select
                labelId="feedback-type-label"
                value={selectedFeedbackType}
                label="Feedback Type"
                onChange={(e) => setSelectedFeedbackType(e.target.value)}
                disabled={isSubmitting}
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
              disabled={isSubmitting}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ padding: 2 }}>
          <Button 
            onClick={handleClose} 
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!selectedFeedbackType || !feedbackText.trim() || isSubmitting}
            sx={{
              backgroundColor: "#802a25",
              color: "white",
              "&:hover": { backgroundColor: "#671f1a" },
            }}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

