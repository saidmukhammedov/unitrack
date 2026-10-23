import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginForm } from './features/auth/LoginForm';
import { RegisterForm } from './features/auth/RegisterForm';
import { PasswordRecovery } from './features/auth/ForgotPasswordForm';
import { DashboardView } from './features/dashboard/DashboardView';
import { PeriodsView } from './features/academic/PeriodsView';
import { SubjectsView } from './features/academic/SubjectsView';
import { TimetableView } from './features/academic/TimetableView';
import { TasksView } from './features/academic/TasksView';
import { AssessmentsView } from './features/academic/AssessmentsView';
import { GradingSchemesView } from './features/academic/GradingSchemesView';
import { SettingsView } from './features/settings/SettingsView';
import {
  GraduationCap,
  LayoutDashboard,
  Calendar,
  BookOpen,
  Clock,
  CheckSquare,
  FileText,
  Award,
  Settings,
  LogOut,
  User as UserIcon,
} from 'lucide-react';

type AppTab = 'overview' | 'periods' | 'subjects' | 'timetable' | 'tasks' | 'assessments' | 'schemes' | 'settings';
type UnauthView = 'login' | 'register' | 'forgot-password';

const NAV_ITEMS: { key: AppTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'periods', label: 'Periods', icon: Calendar },
  { key: 'subjects', label: 'Subjects', icon: BookOpen },
  { key: 'timetable', label: 'Timetable', icon: Clock },
  { key: 'tasks', label: 'Tasks', icon: CheckSquare },
  { key: 'assessments', label: 'Assessments', icon: FileText },
  { key: 'schemes', label: 'Grading Schemes', icon: Award },
];

function MainApp() {
  const { user, isLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AppTab>('overview');
  const [unauthView, setUnauthView] = useState<UnauthView>('login');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 animate-pulse">
          <GraduationCap className="w-6 h-6" />
        </div>
        <p className="text-slate-400 text-sm font-medium tracking-wide">Loading UniTrack...</p>
      </div>
    );
  }

  // Authenticated Academic Application
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
                  onClick={() => setActiveTab('overview')}
                  className="flex items-center gap-2.5 cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-base font-bold text-white tracking-tight leading-none group-hover:text-indigo-400 transition-colors">
                      UniTrack
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-0.5">
                      Academic Suite
                    </span>
                  </div>
                </div>

                {/* Desktop Navigation Links */}
                <div className="hidden lg:flex items-center gap-1">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => setActiveTab(item.key)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
                      alt={user.displayName}
                      className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-xs">
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-semibold text-slate-200 leading-tight">
                      {user.displayName}
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
            <div className="lg:hidden flex items-center gap-1 overflow-x-auto pb-2.5 pt-1 scrollbar-none">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveTab(item.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white'
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
          {activeTab === 'overview' && <DashboardView onNavigate={(tab) => setActiveTab(tab)} />}
          {activeTab === 'periods' && <PeriodsView />}
          {activeTab === 'subjects' && <SubjectsView />}
          {activeTab === 'timetable' && <TimetableView />}
          {activeTab === 'tasks' && <TasksView />}
          {activeTab === 'assessments' && <AssessmentsView />}
          {activeTab === 'schemes' && <GradingSchemesView />}
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
          <GraduationCap className="w-4 h-4" />
          <span>UniTrack Academic Planner</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Master Your Semester
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Timetables, assignments, exam schedules, and GPA calculation in one place.
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
        UniTrack Staging Platform • Fast & Free Academic Hub
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
