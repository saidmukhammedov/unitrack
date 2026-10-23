import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginInputSchema, type LoginInput } from '@unitrack/contracts';
import { useAuth } from '../../context/AuthContext';

interface LoginFormProps {
  onSwitchToRegister: () => void;
  onSwitchToForgotPassword: () => void;
}

export function LoginForm({ onSwitchToRegister, onSwitchToForgotPassword }: LoginFormProps) {
  const { login, googleAuth } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginInputSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setErrorMessage(null);
    try {
      await login(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed');
    }
  };

  const handleGoogleMockLogin = async () => {
    setErrorMessage(null);
    try {
      // For web demonstration/dev client
      await googleAuth({ idToken: 'valid-google-id-token' });
    } catch (err: any) {
      setErrorMessage(err.message || 'Google sign-in failed');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto', padding: '1.5rem', border: '1px solid #ddd', borderRadius: 8 }}>
      <h2>Sign In to UniTrack</h2>
      {errorMessage && (
        <div style={{ color: 'red', marginBottom: '1rem', padding: '0.5rem', background: '#ffebee', borderRadius: 4 }}>
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Email</label>
          <input
            {...register('email')}
            type="email"
            placeholder="student@example.com"
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
          {errors.email && <span style={{ color: 'red', fontSize: 12 }}>{errors.email.message}</span>}
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Password</label>
          <input
            {...register('password')}
            type="password"
            placeholder="••••••••"
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
          {errors.password && <span style={{ color: 'red', fontSize: 12 }}>{errors.password.message}</span>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{ width: '100%', padding: '0.75rem', background: '#0066cc', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div style={{ margin: '1.5rem 0', textAlign: 'center', color: '#888' }}>or</div>

      <button
        onClick={handleGoogleMockLogin}
        type="button"
        style={{ width: '100%', padding: '0.75rem', background: '#fff', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        <span>Sign in with Google</span>
      </button>

      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
        <button
          type="button"
          onClick={onSwitchToForgotPassword}
          style={{ background: 'none', border: 'none', color: '#0066cc', cursor: 'pointer', padding: 0 }}
        >
          Forgot Password?
        </button>
        <button
          type="button"
          onClick={onSwitchToRegister}
          style={{ background: 'none', border: 'none', color: '#0066cc', cursor: 'pointer', padding: 0 }}
        >
          Create Account
        </button>
      </div>
    </div>
  );
}
