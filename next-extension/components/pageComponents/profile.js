import React, { useState, useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import AuthWrapper from "./authWrapper.js";
import UserCourseDetails from "../profileComponents/UserCourseDetails.js";
import ProfileSection from "../profileComponents/ProfileSection.js";

export default function Profile() {
  const [userInfo, setUserInfo] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [showActionCompletedMessage, setShowActionCompletedMessage] =
    useState(false);
  const [currentAction, setCurrentAction] = useState(null);

  useEffect(() => {
    const storageListener = (changes, namespace) => {
      if (namespace === "local" && changes.userInfo) {
        checkUserInfo();
      }
    };
    chrome.storage.onChanged.addListener(storageListener);
    checkUserInfo();
    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, []);

  const checkUserInfo = async () => {
    try {
      const data = await chrome.storage.local.get("userInfo");
      setUserInfo(data.userInfo || null);
    } catch (error) {
      console.error("Error checking user info:", error);
      setUserInfo(null);
    }
  };

  const signOut = async () => {
    try {
      await chrome.runtime.sendMessage("signOut");
    } catch (error) {
      console.error("Error signing out:", error);
      handleActionCompleted(
        "An unknown error occurred while signing out.",
        "error",
      );
    }
  };

  const deleteAccount = async () => {
    try {
      const errorMessage = await chrome.runtime.sendMessage("deleteAccount");
      if (errorMessage) {
        handleActionCompleted(errorMessage, "error");
      }
    } catch (error) {
      handleActionCompleted(
        "An unknown error occurred while deleting account. Please try again.",
        "error",
      );
    }
  };

  const importCurrentCourses = async () => {
    try {
      const errorMessage = await chrome.runtime.sendMessage(
        "importCurrentCourses",
      );
      if (errorMessage) {
        handleActionCompleted(errorMessage, "error");
      }
    } catch (error) {
      console.error("Error adding current courses:", error);
      handleActionCompleted(
        "An unknown error occurred while adding current courses.",
        "error",
      );
    }
  };

  const importCourseHistory = async () => {
    try {
      const errorMessage = await chrome.runtime.sendMessage(
        "importCourseHistory",
      );
      if (errorMessage) {
        handleActionCompleted(errorMessage, "error");
      }
    } catch (error) {
      console.error("Error importing course history:", error);
      handleActionCompleted(
        "An unknown error occurred while importing course history.",
        "error",
      );
    }
  };

  const deleteCourseHistory = async () => {
    try {
      const errorMessage = await chrome.runtime.sendMessage("clearCourseHistory");
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
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleConfirmDeleteAccount = async () => {
    await deleteAccount();
    setOpenDialog(false);
  };

  const handleActionCompleted = (message, type) => {
    setCurrentAction({
      message,
      type,
    });
    setShowActionCompletedMessage(true);
  };

  return (
    <AuthWrapper>
      <Box sx={{ padding: 2, boxSizing: "border-box" }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Your Profile
        </Typography>

        <ProfileSection
          userInfo={userInfo}
          handleActionCompleted={handleActionCompleted}
        />

        <Box sx={{ mb: 3 }}>
          <UserCourseDetails />
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
            onClick={importCurrentCourses}
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
            onClick={importCourseHistory}
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
            onClick={handleOpenDialog}
          >
            Delete Account
          </Button>
        </Stack>

        <Dialog open={openDialog} onClose={handleCloseDialog}>
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogContent>
            <Typography variant="body1">
              Are you sure you want to delete your account?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} color="primary">
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
