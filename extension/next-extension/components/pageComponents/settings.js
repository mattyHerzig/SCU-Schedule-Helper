import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import AuthWrapper from "./authWrapper";

export default function Settings() {
  const [userName, setUserName] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false); // For dialog state

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
      const userInfo = data.userInfo;
      const loggedIn = !!userInfo?.name;
      setIsLoggedIn(loggedIn);
      setUserName(loggedIn ? userInfo.name : null);
    } catch (error) {
      console.error("Error checking user info:", error);
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
      if (errorMessage) setError(errorMessage);
      else setError(null);
    } catch (error) {
      console.error("Error deleting account:", error);
      setError(
        `Unknown error occurred while deleting account. Please try again.`,
      );
    }
  };

  const importCourseHistory = async () => {
    try {
      const errorMessage = await chrome.runtime.sendMessage(
        "importCourseHistory",
      );
      if (errorMessage) setError(errorMessage);
      else setError(null);
    } catch (error) {
      console.error("Error importing course history:", error);
      setError(
        `Unknown error occurred while importing course history. Please try again.`,
      );
    }
  };

  const handleDialogOpen = () => setDialogOpen(true);
  const handleDialogClose = () => setDialogOpen(false);
  const handleConfirmDelete = async () => {
    handleDialogClose();
    await deleteAccount();
  };

  return (
    <AuthWrapper>
      <Box sx={{ overflow: "auto" }}>
        <Typography variant="h6">Settings</Typography>
        <Typography sx={{ mb: 2 }}>
          Logged in as: {userName || "Guest"}
        </Typography>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {isLoggedIn && (
            <>
              <Button
                sx={{
                  backgroundColor: "#703331",
                  "&:hover": {
                    backgroundColor: "#5a2828",
                  },
                }}
                variant="contained"
                onClick={importCourseHistory}
              >
                Import Course History
              </Button>
              <Button
                sx={{
                  backgroundColor: "#703331",
                  "&:hover": {
                    backgroundColor: "#5a2828",
                  },
                }}
                variant="contained"
                onClick={signOut}
              >
                Sign Out
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleDialogOpen} // Open dialog on click
              >
                Delete My Account
              </Button>
              {error && (
                <Typography sx={{ color: "error.main" }}>{error}</Typography>
              )}
            </>
          )}
        </Stack>
      </Box>

      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
      >
        <DialogTitle>Confirm Account Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete your account? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </AuthWrapper>
  );
}
