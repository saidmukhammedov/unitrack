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

const SESSION_INDICATOR_KEY = 'unitrack_has_session';

function getHasPriorSession(): boolean {
  try {
    return typeof window !== 'undefined' && localStorage.getItem(SESSION_INDICATOR_KEY) === '1';
  } catch {
    return false;
  }
}

function setSessionActive(active: boolean) {
  try {
    if (active) {
      localStorage.setItem(SESSION_INDICATOR_KEY, '1');
    } else {
      localStorage.removeItem(SESSION_INDICATOR_KEY);
    }
  } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const hasPriorSession = getHasPriorSession();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(hasPriorSession);

  // Attempt initial session restore via silent refresh ONLY if a session previously existed
  useEffect(() => {
    if (!hasPriorSession) {
      // First-time or logged-out visitor: immediately render without blocking
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    async function restoreSession() {
      try {
        // Enforce a strict 3000ms timeout so a sleeping/cold backend never blocks the user indefinitely
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('SESSION_RESTORE_TIMEOUT')), 3000)
        );
        const profile = await Promise.race([api.getMe(), timeoutPromise]);
        if (isMounted) {
          setUser(profile);
          setSessionActive(true);
        }
      } catch {
        if (isMounted) {
          setUser(null);
          setSessionActive(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, [hasPriorSession]);

  const login = async (input: LoginInput) => {
    const res = await api.login(input);
    setSessionActive(true);
    setUser(res.user);
  };

  const register = async (input: RegisterInput) => {
    await api.register(input);
    try {
      const loginRes = await api.login({
        email: input.email,
        password: input.password,
      });
      setSessionActive(true);
      setUser(loginRes.user);
      return 'Welcome to UniTrack! Account created successfully.';
    } catch {
      return 'Account created successfully. Please sign in.';
    }
  };

  const googleAuth = async (input: GoogleAuthInput) => {
    const res = await api.googleAuth(input);
    setSessionActive(true);
    setUser(res.user);
  };

  const logout = async () => {
    setSessionActive(false);
    try {
      await api.logout();
    } catch {}
    setUser(null);
  };

  const refreshProfile = async () => {
    try {
      const profile = await api.getMe();
      setUser(profile);
      setSessionActive(true);
    } catch {
      setUser(null);
      setSessionActive(false);
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
