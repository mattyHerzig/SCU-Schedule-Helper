import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import AuthWrapper from "./authWrapper";

export default function Settings() {
  const [userName, setUserName] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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

  const handleSignIn = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const errorMsg = await chrome.runtime.sendMessage("signIn");
      if (!errorMsg) setError(null);
      else setError(errorMsg);
    } catch (error) {
      setError(
        `Unknown error occurred while signing in. Please try again`,
      );
    } finally {
      setIsLoading(false);
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

  return (
    <AuthWrapper>
      <Box sx={{ overflow: "auto" }}>
        <Typography variant="h6">Settings</Typography>
        <Typography sx={{ mb: 2 }}>
          Logged in as: {userName || "Guest"}
        </Typography>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSignIn}
            disabled={isLoggedIn || isLoading}
          >
            {isLoading
              ? "Logging in..."
              : isLoggedIn
                ? "Logged In"
                : "Login with Google"}
          </Button>
          {isLoggedIn && (
            <>
              <Button sx={{backgroundColor: '#703331',
              '&:hover': {
                backgroundColor: '#5a2828',
               }
               }}
                variant="contained"
                onClick={importCourseHistory}
              >
                Import Course History
              </Button>
              <Button sx={{backgroundColor: '#703331',
              '&:hover': {
                backgroundColor: '#5a2828',
               }
               }} 
               variant="contained" onClick={signOut} >
                Sign Out
              </Button>
              <Button variant="contained" color="error" onClick={deleteAccount}>
                Delete My Account
              </Button>
            </>
          )}
        </Stack>
      </Box>
    </AuthWrapper>
  );
}
