import React from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  Button,
} from "@mui/material";

export default function PreferencesDialog({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>More Information</DialogTitle>
      <DialogContent dividers>
        <Typography variant="subtitle1" gutterBottom>
          Preferred Course Times
        </Typography>
        <Typography variant="body2" component={"p"}>
          Use the slider to select your preferred time range for classes.
          Courses outside your time range will be marked in Workday.
        </Typography>

        <Typography variant="subtitle1" gutterBottom>
          RateMyProfessor vs SCU Course Evaluations
        </Typography>
        <Typography variant="body2" component={"p"}>
          We use RateMyProfessor and SCU Course Evaluations data to calculate
          and display overall section scores inside Workday. Adjust the slider
          to change the weight of each data source in the overall score
          calculation.
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          Automatic Course Tracking
        </Typography>
        <Typography variant="body2">
          Enable this to automatically add courses that you register for to your
          profile, as well as interested sections (i.e. when you add a course to
          a saved schedule). When disabled, you can still import your courses
          manually from the profile page. Your sensitive data is never stored.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
