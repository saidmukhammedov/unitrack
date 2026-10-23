import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';
import type {
  UserProfile,
  LoginInput,
  RegisterInput,
  GoogleAuthInput,
} from '@unitrack/contracts';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<string>;
  googleAuth: (input: GoogleAuthInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Attempt initial session restore via silent refresh
  useEffect(() => {
    async function restoreSession() {
      try {
        const profile = await api.getMe();
        setUser(profile);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  const login = async (input: LoginInput) => {
    const res = await api.login(input);
    setUser(res.user);
  };

  const register = async (input: RegisterInput) => {
    const res = await api.register(input);
    return res.message;
  };

  const googleAuth = async (input: GoogleAuthInput) => {
    const res = await api.googleAuth(input);
    setUser(res.user);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  const refreshProfile = async () => {
    try {
      const profile = await api.getMe();
      setUser(profile);
    } catch {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        googleAuth,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
