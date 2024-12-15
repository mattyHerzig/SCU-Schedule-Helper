import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import AuthWrapper from "./authWrapper.js";
import UserCourseDetails from "../profileComponents/UserCourseDetails.js";
import { clearCourseHistory } from "../../public/utils/user.js";
import ProfileSection from "../profileComponents/ProfileSection.js";

export default function Profile() {
  const [userInfo, setUserInfo] = useState(null);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

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
      setError(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const deleteAccount = async () => {
    try {
      const errorMessage = await chrome.runtime.sendMessage("deleteAccount");
      setError(errorMessage || null);
    } catch (error) {
      setError(
        "Unknown error occurred while deleting account. Please try again.",
      );
    }
  };

  const importCurrentCourses = async () => {
    try {
      const errorMessage =
        await chrome.runtime.sendMessage("importCurrentCourses");
      setError(errorMessage || null);
    } catch (error) {
      console.error("Error adding current courses:", error);
      setError("An unknown error occurred while adding current courses.");
    }
  };

  const importCourseHistory = async () => {
    try {
      const errorMessage = await chrome.runtime.sendMessage(
        "importCourseHistory",
      );
      setError(errorMessage || null);
    } catch (error) {
      console.error("Error importing course history:", error);
      setError("Unknown error occurred while importing course history.");
    }
  };

  const deleteCourseHistory = async () => {
    try {
      const error = await clearCourseHistory();
      if (error) {
        setError(error);
      } else {
        setError(null);
      }
    } catch (error) {
      console.error("Error clearing course history:", error);
      setError("An unknown error occurred while clearing course history.");
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

  if (!userInfo) {
    return (
      <AuthWrapper>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper>
      <Box sx={{ padding: 2, boxSizing: "border-box" }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Your Profile
        </Typography>

        {/* Profile Section */}
        <ProfileSection 
          userInfo={userInfo} 
          setUserInfo={setUserInfo} 
          setError={setError} 
        />

        {/* User Course Details Accordion */}
        <Box sx={{ mb: 3 }}>
          <UserCourseDetails />
        </Box>

        {/* Button Stack */}
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

        {/* Confirmation Dialog */}
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
      </Box>
    </AuthWrapper>
  );
}
