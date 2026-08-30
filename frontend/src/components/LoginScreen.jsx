import React from 'react';
import { HardDrive, AlertCircle } from 'lucide-react';

export default function LoginScreen({ onLogin, loading, error }) {
  return (
    <div className="login-container">
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
          onClick={() => onLogin()}
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
    </div>
  );
}
