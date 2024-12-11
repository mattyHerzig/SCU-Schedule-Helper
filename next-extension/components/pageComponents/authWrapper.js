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

    checkAuthStatus();
    const authListener = (changes, namespace) => {
      if (changes.accessToken) {
        checkAuthStatus();
      }
    };

    chrome.storage.onChanged.addListener(authListener);
    return () => {
      chrome.storage.onChanged.removeListener(authListener);
    };
  }, []);

  const checkAuthStatus = async () => {
    setIsCheckingAuth(true);
    try {
      // Retrieve user info from chrome storage
      const accessToken = (await chrome.storage.sync.get("accessToken"))
        .accessToken;
      // Set logged-in state based on whether user info exists
      setIsLoggedIn(accessToken);
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
            sx={{
              backgroundColor: "#802a25", 
              color: "white", 
              "&:hover": {
                backgroundColor: "#671f1a", 
              },
            }}
          >
            {isLoggingIn ? "Logging in..." : "Sign In with Google"}
          </Button>
        {error && (
          <Typography sx={{ color: "error.main", mt: 2 }}>{error}</Typography>
        )}
      </Box>
    );
  }

  return <>{children}</>;
};

export default AuthWrapper;
