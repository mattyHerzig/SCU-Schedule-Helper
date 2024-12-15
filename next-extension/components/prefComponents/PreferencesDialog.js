import React from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  Button
} from "@mui/material";

export default function PreferencesDialog({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>More Information</DialogTitle>
      <DialogContent dividers>
        <Typography variant="subtitle1" gutterBottom>
          Preferred Course Times:
        </Typography>
        <Typography variant="body2" paragraph>
          Use the slider to select your preferred time range for classes.
          Courses outside your time range will be marked in Workday.
        </Typography>

        <Typography variant="subtitle1" gutterBottom>
          RateMyProfessor vs SCU Course Evaluations:
        </Typography>
        <Typography variant="body2" paragraph>
          Adjust the slider to weigh how much each rating source influences
          your preference. Courses will be color coded according to the
          course statistics adjusted with your weight
        </Typography>

        <Typography variant="subtitle1" gutterBottom>
          Automatic Course Tracking:
        </Typography>
        <Typography variant="body2">
          Enable this to allow others to see what courses you are taking
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}