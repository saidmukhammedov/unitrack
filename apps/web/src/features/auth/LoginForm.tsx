import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginInputSchema, type LoginInput } from '@unitrack/contracts';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Mail, Lock, AlertCircle, ArrowRight, BookOpen } from 'lucide-react';

interface LoginFormProps {
  onSwitchToRegister: () => void;
  onSwitchToForgotPassword: () => void;
}

export function LoginForm({ onSwitchToRegister, onSwitchToForgotPassword }: LoginFormProps) {
  const { login, googleAuth } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Proactively ping health endpoint to wake up sleeping backend on Render
  useEffect(() => {
    api.getHealth().catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginInputSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setErrorMessage(null);
    try {
      await login(data);
    } catch (err: any) {
      if (
        err?.name === 'AbortError' ||
        err?.message?.includes('aborted') ||
        err?.code === 'REQUEST_TIMEOUT'
      ) {
        setErrorMessage('The server is taking longer than usual to respond. It may be waking up from sleep. Please try signing in again.');
      } else {
        setErrorMessage(err.message || 'Login failed. Please check your credentials.');
      }
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setIsGoogleLoading(true);
    try {
      await googleAuth({ idToken: 'google-oauth-demo-token' });
    } catch (err: any) {
      setErrorMessage(err.message || 'Google sign-in failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const fillDemoAccount = () => {
    setValue('email', 'student@unitrack.app');
    setValue('password', 'Str0ng!Password123');
  };

  return (
    <div className="space-y-6">
      <div className="text-center pb-2 border-b border-[#EFECE1]">
        <h2 className="font-serif-chronicle text-2xl sm:text-3xl font-medium text-[#171614] tracking-tight">
          Welcome to the Record
        </h2>
        <p className="text-xs text-[#74726A] mt-1 font-mono-tabular">
          Sign in to your personal chronicle
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-[#FAF0ED] border border-[#F0D5CC] text-[#A33F17] text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#A33F17]" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-[11px] font-mono-tabular uppercase tracking-wider text-[#74726A] mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A8A69E]">
              <Mail className="w-4 h-4" />
            </div>
            <input
              {...register('email')}
              type="email"
              placeholder="name@domain.com"
              className="w-full pl-10 pr-3.5 py-2.5 bg-[#FFFFFF] border border-[#D8D5C8] rounded-lg text-sm text-[#171614] placeholder-[#A8A69E] focus:outline-none focus:border-[#171614] transition-colors"
            />
          </div>
          {errors.email && (
            <p className="text-[#A33F17] text-xs mt-1 font-mono-tabular">{errors.email.message}</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[11px] font-mono-tabular uppercase tracking-wider text-[#74726A]">
              Password
            </label>
            <button
              type="button"
              onClick={onSwitchToForgotPassword}
              className="text-xs text-[#74726A] hover:text-[#171614] transition-colors cursor-pointer"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A8A69E]">
              <Lock className="w-4 h-4" />
            </div>
            <input
              {...register('password')}
              type="password"
              placeholder="••••••••"
              className="w-full pl-10 pr-3.5 py-2.5 bg-[#FFFFFF] border border-[#D8D5C8] rounded-lg text-sm text-[#171614] placeholder-[#A8A69E] focus:outline-none focus:border-[#171614] transition-colors"
            />
          </div>
          {errors.password && (
            <p className="text-[#A33F17] text-xs mt-1 font-mono-tabular">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 bg-[#171614] hover:bg-[#383733] text-[#FBFBF9] font-medium rounded-lg text-xs tracking-wide transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm active:scale-[0.99]"
        >
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-[#FBFBF9]/30 border-t-[#FBFBF9] rounded-full animate-spin" />
              Opening Ledger...
            </span>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#E5E3D8]" />
        </div>
        <div className="relative flex justify-center text-[10px] font-mono-tabular uppercase tracking-widest">
          <span className="bg-[#FFFFFF] px-3 text-[#A8A69E]">Or Continue With</span>
        </div>
      </div>

      {/* Google Sign In */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isGoogleLoading}
        className="w-full py-2.5 px-4 bg-[#FFFFFF] hover:bg-[#F4F3ED] border border-[#D8D5C8] hover:border-[#171614] text-[#171614] font-medium rounded-lg text-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>Sign in with Google</span>
      </button>

      {/* Demo Credentials */}
      <div className="pt-3 border-t border-[#EFECE1] flex items-center justify-between text-xs text-[#74726A]">
        <span>Testing or demoing?</span>
        <button
          type="button"
          onClick={fillDemoAccount}
          className="text-[#171614] hover:underline font-medium cursor-pointer"
        >
          Fill Demo Credentials
        </button>
      </div>

      <div className="text-center text-xs text-[#74726A]">
        Don't have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-[#171614] font-semibold hover:underline cursor-pointer"
        >
          Sign up now
        </button>
      </div>
    </div>
  );
}
