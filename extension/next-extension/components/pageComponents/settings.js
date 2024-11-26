import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";

export default function Settings() {
  const [userName, setUserName] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
      // Simulate login response with user info and token
      const errorMsg = await chrome.runtime.sendMessage("signIn");
      setIsLoggedIn(!errorMsg);
      if (errorMsg) {
        console.error("Login failed:", errorMsg);
      }
    } catch (error) {
      console.error("Auth error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await chrome.runtime.sendMessage("signOut");
      setIsLoggedIn(false);
      setUserName(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const errorMessage = await chrome.runtime.sendMessage("deleteAccount");
      setIsLoggedIn(false);
      setUserName(null);
      if (errorMessage) {
        console.error("Error deleting account:", errorMessage);
      }
    } catch (error) {
      console.error("Error deleting account:", error);
    }
  };

  return (
    <Box sx={{ width: 500, height: 600, overflow: "auto" }}>
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
        <FormControlLabel
          required
          control={<Switch />}
          label="Enable data sharing"
        />
      </Stack>
    </Box>
  );
}
