import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterInputSchema, type RegisterInput } from '@unitrack/contracts';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Lock, Globe, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

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
      setErrorMessage(err.message || 'Registration failed. Please check your details.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center pb-2 border-b border-[#EFECE1]">
        <h2 className="font-serif-chronicle text-2xl sm:text-3xl font-medium text-[#171614] tracking-tight">
          Begin Your Chronicle
        </h2>
        <p className="text-xs text-[#74726A] mt-1 font-mono-tabular">
          Initialize your universal personal workspace
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-[#FAF0ED] border border-[#F0D5CC] text-[#A33F17] text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#A33F17]" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-lg bg-[#EFF6F2] border border-[#D5E5DC] text-[#2C4839] text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-[#2C4839]" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-[11px] font-mono-tabular uppercase tracking-wider text-[#74726A] mb-1.5">
            Full Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A8A69E]">
              <User className="w-4 h-4" />
            </div>
            <input
              {...register('displayName')}
              type="text"
              placeholder="Aisha Karimova"
              className="w-full pl-10 pr-3.5 py-2.5 bg-[#FFFFFF] border border-[#D8D5C8] rounded-lg text-sm text-[#171614] placeholder-[#A8A69E] focus:outline-none focus:border-[#171614] transition-colors"
            />
          </div>
          {errors.displayName && (
            <p className="text-[#A33F17] text-xs mt-1 font-mono-tabular">{errors.displayName.message}</p>
          )}
        </div>

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
              placeholder="student@example.com"
              className="w-full pl-10 pr-3.5 py-2.5 bg-[#FFFFFF] border border-[#D8D5C8] rounded-lg text-sm text-[#171614] placeholder-[#A8A69E] focus:outline-none focus:border-[#171614] transition-colors"
            />
          </div>
          {errors.email && (
            <p className="text-[#A33F17] text-xs mt-1 font-mono-tabular">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-[11px] font-mono-tabular uppercase tracking-wider text-[#74726A] mb-1.5">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A8A69E]">
              <Lock className="w-4 h-4" />
            </div>
            <input
              {...register('password')}
              type="password"
              placeholder="Min 8 chars, 1 uppercase, 1 digit"
              className="w-full pl-10 pr-3.5 py-2.5 bg-[#FFFFFF] border border-[#D8D5C8] rounded-lg text-sm text-[#171614] placeholder-[#A8A69E] focus:outline-none focus:border-[#171614] transition-colors"
            />
          </div>
          {errors.password && (
            <p className="text-[#A33F17] text-xs mt-1 font-mono-tabular">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label className="block text-[11px] font-mono-tabular uppercase tracking-wider text-[#74726A] mb-1.5">
            Language
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A8A69E]">
              <Globe className="w-4 h-4" />
            </div>
            <select
              {...register('languageCode')}
              className="w-full pl-10 pr-3.5 py-2.5 bg-[#FFFFFF] border border-[#D8D5C8] rounded-lg text-sm text-[#171614] focus:outline-none focus:border-[#171614] transition-colors appearance-none cursor-pointer"
            >
              <option value="en">English (en)</option>
              <option value="uz">O'zbek (uz)</option>
              <option value="ru">Русский (ru)</option>
            </select>
          </div>
          {errors.languageCode && (
            <p className="text-[#A33F17] text-xs mt-1 font-mono-tabular">{errors.languageCode.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 bg-[#171614] hover:bg-[#383733] text-[#FBFBF9] font-medium rounded-lg text-xs tracking-wide transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm active:scale-[0.99] mt-2"
        >
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-[#FBFBF9]/30 border-t-[#FBFBF9] rounded-full animate-spin" />
              Inscribing Account...
            </span>
          ) : (
            <>
              <span>Complete Registration</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>

      <div className="text-center text-xs text-[#74726A]">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-[#171614] font-semibold hover:underline cursor-pointer"
        >
          Sign in
        </button>
      </div>
    </div>
  );
}
