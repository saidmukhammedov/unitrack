import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { syncEngine } from './lib/api';
import type { SyncState } from '@unitrack/api-client';
import { LoginForm } from './features/auth/LoginForm';
import { RegisterForm } from './features/auth/RegisterForm';
import { PasswordRecovery } from './features/auth/ForgotPasswordForm';
import { TodayView } from './features/today/TodayView';
import { WeeklyReviewView } from './features/reviews/WeeklyReviewView';
import { GoalsView } from './features/goals/GoalsView';
import { HabitsView } from './features/habits/HabitsView';
import { AcademicHubView } from './features/academic/AcademicHubView';
import { SettingsView } from './features/settings/SettingsView';
import {
  Compass,
  CalendarCheck,
  Target,
  Flame,
  GraduationCap,
  Settings,
  LogOut,
  Sparkles,
} from 'lucide-react';

type AppTab = 'today' | 'review' | 'goals' | 'habits' | 'academic' | 'settings';
type UnauthView = 'login' | 'register' | 'forgot-password';

const NAV_ITEMS: { key: AppTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'today', label: 'Today', icon: Compass },
  { key: 'review', label: 'Plan & Review', icon: CalendarCheck },
  { key: 'goals', label: 'Goals', icon: Target },
  { key: 'habits', label: 'Habits', icon: Flame },
  { key: 'academic', label: 'Academic Hub', icon: GraduationCap },
];

function MainApp() {
  const { user, isLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AppTab>('today');
  const [unauthView, setUnauthView] = useState<UnauthView>('login');
  const [syncState, setSyncState] = useState<SyncState>(() => syncEngine.getState());

  useEffect(() => {
    return syncEngine.subscribe(setSyncState);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 animate-pulse">
          <Sparkles className="w-6 h-6" />
        </div>
        <p className="font-serif-chronicle italic text-slate-400 text-sm tracking-wide">
          Loading UniTrack Chronicle...
        </p>
      </div>
    );
  }

  // Authenticated Universal Productivity Application
  if (user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        {/* Navigation Bar */}
        <nav className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Brand Logo & Main Nav */}
              <div className="flex items-center gap-8">
                <div
                  onClick={() => setActiveTab('today')}
                  className="flex items-center gap-2.5 cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-serif-chronicle text-lg font-bold text-white tracking-tight leading-none group-hover:text-indigo-400 transition-colors">
                      UniTrack
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-0.5 font-mono-tabular">
                      The Chronicle
                    </span>
                  </div>
                </div>

                {/* Desktop Navigation Links */}
                <div className="hidden md:flex items-center gap-1">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => setActiveTab(item.key)}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* User Profile & Actions */}
              <div className="flex items-center gap-3">
                {/* Offline / Sync State indicator */}
                <button
                  onClick={() => syncEngine.sync().catch(() => {})}
                  disabled={syncState.isSyncing}
                  className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono-tabular border transition-all cursor-pointer ${
                    !syncState.isOnline
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : syncState.isSyncing
                        ? 'bg-sky-500/10 border-sky-500/30 text-sky-400 animate-pulse'
                        : syncState.pendingCount > 0
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  }`}
                  title={!syncState.isOnline ? 'Offline - Click to sync when reconnected' : 'Click to sync now'}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      !syncState.isOnline
                        ? 'bg-amber-400'
                        : syncState.isSyncing
                          ? 'bg-sky-400 animate-ping'
                          : syncState.pendingCount > 0
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                    }`}
                  />
                  <span>
                    {!syncState.isOnline
                      ? `Offline (${syncState.pendingCount})`
                      : syncState.isSyncing
                        ? 'Syncing...'
                        : syncState.pendingCount > 0
                          ? `Pending (${syncState.pendingCount})`
                          : 'Synced'}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('settings')}
                  className={`p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer ${
                    activeTab === 'settings' ? 'bg-slate-800 text-white' : ''
                  }`}
                  title="Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>

                <div className="h-5 w-[1px] bg-slate-800" />

                <div className="flex items-center gap-2.5 pl-1">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName || user.email}
                      className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-xs font-mono-tabular">
                      {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-semibold text-slate-200 leading-tight">
                      {user.displayName || user.email}
                    </span>
                    <span className="text-[10px] text-slate-400 leading-tight">
                      {user.email}
                    </span>
                  </div>

                  <button
                    onClick={logout}
                    className="ml-2 p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile / Tablet Horizontal Navigation */}
            <div className="md:hidden flex items-center gap-1 overflow-x-auto pb-2.5 pt-1 scrollbar-none">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveTab(item.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Tab Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'today' && (
            <TodayView onNavigateToAcademic={(tab) => setActiveTab('academic')} />
          )}
          {activeTab === 'review' && <WeeklyReviewView />}
          {activeTab === 'goals' && <GoalsView />}
          {activeTab === 'habits' && <HabitsView />}
          {activeTab === 'academic' && <AcademicHubView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>
    );
  }

  // Public unauthenticated routes
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-indigo-500/15 via-violet-500/5 to-transparent blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md w-full mx-auto mb-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-4">
          <Compass className="w-4 h-4" />
          <span>Universal Personal Productivity</span>
        </div>
        <h1 className="font-serif-chronicle text-3xl sm:text-4xl font-normal text-white tracking-tight">
          Turn Intentions Into Reality
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          The Chronicle: deliberate planning, commitments, daily habits, and reflections in one place.
        </p>
      </div>

      <div className="relative z-10">
        {unauthView === 'login' && (
          <LoginForm
            onSwitchToRegister={() => setUnauthView('register')}
            onSwitchToForgotPassword={() => setUnauthView('forgot-password')}
          />
        )}

        {unauthView === 'register' && (
          <RegisterForm onSwitchToLogin={() => setUnauthView('login')} />
        )}

        {unauthView === 'forgot-password' && (
          <PasswordRecovery onBackToLogin={() => setUnauthView('login')} />
        )}
      </div>

      <div className="relative z-10 mt-12 text-center text-xs text-slate-500">
        UniTrack — Built for the Person, Not the Institution
      </div>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
