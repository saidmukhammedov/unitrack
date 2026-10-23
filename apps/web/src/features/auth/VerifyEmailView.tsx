import React, { useState } from 'react';
import { api } from '../../lib/api';

interface VerifyEmailViewProps {
  initialToken?: string;
  onDone: () => void;
}

export function VerifyEmailView({ initialToken = '', onDone }: VerifyEmailViewProps) {
  const [token, setToken] = useState(initialToken);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token) return;

    setStatus('loading');
    setMessage('');
    try {
      const res = await api.verifyEmail({ token });
      setStatus('success');
      setMessage(res.message);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Verification failed');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto', padding: '1.5rem', border: '1px solid #ddd', borderRadius: 8 }}>
      <h2>Verify Email</h2>
      <p style={{ color: '#666', fontSize: 14 }}>
        Paste the verification token from your email link below to activate your account.
      </p>

      {status === 'error' && (
        <div style={{ color: 'red', marginBottom: '1rem', padding: '0.5rem', background: '#ffebee', borderRadius: 4 }}>
          {message}
        </div>
      )}

      {status === 'success' ? (
        <div>
          <div style={{ color: 'green', marginBottom: '1rem', padding: '0.5rem', background: '#e8f5e9', borderRadius: 4 }}>
            {message}
          </div>
          <button
            type="button"
            onClick={onDone}
            style={{ width: '100%', padding: '0.75rem', background: '#0066cc', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            Go to Login
          </button>
        </div>
      ) : (
        <form onSubmit={handleVerify}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Verification Token</label>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste verification token here"
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            style={{ width: '100%', padding: '0.75rem', background: '#0066cc', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            {status === 'loading' ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>
      )}
    </div>
  );
}
