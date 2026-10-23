import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterInputSchema, type RegisterInput } from '@unitrack/contracts';
import { useAuth } from '../../context/AuthContext';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const { register: registerUser } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterInputSchema),
    defaultValues: {
      languageCode: 'en',
    },
  });

  const onSubmit = async (data: RegisterInput) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const msg = await registerUser(data);
      setSuccessMessage(msg);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto', padding: '1.5rem', border: '1px solid #ddd', borderRadius: 8 }}>
      <h2>Create UniTrack Account</h2>
      {errorMessage && (
        <div style={{ color: 'red', marginBottom: '1rem', padding: '0.5rem', background: '#ffebee', borderRadius: 4 }}>
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div style={{ color: 'green', marginBottom: '1rem', padding: '0.5rem', background: '#e8f5e9', borderRadius: 4 }}>
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Display Name</label>
          <input
            {...register('displayName')}
            placeholder="Aisha Karimova"
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
          {errors.displayName && <span style={{ color: 'red', fontSize: 12 }}>{errors.displayName.message}</span>}
        </div>

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
            placeholder="Min 8 chars, 1 uppercase, 1 digit"
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
          {errors.password && <span style={{ color: 'red', fontSize: 12 }}>{errors.password.message}</span>}
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Language</label>
          <select {...register('languageCode')} style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}>
            <option value="en">English (en)</option>
            <option value="uz">O'zbek (uz)</option>
            <option value="ru">Русский (ru)</option>
          </select>
          {errors.languageCode && <span style={{ color: 'red', fontSize: 12 }}>{errors.languageCode.message}</span>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{ width: '100%', padding: '0.75rem', background: '#0066cc', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          {isSubmitting ? 'Registering...' : 'Register'}
        </button>
      </form>

      <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: 14 }}>
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          style={{ background: 'none', border: 'none', color: '#0066cc', cursor: 'pointer', padding: 0 }}
        >
          Sign In
        </button>
      </div>
    </div>
  );
}
