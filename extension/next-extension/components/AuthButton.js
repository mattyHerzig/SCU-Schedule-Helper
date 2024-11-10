import { useState, useEffect } from 'react';
import Button from '@mui/material/Button';

export default function AuthButton() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check initial auth state
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check chrome storage for access token
      const { accessToken } = await chrome.storage.sync.get(['accessToken']);
      setIsLoggedIn(!!accessToken);
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  const handleAuth = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const [success, message] = await chrome.runtime.sendMessage('authorize');
      if (success) {
        setIsLoggedIn(true);
        // Notify parent component of login success
        window.dispatchEvent(new CustomEvent('auth-status-changed', { detail: { isLoggedIn: true } }));
      } else {
        console.error('Login failed:', message);
      }
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="contained"
      color="primary"
      onClick={handleAuth}
      disabled={isLoggedIn || isLoading}
    >
      {isLoading ? 'Logging in...' : isLoggedIn ? 'Logged In' : 'Login with Google'}
    </Button>
  );
}
