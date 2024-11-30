import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

const AuthWrapper = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication status when component mounts
    const checkAuthStatus = async () => {
      try {
        // Retrieve user info from chrome storage
        const { userInfo } = await chrome.storage.local.get("userInfo");

        // Set logged-in state based on whether user info exists
        setIsLoggedIn(!!userInfo?.name);
        setIsLoading(false);
      } catch (error) {
        console.error("Error checking auth status:", error);
        setIsLoading(false);
      }
    };

    // Check initial auth status
    checkAuthStatus();

    // Listen for auth status changes
    const authListener = (changes, namespace) => {
      if (namespace === "local" && changes.userInfo) {
        const isLoggedIn = !!changes.userInfo.newValue?.name;
        setIsLoggedIn(isLoggedIn);
      }
    };

    chrome.storage.onChanged.addListener(authListener);

    // Cleanup listener
    return () => {
      chrome.storage.onChanged.removeListener(authListener);
    };
  }, []);

  const handleSignIn = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      // Use service worker's sign-in function
      const response = await chrome.runtime.sendMessage("signIn");

      if (response) {
        // Sign-in successful, state will be updated by listener
        setIsLoading(false);
      } else {
        console.error("Login failed");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Auth error:", error);
      setIsLoading(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Typography variant="body1">Loading...</Typography>
      </Box>
    );
  }

  // If not logged in, show sign-in prompt
  if (!isLoggedIn) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          p: 2,
          textAlign: "center",
        }}
      >
        {/* <Typography variant="h6" sx={{ mb: 2 }}>
          Welcome to the App
        </Typography> */}
        <Typography variant="body1" sx={{ mb: 3 }}>
          You must be signed in to access this feature.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSignIn}
          disabled={isLoading}
        >
          {isLoading ? "Logging in..." : "Sign In with Google"}
        </Button>
      </Box>
    );
  }

  // If logged in, render children (main app content)
  return <>{children}</>;
};

export default AuthWrapper;
