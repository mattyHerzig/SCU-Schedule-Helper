import React, { useState, useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import AuthWrapper from "./authWrapper.js";
import ProfileSection from "../profileComponents/ProfileSection.js";
import CourseAccordion from "../profileComponents/CourseAccordion.js";
import FeedbackButton from "../profileComponents/FeedbackButton.js";

export default function Profile() {
  const [userInfo, setUserInfo] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openInfoDialog, setOpenInfoDialog] = useState(false); // Info dialog state
  const [showActionCompletedMessage, setShowActionCompletedMessage] =
    useState(false);
  const [currentAction, setCurrentAction] = useState(null);

  useEffect(() => {
    function storageListener(changes, namespace) {
      if (namespace === "local" && changes.userInfo) {
        checkUserInfo();
      }
    }
    chrome.storage.onChanged.addListener(storageListener);
    checkUserInfo();
    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, []);

  async function checkUserInfo() {
    try {
      const data = await chrome.storage.local.get("userInfo");
      setUserInfo(data.userInfo || null);
    } catch (error) {
      console.error("Error checking user info:", error);
      setUserInfo(null);
    }
  }

  async function signOut() {
    try {
      await chrome.runtime.sendMessage("signOut");
    } catch (error) {
      console.error("Error signing out:", error);
      handleActionCompleted(
        "An unknown error occurred while signing out.",
        "error",
      );
    }
  }

  async function deleteAccount() {
    try {
      const errorMessage = await chrome.runtime.sendMessage("deleteAccount");
      if (errorMessage) {
        handleActionCompleted(errorMessage, "error");
      } else {
        handleActionCompleted("Account deleted successfully.", "success");
      }
    } catch (error) {
      handleActionCompleted(
        "An unknown error occurred while deleting account. Please try again.",
        "error",
      );
    }
  }

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

  async function deleteCourseHistory() {
    try {
      const errorMessage =
        await chrome.runtime.sendMessage("clearCourseHistory");
      if (errorMessage) {
        handleActionCompleted(errorMessage, "error");
      } else {
        handleActionCompleted(
          "Course history cleared successfully.",
          "success",
        );
      }
    } catch (error) {
      console.error("Error clearing course history:", error);
      handleActionCompleted(
        "An unknown error occurred while clearing course history.",
        "error",
      );
    }
  }

  async function handleConfirmDeleteAccount() {
    await deleteAccount();
    setOpenDialog(false);
  }

  function handleActionCompleted(message, type) {
    setCurrentAction({
      message,
      type,
    });
    setShowActionCompletedMessage(true);
  }

  function handleOpenDeleteDialog() {
    setOpenDialog(true);
  }

  function handleCloseDeleteDialog() {
    setOpenDialog(false);
  }

  function handleOpenInfoDialog() {
    setOpenInfoDialog(true);
  }

  function handleCloseInfoDialog() {
    setOpenInfoDialog(false);
  }

  return (
    <AuthWrapper>
      <Box sx={{ padding: 2, boxSizing: "border-box" }}>
        <Stack direction="row" alignItems="center">
          <Typography variant="h6" sx={{ textAlign: "center" }}>
            Your Profile
          </Typography>
          <IconButton
            sx={{
              ml: 1,
              p: 0,
            }}
            onClick={handleOpenInfoDialog}
            aria-label="info"
          >
            <InfoIcon fontSize="small" />
          </IconButton>
        </Stack>

        <ProfileSection
          userInfo={userInfo}
          handleActionCompleted={handleActionCompleted}
        />

        <Box sx={{ mb: 3 }}>
          <CourseAccordion
            userInfo={userInfo}
            handleActionCompleted={handleActionCompleted}
          />
        </Box>

        <Stack spacing={2} sx={{ width: "100%" }}>
          <Button
            sx={{
              backgroundColor: "#802a25",
              color: "white",
              "&:hover": {
                backgroundColor: "#671f1a",
              },
            }}
            onClick={() => startImport("importCurrentCourses")}
          >
            Import Current Courses
          </Button>
          <Button
            sx={{
              backgroundColor: "#802a25",
              color: "white",
              "&:hover": {
                backgroundColor: "#671f1a",
              },
            }}
            onClick={() => startImport("importCourseHistory")}
          >
            Import Course History
          </Button>
          <Button
            sx={{
              backgroundColor: "#802a25",
              color: "white",
              "&:hover": {
                backgroundColor: "#671f1a",
              },
            }}
            onClick={deleteCourseHistory}
          >
            Delete Course History
          </Button>

          <FeedbackButton></FeedbackButton>

          {/* TODO: add this once we have a support page or buy me a coffee thing. */}
          {/* <Button color="success" variant="contained">
            Support Us
          </Button> */}

          <Button
            sx={{
              backgroundColor: "#802a25",
              color: "white",
              "&:hover": {
                backgroundColor: "#671f1a",
              },
            }}
            onClick={signOut}
          >
            Sign Out
          </Button>

          <Button
            sx={{
              backgroundColor: "red",
              color: "white",
              "&:hover": {
                backgroundColor: "#ff4d4d",
              },
            }}
            onClick={handleOpenDeleteDialog}
          >
            Delete Account
          </Button>
        </Stack>

        <Dialog open={openDialog} onClose={handleCloseDeleteDialog}>
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogContent>
            <Typography variant="body1">
              Are you sure you want to delete your account?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDeleteDialog} color="primary">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDeleteAccount}
              color="secondary"
              autoFocus
            >
              Delete Account
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={openInfoDialog} onClose={handleCloseInfoDialog}>
          <DialogTitle>Button Information</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Import Current Courses:</strong> Click this to
              automatically import your current quarter's course history from
              Workday to your profile
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Import Course History:</strong> Click this to
              automatically import your course history from Workday to display
              what courses you have taken to your friends in Workday. Note that
              we are only reading the course and professor name when reading
              your course history. Feel free to manually enter and adjust your
              course history.
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Interested Courses:</strong> The courses added to saved
              schedules will be added to your interested course section
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Delete Course History:</strong> This clears all your past
              and interested courses from the system.
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Support:</strong> If you would like to see an AI powered
              course schedule generator feature, consider donating to support
              development of more features.
            </Typography>
            <Typography variant="body2">
              <strong>Delete Account:</strong> Permanently deletes your account
              and data.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseInfoDialog} color="primary">
              Close
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={showActionCompletedMessage}
          autoHideDuration={3000}
          onClose={() => setShowActionCompletedMessage(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setShowActionCompletedMessage(false)}
            severity={currentAction?.type || "success"}
            sx={{ width: "100%" }}
          >
            {currentAction?.message}
          </Alert>
        </Snackbar>
      </Box>
    </AuthWrapper>
  );
}
