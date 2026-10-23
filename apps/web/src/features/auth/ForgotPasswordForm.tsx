import React, { useState } from 'react';
import { api } from '../../lib/api';

interface PasswordRecoveryProps {
  onBackToLogin: () => void;
}

export function PasswordRecovery({ onBackToLogin }: PasswordRecoveryProps) {
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await api.forgotPassword({ email });
      setMessage(res.message);
      setStep('reset');
    } catch (err: any) {
      setErrorMessage(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePerformReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await api.resetPassword({ token, newPassword });
      setMessage(res.message);
      setTimeout(() => {
        onBackToLogin();
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto', padding: '1.5rem', border: '1px solid #ddd', borderRadius: 8 }}>
      <h2>Password Recovery</h2>
      {errorMessage && (
        <div style={{ color: 'red', marginBottom: '1rem', padding: '0.5rem', background: '#ffebee', borderRadius: 4 }}>
          {errorMessage}
        </div>
      )}
      {message && (
        <div style={{ color: 'green', marginBottom: '1rem', padding: '0.5rem', background: '#e8f5e9', borderRadius: 4 }}>
          {message}
        </div>
      )}

      {step === 'request' ? (
        <form onSubmit={handleRequestReset}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Registered Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '0.75rem', background: '#0066cc', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      ) : (
        <form onSubmit={handlePerformReset}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Reset Token</label>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste token from email"
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: 4 }}>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 chars, 1 uppercase, 1 digit"
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '0.75rem', background: '#0066cc', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            {loading ? 'Resetting...' : 'Set New Password'}
          </button>
        </form>
      )}

      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <button
          type="button"
          onClick={onBackToLogin}
          style={{ background: 'none', border: 'none', color: '#0066cc', cursor: 'pointer' }}
        >
          Back to Sign In
        </button>
      </div>
    </div>
  );
}
