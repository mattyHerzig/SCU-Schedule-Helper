import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import AuthButton from '../AuthButton';

export default function Settings() {
  const [userName, setUserName] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkUserInfo();
    window.addEventListener('auth-status-changed', handleAuthStatusChange);
    return () => {
      window.removeEventListener('auth-status-changed', handleAuthStatusChange);
    };
  }, []);

  const handleAuthStatusChange = async (event) => {
    if (event.detail.isLoggedIn) {
      await checkUserInfo();
    }
  };

  const checkUserInfo = async () => {
    try {
      const { accessToken, userInfo } = await chrome.storage.sync.get(['accessToken', 'userInfo']);
      setIsLoggedIn(!!accessToken);
      if (userInfo) {
        setUserName(userInfo.name || userInfo.email);
      }
    } catch (error) {
      console.error('Error checking user info:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await chrome.storage.sync.remove(['accessToken', 'refreshToken', 'userInfo']);
      setIsLoggedIn(false);
      setUserName(null);
      window.dispatchEvent(new CustomEvent('auth-status-changed', { detail: { isLoggedIn: false } }));
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleDeleteHistory = async () => {
    try {
      // Delete history logic
      console.log('Deleting history...');
    } catch (error) {
      console.error('Error deleting history:', error);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      // Delete account logic
      console.log('Deleting account...');
      await handleSignOut();
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  return (
    <Box sx={{width: 450, height: 600, overflow: 'auto'}}>
      <Typography variant='h6'>Settings</Typography>
        <Typography sx={{ mb: 2 }}>
          Logged in as: {userName}
        </Typography>
      <Stack spacing={2} sx={{mt: 1}}>
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
      </Stack>
    </Box>
  );
}