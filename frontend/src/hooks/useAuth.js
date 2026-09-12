import { useState, useEffect, useCallback } from 'react';
import { BACKEND_URL, GOOGLE_CLIENT_ID } from '../utils/constants';

export function useAuth(showToast, clearToast, resetAllModals) {
  const [appJwt, setAppJwt] = useState(() => localStorage.getItem('app_jwt') || null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userNameInput, setUserNameInput] = useState('');
  const [error, setError] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleLogout = useCallback(() => {
    localStorage.clear();
    sessionStorage.clear();
    setAppJwt(null);
    setCurrentUser(null);
    setUserNameInput('');
    setError(null);
    setIsAuthenticating(false);
    if (clearToast) clearToast();
    if (resetAllModals) resetAllModals();
  }, [clearToast, resetAllModals]);

  // Fetch Current User Profile
  const fetchMyProfile = useCallback(async () => {
    if (!appJwt) return;
    try {
      const res = await fetch(`${BACKEND_URL}/users/me`, {
        headers: { Authorization: `Bearer ${appJwt}` }
      });
      if (res.ok) {
        const user = await res.json();
        setCurrentUser(user);
      } else {
        handleLogout();
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  }, [appJwt, handleLogout]);

  // Initial load profile trigger
  useEffect(() => {
    if (appJwt) {
      fetchMyProfile();
    }
  }, [appJwt, fetchMyProfile]);

  // Handle Google OAuth Sign In / Sign Up Code Exchange
  const handleGoogleAuth = (mode) => {
    setError(null);
    setIsAuthenticating(true);

    if (!window.google || !window.google.accounts) {
      setTimeout(() => {
        if (window.google && window.google.accounts) {
          handleGoogleAuth(mode);
        } else {
          setError('Google Identity Services SDK is still loading. Please check your internet connection or refresh the page.');
          setIsAuthenticating(false);
        }
      }, 300);
      return;
    }

    if (!window.google.accounts.oauth2) {
      setError('Google OAuth2 client failed to initialize.');
      setIsAuthenticating(false);
      return;
    }

    const authScope = mode === 'signup'
      ? 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/drive.file'
      : 'https://www.googleapis.com/auth/userinfo.email';

    const codeClient = window.google.accounts.oauth2.initCodeClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: authScope,
      ux_mode: 'popup',
      callback: async (response) => {
        if (response.error) {
          setError(`Google Auth Error: ${response.error_description || response.error}`);
          setIsAuthenticating(false);
          return;
        }

        if (response.code) {
          try {
            const endpoint = mode === 'signup' ? '/auth/signup' : '/auth/login';
            const bodyPayload = mode === 'signup'
              ? { code: response.code, name: userNameInput }
              : { code: response.code };

            const res = await fetch(`${BACKEND_URL}${endpoint}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(bodyPayload)
            });

            const data = await res.json();
            if (res.ok) {
              localStorage.setItem('app_jwt', data.access_token);
              setAppJwt(data.access_token);
              setCurrentUser(data.user);
              if (showToast) {
                showToast(mode === 'signup' ? `Welcome ${data.user.name}!` : `Welcome back, ${data.user.name}!`);
              }
            } else {
              setError(data.detail || (mode === 'signup' ? 'Sign up failed' : 'Login failed'));
            }
          } catch (err) {
            setError(`Server connection error during ${mode === 'signup' ? 'sign up' : 'login'}`);
          } finally {
            setIsAuthenticating(false);
          }
        } else {
          setIsAuthenticating(false);
        }
      }
    });
    codeClient.requestCode();
  };

  return {
    appJwt,
    currentUser,
    userNameInput,
    setUserNameInput,
    error,
    setError,
    isAuthenticating,
    handleGoogleAuth,
    handleLogout,
    fetchMyProfile
  };
}
