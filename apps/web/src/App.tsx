import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginForm } from './features/auth/LoginForm';
import { RegisterForm } from './features/auth/RegisterForm';
import { VerifyEmailView } from './features/auth/VerifyEmailView';
import { PasswordRecovery } from './features/auth/ForgotPasswordForm';
import { DashboardView } from './features/dashboard/DashboardView';
import { PeriodsView } from './features/academic/PeriodsView';
import { SubjectsView } from './features/academic/SubjectsView';
import { TimetableView } from './features/academic/TimetableView';
import { TasksView } from './features/academic/TasksView';
import { AssessmentsView } from './features/academic/AssessmentsView';
import { GradingSchemesView } from './features/academic/GradingSchemesView';
import { SettingsView } from './features/settings/SettingsView';

type AppTab = 'overview' | 'periods' | 'subjects' | 'timetable' | 'tasks' | 'assessments' | 'schemes' | 'settings';
type UnauthView = 'login' | 'register' | 'verify-email' | 'forgot-password';

function MainApp() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<AppTab>('overview');
  const [unauthView, setUnauthView] = useState<UnauthView>('login');

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
        <p>Loading UniTrack...</p>
      </div>
    );
  }

  // Authenticated Academic Application
  if (user) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f7fafc', fontFamily: 'system-ui, sans-serif' }}>
        {/* Navigation Bar */}
        <nav style={{ background: '#1a365d', color: '#fff', padding: '0 1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ maxWidth: 1040, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.5, cursor: 'pointer' }} onClick={() => setActiveTab('overview')}>
                🎓 UniTrack
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                {[
                  { key: 'overview', label: 'Dashboard' },
                  { key: 'periods', label: 'Periods' },
                  { key: 'subjects', label: 'Subjects' },
                  { key: 'timetable', label: 'Timetable' },
                  { key: 'tasks', label: 'Tasks' },
                  { key: 'assessments', label: 'Assessments' },
                  { key: 'schemes', label: 'Grading Schemes' },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setActiveTab(item.key as AppTab)}
                    style={{
                      background: activeTab === item.key ? '#2b6cb0' : 'transparent',
                      color: activeTab === item.key ? '#fff' : '#cbd5e0',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <button
                onClick={() => setActiveTab('settings')}
                style={{
                  background: activeTab === 'settings' ? '#2b6cb0' : 'transparent',
                  color: '#cbd5e0',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                ⚙️ Settings
              </button>
            </div>
          </div>
        </nav>

        {/* Tab Body */}
        <main style={{ padding: '1.5rem 1rem' }}>
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
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', backgroundColor: '#fafafa', paddingTop: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, color: '#1a365d' }}>UniTrack</h1>
        <p style={{ margin: '4px 0', color: '#666' }}>Academic Planner & Timetable Manager</p>
      </div>

      {unauthView === 'login' && (
        <LoginForm
          onSwitchToRegister={() => setUnauthView('register')}
          onSwitchToForgotPassword={() => setUnauthView('forgot-password')}
        />
      )}

      {unauthView === 'register' && (
        <RegisterForm onSwitchToLogin={() => setUnauthView('login')} />
      )}

      {unauthView === 'verify-email' && (
        <VerifyEmailView onDone={() => setUnauthView('login')} />
      )}

      {unauthView === 'forgot-password' && (
        <PasswordRecovery onBackToLogin={() => setUnauthView('login')} />
      )}

      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <button
          onClick={() => setUnauthView(unauthView === 'verify-email' ? 'login' : 'verify-email')}
          style={{ background: 'none', border: 'none', color: '#666', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
        >
          {unauthView === 'verify-email' ? 'Back to Sign In' : 'Have a verification code? Verify here'}
        </button>
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