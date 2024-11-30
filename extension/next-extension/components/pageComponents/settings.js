import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import { supportEmail } from "../Menu";

export default function Settings() {
  const [userName, setUserName] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local" && changes.userInfo) {
      checkUserInfo();
    }
  });

  useEffect(() => {
    checkUserInfo();
  }, []);

  const checkUserInfo = async () => {
    try {
      const data = await chrome.storage.local.get("userInfo");
      const userInfo = data.userInfo;
      setIsLoggedIn(userInfo?.name);
      if (userInfo?.name) {
        setUserName(userInfo.name);
      } else {
        setUserName(null);
      }
    } catch (error) {
      console.error("Error checking user info:", error);
    }
  };

  const handleSignIn = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const errorMsg = await chrome.runtime.sendMessage("signIn");
      setIsLoggedIn(!errorMsg);
      if (errorMsg) setError(errorMsg);
      else setError(null);
    } catch (error) {
      setError(
        `Unknown error occurred while signing in. Please try again or contact ${supportEmail} for support.`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await chrome.runtime.sendMessage("signOut");
      setIsLoggedIn(false);
      setUserName(null);
      setError(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const errorMessage = await chrome.runtime.sendMessage("deleteAccount");
      setIsLoggedIn(false);
      setUserName(null);
      if (errorMessage) setError(errorMessage);
      else setError(null);
    } catch (error) {
      console.error("Error deleting account:", error);
      setError(
        `Unknown error occurred while deleting account. Please try again or contact ${supportEmail} for support.`,
      );
    }
  };

  return (
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
            <Button variant="contained" color="primary" onClick={handleSignOut}>
              Sign Out
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteAccount}
            >
              Delete My Account
            </Button>
          </>
        )}
        <Typography sx={{ color: "error.main" }}>{error}</Typography>
      </Stack>
    </Box>
  );
}
