import React, { useState } from 'react';
import { HardDrive, RefreshCw } from 'lucide-react';

export default function AuthScreen({ onGoogleAuth, userNameInput, setUserNameInput, error, isAuthenticating }) {
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'

  return (
    <div className="auth-screen-wrapper">
      <div className="auth-card-panel">
        {/* Brand Logo Badge */}
        <div className="auth-logo-badge">
          <HardDrive size={32} />
        </div>

        <div>
          <h1 className="auth-title">RoomVault</h1>
          <p className="auth-subtitle">
            Collaborative Google Drive storage pooling in secure, room-based workspaces.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="modal-tabs" style={{ width: '100%' }}>
          <button
            className={`modal-tab ${authMode === 'login' ? 'active' : ''}`}
            onClick={() => setAuthMode('login')}
            disabled={isAuthenticating}
          >
            Sign In
          </button>
          <button
            className={`modal-tab ${authMode === 'signup' ? 'active' : ''}`}
            onClick={() => setAuthMode('signup')}
            disabled={isAuthenticating}
          >
            Sign Up
          </button>
        </div>

        {isAuthenticating && (
          <div className="auth-progress-track">
            <div className="auth-progress-fill" />
          </div>
        )}

        {error && (
          <div className="form-error-banner">
            {error}
          </div>
        )}

        {authMode === 'signup' && (
          <div className="form-group" style={{ width: '100%', textAlign: 'left' }}>
            <label className="form-label">Display Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Mukesh"
              value={userNameInput}
              onChange={(e) => setUserNameInput(e.target.value)}
              disabled={isAuthenticating}
            />
          </div>
        )}

        {/* Google OAuth Button */}
        <button
          className={`auth-google-btn ${isAuthenticating ? 'authenticating' : ''}`}
          onClick={() => onGoogleAuth(authMode)}
          disabled={isAuthenticating}
        >
          {isAuthenticating ? (
            <>
              <RefreshCw className="animate-spin" size={18} color="var(--emerald-primary)" />
              <span>Verifying Google Authorization...</span>
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.41-1.57-5.13-3.72L.97 13.04C2.45 15.98 5.48 18 9 18z"/>
                <path fill="#FBBC05" d="M3.87 10.8c-.18-.53-.28-1.1-.28-1.8s.1-1.27.28-1.8L.97 4.96C.35 6.18 0 7.55 0 9s.35 2.82.97 4.04l2.9-2.24z"/>
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.45 2.02.97 4.96l2.9 2.24C4.59 5.05 6.62 3.58 9 3.58z"/>
              </svg>
              <span>Continue with Google ({authMode === 'login' ? 'Sign In' : 'Sign Up'})</span>
            </>
          )}
        </button>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
          {isAuthenticating
            ? 'Communicating with Google OAuth and verifying tokens with server...'
            : 'Connect your Google account to manage shared room capacity and virtual files.'}
        </p>
      </div>
    </div>
  );
}
