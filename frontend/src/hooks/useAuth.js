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

  // Handle incoming OAuth redirect response (code or error) from URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authCode = params.get('code');
    const authError = params.get('error');
    const authErrorDesc = params.get('error_description');
    const authState = params.get('state');

    if (authError || authCode) {
      // Clean up URL query parameters cleanly without page refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (authError) {
      console.warn('Google Auth error/cancel parameter detected:', authError, authErrorDesc);
      if (authError === 'access_denied' || authError === 'user_cancelled') {
        setError('Google sign-in was canceled.');
      } else {
        setError(authErrorDesc || `Google Authentication failed (${authError}).`);
      }
      setIsAuthenticating(false);
      sessionStorage.removeItem('pending_signup_name');
      return;
    }

    if (authCode) {
      setIsAuthenticating(true);
      const pendingName = sessionStorage.getItem('pending_signup_name') || '';
      const mode = authState === 'signup' || pendingName ? 'signup' : 'login';

      const executeCodeExchange = async () => {
        try {
          const endpoint = mode === 'signup' ? '/auth/signup' : '/auth/login';
          const bodyPayload = {
            code: authCode,
            redirect_uri: window.location.origin,
            ...(mode === 'signup' && pendingName ? { name: pendingName } : {})
          };

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
          sessionStorage.removeItem('pending_signup_name');
        }
      };

      executeCodeExchange();
    }
  }, [showToast]);

  // Handle Google OAuth Sign In / Sign Up Code Exchange
  const handleGoogleAuth = (mode) => {
    setError(null);
    setIsAuthenticating(true);

    if (mode === 'signup' && userNameInput.trim()) {
      sessionStorage.setItem('pending_signup_name', userNameInput.trim());
    }

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

    const redirectUri = window.location.origin;

    const codeClient = window.google.accounts.oauth2.initCodeClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: authScope,
      ux_mode: 'redirect',
      redirect_uri: redirectUri,
      state: mode,
      error_callback: (res) => {
        console.warn('Google OAuth error callback:', res);
        setIsAuthenticating(false);
        if (res.error === 'access_denied' || res.type === 'popup_closed') {
          setError('Google sign-in was canceled.');
        } else {
          setError(`Google Auth Error: ${res.error_description || res.error || 'Authentication canceled'}`);
        }
        sessionStorage.removeItem('pending_signup_name');
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
