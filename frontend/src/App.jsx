import React, { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { HardDrive, LogOut, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('roomvault_token') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check existing session on load
  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
    }
  }, [token]);

  const fetchCurrentUser = async (authToken) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // Token invalid or expired
        logout();
      }
    } catch (err) {
      console.error('Session check failed:', err);
    }
  };

  const handleGoogleSuccess = async (tokenResponse) => {
    setLoading(true);
    setError('');

    try {
      const payload = tokenResponse.access_token 
        ? { access_token: tokenResponse.access_token }
        : { code: tokenResponse.code };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      // Save token and user details
      localStorage.setItem('roomvault_token', data.token);
      setToken(data.token);
      setUser(data.user);
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Backend request timed out. Please verify Uvicorn server is running.');
      } else {
        setError(err.message || 'Failed to sign in with Google');
      }
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: (err) => {
      console.error('Google Auth Error:', err);
      setError('Google Sign-In popup was closed or failed.');
    },
  });

  const logout = () => {
    localStorage.removeItem('roomvault_token');
    setToken('');
    setUser(null);
  };

  return (
    <div className="login-container">
      {user ? (
        <div className="user-profile-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {user.picture ? (
              <img src={user.picture} alt={user.name} className="avatar-img" />
            ) : (
              <div
                className="avatar-img"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#1e293b',
                  fontSize: '1.5rem',
                }}
              >
                👤
              </div>
            )}
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{user.name}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{user.email}</p>
              <div className="badge-pill">
                Storage Contributed: {user.storage_contributed ? 'Yes' : 'None (Viewer)'}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: '1.5rem',
              padding: '1rem',
              backgroundColor: 'var(--bg-input)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-green)', fontWeight: 500 }}>
              <ShieldCheck size={18} /> Basic Authentication Active
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              Your email identity is authenticated without Google Drive permissions. Storage contribution can be granted inside rooms.
            </p>
          </div>

          <button className="btn-logout" onClick={logout}>
            <LogOut size={16} style={{ display: 'inline', marginRight: '6px' }} />
            Sign Out
          </button>
        </div>
      ) : (
        <div className="login-card">
          <div className="brand-badge">
            <HardDrive size={16} /> RoomVault Storage Pool
          </div>
          <h1 className="login-title">Welcome to RoomVault</h1>
          <p className="login-subtitle">
            Sign in with your Google account to access shared drive storage rooms.
          </p>

          <button
            className="btn-google-login"
            onClick={() => loginWithGoogle()}
            disabled={loading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#ffffff"
                d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032 s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2 C7.021,2,2.545,6.477,2.545,12s4.476,10,10,10c5.773,0,9.584-4.062,9.584-9.752c0-0.697-0.076-1.371-0.211-2.009H12.545z"
              />
            </svg>
            {loading ? 'Authenticating...' : 'Sign in with Google'}
          </button>

          {error && (
            <div className="error-banner">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                <AlertCircle size={16} /> Authentication Error
              </div>
              <div style={{ marginTop: '0.25rem' }}>{error}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
