import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Typography,
  Stack
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [selectedFeedbackType, setSelectedFeedbackType] = useState('');

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setExpanded(false);
    setFeedbackText('');
    setSelectedFeedbackType('');
  };

  const handleAccordionChange = (event, isExpanded) => {
    setExpanded(isExpanded ? 'feedback' : false);
  };

  const handleFeedbackTypeChange = (type) => {
    setSelectedFeedbackType(type);
  };

  /*
  const handleSubmit = async () => {
    if (feedbackText.trim()) {
      console.log('Feedback Submitted:', selectedFeedbackType, feedbackText);
      handleClose();
    }
  };
  */

  const feedbackTypes = [
    { type: 'comment', label: 'Comment' },
    { type: 'question', label: 'Question' },
    { type: 'bug', label: 'Bug Report' }
  ];

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
        Submit Feedback/Bug Report
      </Button>

      <Dialog 
        open={open} 
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Submit Feedback</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Accordion
              expanded={expanded === 'feedback'}
              onChange={handleAccordionChange}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">
                  Select Feedback Type
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <Typography variant="body2" color="text.secondary">
                    Please select the type of feedback you'd like to submit.
                  </Typography>
                  {feedbackTypes.map((feedbackType) => (
                    <Button
                      key={feedbackType.type}
                      variant={selectedFeedbackType === feedbackType.type ? "contained" : "outlined"}
                      onClick={() => handleFeedbackTypeChange(feedbackType.type)}
                      fullWidth
                      sx={{
                        borderColor: "#802a25", 
                        color: selectedFeedbackType === feedbackType.type ? "white" : "#802a25",
                        backgroundColor: selectedFeedbackType === feedbackType.type ? "#671f1a" : "transparent",
                        "&:hover": {
                          backgroundColor: "#671f1a", 
                          color: "white", 
                        },
                      }}
                    >
                      {feedbackType.label}
                    </Button>
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>

            <TextField
              multiline
              rows={4}
              fullWidth
              variant="outlined"
              placeholder="Write your feedback here..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
            />

            <Button
              variant="contained"
              //onClick={handleSubmit}
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

