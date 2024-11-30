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
      const response = await chrome.runtime.sendMessage("signIn");
      
      if (response) {
        await checkUserInfo();
      } else {
        console.error("Login failed");
      }
    } catch (error) {
      console.error("Auth error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const response = await chrome.runtime.sendMessage("signOut");
      
      if (response) {
        setIsLoggedIn(false);
        setUserName(null);
      } else {
        console.error("Sign out failed");
      }
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const deleteAccount = async () => {
    try {
      const response = await chrome.runtime.sendMessage("deleteAccount");
      
      if (response) {
        setIsLoggedIn(false);
        setUserName(null);
      } else {
        console.error("Account deletion failed");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
    }
  };

  return (
    <AuthWrapper>
      <Box sx={{overflow: "auto" }}>
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
              <Button variant="contained" color="primary" onClick={signOut}>
                Sign Out
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={deleteAccount}
              >
                Delete My Account
              </Button>
            </>
          )}
        </Stack>
      </Box>
    </AuthWrapper>
  );
}
