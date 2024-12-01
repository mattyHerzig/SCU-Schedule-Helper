import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

const AuthWrapper = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check authentication status when component mounts
    checkAuthStatus();

    // Listen for auth status changes
    const authListener = (changes, namespace) => {
      if (namespace === "local" && changes.userInfo) {
        checkAuthStatus();
      }
    };

    chrome.storage.onChanged.addListener(authListener);

    // Cleanup listener
    return () => {
      chrome.storage.onChanged.removeListener(authListener);
    };
  }, []);

  const checkAuthStatus = async () => {
    setIsCheckingAuth(true);
    try {
      // Retrieve user info from chrome storage
      const { userInfo } = await chrome.storage.local.get("userInfo");
      // Set logged-in state based on whether user info exists
      setIsLoggedIn(!!userInfo?.name);
    } catch (error) {
      console.error("Error checking auth status:", error);
    }
    setIsCheckingAuth(false);
  };

  const handleSignIn = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      // Use service worker's sign-in function
      const errorMessage = await chrome.runtime.sendMessage("signIn");
      if (errorMessage) setError(errorMessage);
      else setError(null);
    } catch (error) {
      console.error("Unknown auth error:", error);
      setError("Unknown error occurred while signing in. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isCheckingAuth) {
    return <></>;
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
          p: 2,
          textAlign: "center",
        }}
      >
        <Typography variant="body1" sx={{ mb: 3 }}>
          You must be signed in to access this feature.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSignIn}
          disabled={isLoggingIn}
        >
          {isLoggingIn ? "Logging in..." : "Sign In with Google"}
        </Button>
        {error && (
          <Typography sx={{ color: "error.main", mt: 2 }}>{error}</Typography>
        )}
      </Box>
    );
  }

  // If logged in, render children (main app content)
  return <>{children}</>;
};

export default AuthWrapper;
