import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import AuthButton from '../AuthButton';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';

export default function Settings() {
  const [userName, setUserName] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Load user info when component mounts
    checkUserInfo();

    // Listen for auth status changes
    window.addEventListener('auth-status-changed', handleAuthStatusChange);
    return () => {
      window.removeEventListener('auth-status-changed', handleAuthStatusChange);
    };
  }, []);

  // Handle custom event to check user info when auth status changes
  const handleAuthStatusChange = async (event) => {
    if (event.detail.isLoggedIn) {
      await checkUserInfo();
    }
  };

  // Save user info to chrome.storage.sync
  const saveUserInfo = async (accessToken, userInfo) => {
    try {
      await chrome.storage.sync.set({ accessToken, userInfo });
      console.log('User info saved:', { accessToken, userInfo });
    } catch (error) {
      console.error('Error saving user info:', error);
    }
  };

  // Check user info from chrome.storage.sync
  const checkUserInfo = async () => {
    try {
      const { accessToken, userInfo } = await chrome.storage.sync.get(['accessToken', 'userInfo']);
      setIsLoggedIn(!!accessToken);
      if (userInfo) {
        setUserName(userInfo.name || userInfo.email);
      } else {
        console.warn('User info is missing in storage');
        setUserName("Guest");
      }
    } catch (error) {
      console.error('Error checking user info:', error);
    }
  };

  // Handle sign out action
  const handleSignOut = async () => {
    try {
      await chrome.storage.sync.remove(['accessToken', 'userInfo']);
      setIsLoggedIn(false);
      setUserName(null);
      window.dispatchEvent(new CustomEvent('auth-status-changed', { detail: { isLoggedIn: false } }));
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Handle delete history action
  const handleDeleteHistory = async () => {
    try {
      console.log('Deleting history...');
    } catch (error) {
      console.error('Error deleting history:', error);
    }
  };

  // Handle delete account action
  const handleDeleteAccount = async () => {
    try {
      console.log('Deleting account...');
      await handleSignOut();
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  return (
    <Box sx={{ width: 450, height: 600, overflow: 'auto' }}>
      <Typography variant='h6'>Settings</Typography>
      <Typography sx={{ mb: 2 }}>
        Logged in as: {userName || "Guest"}
      </Typography>
      <Stack spacing={2} sx={{ mt: 1 }}>
        <AuthButton />
        {isLoggedIn && (
          <>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleDeleteHistory}
            >
              Delete Course History
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
        <FormControlLabel required control={<Switch />} label="Enable data sharing" />
      </Stack>
    </Box>
  );
}