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
  RefreshCw,
  Check,
  Menu,
  X,
} from 'lucide-react';

type AppTab = 'today' | 'review' | 'goals' | 'habits' | 'academic' | 'settings';
type UnauthView = 'login' | 'register' | 'forgot-password';

const NAV_ITEMS: {
  key: AppTab;
  label: string;
  sublabel?: string;
  meta: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: 'today', label: 'Today', meta: 'Daily Rhythm', icon: Compass },
  { key: 'habits', label: 'Cadence', sublabel: 'Habits', meta: 'Habits & Rituals', icon: Flame },
  { key: 'goals', label: 'Horizons', sublabel: 'Goals', meta: 'Strategic Goals', icon: Target },
  { key: 'review', label: 'Retrospective', sublabel: 'Plan & Review', meta: 'Weekly Review', icon: CalendarCheck },
  { key: 'academic', label: 'Scholarship', sublabel: 'Academic Hub', meta: 'Academic Suite', icon: GraduationCap },
];

function MainApp() {
  const { user, isLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AppTab>('today');
  const [unauthView, setUnauthView] = useState<UnauthView>('login');
  const [syncState, setSyncState] = useState<SyncState>(() => syncEngine.getState());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    return syncEngine.subscribe(setSyncState);
  }, []);

  // Format today's date for masthead
  const todayDate = new Date();
  const dayName = todayDate.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDayYear = todayDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FBFBF9] text-[#171614] flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 rounded-full border-2 border-[#171614] border-t-transparent animate-spin" />
        <p className="font-serif-chronicle italic text-[#74726A] text-lg">
          Opening The Chronicle...
        </p>
      </div>
    );
  }

  // Authenticated Editorial Experience
  if (user) {
    return (
      <div className="min-h-screen bg-[#FBFBF9] text-[#171614] flex flex-col antialiased">
        {/* Top Architectural Masthead */}
        <header className="border-b border-[#E5E3D8] bg-[#FBFBF9]/95 backdrop-blur-md sticky top-0 z-40 transition-colors">
          {/* Top metadata dispatch line */}
          <div className="border-b border-[#EFECE1] text-[11px] font-mono-tabular text-[#74726A] py-1.5 px-4 sm:px-8">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-[#171614]">VOL. II</span>
                <span className="text-[#D8D5C8]">/</span>
                <span>{dayName.toUpperCase()}</span>
                <span className="text-[#D8D5C8]">/</span>
                <span>{monthDayYear}</span>
              </div>

              <div className="flex items-center gap-4">
                {/* Quiet Sync Status */}
                <button
                  onClick={() => syncEngine.sync().catch(() => {})}
                  disabled={syncState.isSyncing}
                  className="flex items-center gap-1.5 hover:text-[#171614] transition-colors cursor-pointer"
                  title={!syncState.isOnline ? 'Offline: changes queued' : 'Click to sync'}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      !syncState.isOnline
                        ? 'bg-[#A33F17]'
                        : syncState.isSyncing
                        ? 'bg-[#1E2D42] animate-ping'
                        : syncState.pendingCount > 0
                        ? 'bg-[#A33F17]'
                        : 'bg-[#2C4839]'
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

                <span className="hidden sm:inline text-[#D8D5C8]">|</span>
                <span className="hidden sm:inline">UNIVERSAL PRODUCTIVITY</span>
              </div>
            </div>
          </div>

          {/* Primary Editorial Masthead */}
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between gap-6">
            {/* Logo / Brand Name */}
            <div
              onClick={() => setActiveTab('today')}
              className="flex items-baseline gap-3 cursor-pointer group select-none shrink-0"
            >
              <span className="font-serif-chronicle text-2xl sm:text-3xl font-medium tracking-tight text-[#171614] group-hover:text-[#A33F17] transition-colors">
                The Chronicle
              </span>
              <span className="hidden sm:inline text-[10px] font-mono-tabular uppercase tracking-widest text-[#74726A] border-l border-[#D8D5C8] pl-3 py-0.5">
                UniTrack
              </span>
            </div>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 lg:gap-2">
              {NAV_ITEMS.map((item) => {
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveTab(item.key)}
                    className={`relative px-3 py-1.5 text-xs font-medium tracking-wide transition-colors cursor-pointer flex items-baseline gap-1.5 ${
                      isActive
                        ? 'text-[#171614] font-semibold'
                        : 'text-[#74726A] hover:text-[#171614]'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.sublabel && (
                      <span className="text-[10px] font-mono-tabular opacity-60">
                        ({item.sublabel})
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#171614] rounded-full" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* User Profile & Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setActiveTab('settings')}
                className={`p-2 rounded-lg text-[#74726A] hover:text-[#171614] hover:bg-[#F0EEE6] transition-colors cursor-pointer ${
                  activeTab === 'settings' ? 'bg-[#ECEAE1] text-[#171614]' : ''
                }`}
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>

              <div className="h-4 w-[1px] bg-[#E5E3D8]" />

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#EAE8DE] border border-[#D8D5C8] text-[#171614] flex items-center justify-center font-mono-tabular text-xs font-semibold">
                  {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <span className="hidden lg:inline text-xs font-medium text-[#171614] max-w-[120px] truncate">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                <button
                  onClick={logout}
                  className="p-1.5 text-[#74726A] hover:text-[#A33F17] hover:bg-[#F7EBE6] rounded-md transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile Menu Toggle Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-[#74726A] hover:text-[#171614] rounded-lg hover:bg-[#F0EEE6]"
                aria-label="Toggle Navigation Menu"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Dropdown */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-[#E5E3D8] bg-[#F7F6F0] px-4 py-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setActiveTab(item.key);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-[#171614] text-[#FBFBF9]'
                        : 'text-[#383733] hover:bg-[#ECEAE1]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                      {item.sublabel && (
                        <span className="text-[10px] font-mono-tabular opacity-60">
                          ({item.sublabel})
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono-tabular opacity-60">
                      {item.meta}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </header>

        {/* Main Content Arena */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-10">
          {activeTab === 'today' && (
            <TodayView onNavigateToAcademic={(tab) => setActiveTab('academic')} />
          )}
          {activeTab === 'review' && <WeeklyReviewView />}
          {activeTab === 'goals' && <GoalsView />}
          {activeTab === 'habits' && <HabitsView />}
          {activeTab === 'academic' && <AcademicHubView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>

        {/* Quiet Editorial Colophon */}
        <footer className="border-t border-[#E5E3D8] py-8 text-center text-xs text-[#74726A] font-mono-tabular">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>UniTrack — Built for the Person, Not the Institution</span>
            <span>The Chronicle Edition • {new Date().getFullYear()}</span>
          </div>
        </footer>
      </div>
    );
  }

  // Unauthenticated Layout: The Frontispiece
  return (
    <div className="min-h-screen bg-[#FBFBF9] text-[#171614] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative selection:bg-[#E8E2D5]">
      {/* Editorial Watermark / Header */}
      <div className="max-w-md w-full mx-auto mb-8 text-center">
        <div className="inline-flex items-center gap-2 text-[11px] font-mono-tabular uppercase tracking-widest text-[#74726A] mb-3">
          <span>THE CHRONICLE</span>
          <span>•</span>
          <span>VOLUME II</span>
        </div>
        <h1 className="font-serif-chronicle text-3xl sm:text-4xl font-normal text-[#171614] tracking-tight">
          Turn Intentions Into Reality
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-[#74726A] font-sans-editorial max-w-sm mx-auto leading-relaxed">
          Deliberate daily planning, fixed commitments, cadence rituals, and reflective progress in one unified journal.
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="relative z-10 max-w-md w-full mx-auto">
        <div className="bg-[#FFFFFF] border border-[#E5E3D8] rounded-xl p-8 sm:p-10 shadow-[0_4px_20px_rgba(23,22,20,0.04)]">
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
      </div>

      {/* Footer Colophon */}
      <div className="relative z-10 mt-10 text-center text-[11px] font-mono-tabular text-[#74726A]">
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
