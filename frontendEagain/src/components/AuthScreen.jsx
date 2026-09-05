import React, { useState } from 'react';
import { Shield, HardDrive, User, LogIn } from 'lucide-react';

export default function AuthScreen({ onGoogleAuth, userNameInput, setUserNameInput, error }) {
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-icon-badge">
          <Shield size={32} />
        </div>

        <div>
          <h1 className="auth-title">DrivePool Aggregator</h1>
          <p className="auth-subtitle">
            Pool and manage multi-account Google Drive storage in collaborative private rooms.
          </p>
        </div>

        {/* Auth Mode Toggle */}
        <div style={{ display: 'flex', width: '100%', gap: '8px', background: 'var(--bg-rail)', padding: '4px', borderRadius: '8px' }}>
          <button
            className="btn"
            style={{
              flex: 1,
              padding: '6px',
              fontSize: '0.85rem',
              backgroundColor: authMode === 'login' ? 'var(--accent-blurple)' : 'transparent',
              color: '#ffffff'
            }}
            onClick={() => setAuthMode('login')}
          >
            Sign In
          </button>
          <button
            className="btn"
            style={{
              flex: 1,
              padding: '6px',
              fontSize: '0.85rem',
              backgroundColor: authMode === 'signup' ? 'var(--accent-blurple)' : 'transparent',
              color: '#ffffff'
            }}
            onClick={() => setAuthMode('signup')}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: 'rgba(242, 63, 67, 0.15)', color: 'var(--accent-red)', fontSize: '0.85rem', width: '100%' }}>
            {error}
          </div>
        )}

        {authMode === 'signup' && (
          <div style={{ width: '100%', textAlign: 'left' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Display Name</label>
            <input
              type="text"
              placeholder="Your Name"
              value={userNameInput}
              onChange={(e) => setUserNameInput(e.target.value)}
              style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-rail)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-normal)' }}
            />
          </div>
        )}

        <button 
          className="google-auth-btn" 
          onClick={() => onGoogleAuth(authMode)}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.41-1.57-5.13-3.72L.97 13.04C2.45 15.98 5.48 18 9 18z"/>
            <path fill="#FBBC05" d="M3.87 10.8c-.18-.53-.28-1.1-.28-1.8s.1-1.27.28-1.8L.97 4.96C.35 6.18 0 7.55 0 9s.35 2.82.97 4.04l2.9-2.24z"/>
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.45 2.02.97 4.96l2.9 2.24C4.59 5.05 6.62 3.58 9 3.58z"/>
          </svg>
          <span>Continue with Google ({authMode === 'login' ? 'Sign In' : 'Sign Up'})</span>
        </button>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          By continuing, you grant drive.file scope to pool and aggregate your storage inside private rooms.
        </p>
      </div>
    </div>
  );
}
