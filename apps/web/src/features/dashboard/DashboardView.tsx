import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import type { DashboardResponse, SessionItem, AcademicPeriod, PeriodGpaResponse } from '@unitrack/contracts';
import { formatGpa, formatPercentage, formatDate } from '@unitrack/i18n';

interface DashboardViewProps {
  onNavigate: (tab: 'periods' | 'subjects' | 'timetable' | 'tasks' | 'assessments' | 'schemes' | 'settings') => void;
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const { user, logout } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<AcademicPeriod | null>(null);
  const [gpaData, setGpaData] = useState<PeriodGpaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [dashRes, sessRes, periodsRes] = await Promise.all([
          api.getDashboard(),
          api.getSessions(),
          api.getPeriods(),
        ]);
        setDashboard(dashRes);
        setSessions(sessRes.data);

        const active = periodsRes.data.find((p) => !p.isArchived) || periodsRes.data[0];
        if (active) {
          setCurrentPeriod(active);
          try {
            const gpaRes = await api.getPeriodGpa(active.id);
            setGpaData(gpaRes);
          } catch {
            // No eligible courses yet or not university
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await api.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      alert('Failed to revoke session');
    }
  };

  const userLocale = user?.languageCode || 'en';

  return (
    <div style={{ maxWidth: 980, margin: '1rem auto', padding: '1rem', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, color: '#1a365d' }}>UniTrack Dashboard</h1>
          <p style={{ margin: '4px 0 0 0', color: '#666' }}>Welcome back, {user?.displayName}!</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onNavigate('schemes')}
            style={{ padding: '0.5rem 1rem', background: '#edf2f7', border: '1px solid #cbd5e0', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            Grading Schemes
          </button>
          <button
            onClick={() => onNavigate('settings')}
            style={{ padding: '0.5rem 1rem', background: '#edf2f7', border: '1px solid #cbd5e0', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            Settings
          </button>
          <button
            onClick={logout}
            style={{ padding: '0.5rem 1rem', background: '#fff5f5', color: '#c53030', border: '1px solid #feb2b2', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {error && (
        <div style={{ background: '#fff5f5', color: '#c53030', padding: 12, borderRadius: 6, margin: '16px 0' }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ marginTop: 24 }}>Loading your academic schedule and grades...</p>
      ) : (
        <>
          {/* Active Period & GPA Header */}
          <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {/* Period Card */}
            <div style={{ padding: '1.25rem', background: '#ebf8ff', borderRadius: 8, borderLeft: '4px solid #3182ce', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#2b6cb0', fontWeight: 700 }}>
                  Active Academic Period
                </span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: 18, color: '#1a365d' }}>
                  {currentPeriod ? currentPeriod.name : 'No Active Period Configured'}
                </h3>
                {currentPeriod && (
                  <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#4a5568' }}>
                    {formatDate(currentPeriod.startDate, userLocale)} to {formatDate(currentPeriod.endDate, userLocale)}
                  </p>
                )}
              </div>
              <div style={{ marginTop: 12 }}>
                <button
                  onClick={() => onNavigate('periods')}
                  style={{ background: '#3182ce', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                >
                  Manage Periods →
                </button>
              </div>
            </div>

            {/* GPA Summary Card */}
            <div style={{ padding: '1.25rem', background: '#f0fff4', borderRadius: 8, borderLeft: '4px solid #38a169', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#276749', fontWeight: 700 }}>
                  Cumulative Period GPA (§3.5)
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: '#22543d' }}>
                    {gpaData && gpaData.gpa !== null ? formatGpa(gpaData.gpa, userLocale) : '—'}
                  </span>
                  <span style={{ fontSize: 14, color: '#718096' }}>
                    {gpaData ? `/ 4.00 (${gpaData.totalCredits} credits)` : '(No GPA eligible courses yet)'}
                  </span>
                </div>
              </div>
              {gpaData?.subjectSummaries.length ? (
                <div style={{ fontSize: 12, color: '#4a5568', marginTop: 8 }}>
                  Evaluated across {gpaData.subjectSummaries.length} completed courses
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#718096', marginTop: 8 }}>
                  Complete assessment scores to view live GPA
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div
              onClick={() => onNavigate('timetable')}
              style={{ padding: '1.25rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
            >
              <div style={{ fontSize: 12, color: '#718096', fontWeight: 600, textTransform: 'uppercase' }}>Classes Today</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#2b6cb0', marginTop: 4 }}>
                {dashboard?.todaysClasses.length ?? 0}
              </div>
              <div style={{ fontSize: 12, color: '#4a5568', marginTop: 4 }}>View Timetable →</div>
            </div>

            <div
              onClick={() => onNavigate('tasks')}
              style={{ padding: '1.25rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
            >
              <div style={{ fontSize: 12, color: '#718096', fontWeight: 600, textTransform: 'uppercase' }}>Upcoming Tasks</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#dd6b20', marginTop: 4 }}>
                {dashboard?.upcomingTasks.length ?? 0}
              </div>
              <div style={{ fontSize: 12, color: '#4a5568', marginTop: 4 }}>View Tasks →</div>
            </div>

            <div
              onClick={() => onNavigate('assessments')}
              style={{ padding: '1.25rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
            >
              <div style={{ fontSize: 12, color: '#718096', fontWeight: 600, textTransform: 'uppercase' }}>Upcoming Exams</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#e53e3e', marginTop: 4 }}>
                {dashboard?.upcomingAssessments.length ?? 0}
              </div>
              <div style={{ fontSize: 12, color: '#4a5568', marginTop: 4 }}>View Exams →</div>
            </div>
          </div>

          {/* Today's Classes & Deadlines */}
          <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Today's Classes */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16, color: '#2d3748' }}>Today's Schedule</h3>
                <span style={{ fontSize: 12, color: '#718096' }}>{dashboard?.date}</span>
              </div>
              {!dashboard?.todaysClasses.length ? (
                <p style={{ color: '#a0aec0', fontSize: 14 }}>No classes scheduled for today.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {dashboard.todaysClasses.map((c) => (
                    <div
                      key={c.sessionId}
                      style={{
                        padding: '10px 12px',
                        background: '#f7fafc',
                        borderLeft: `4px solid ${c.subjectColor || '#3182ce'}`,
                        borderRadius: 4,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: 14, color: '#1a202c' }}>{c.subjectName}</strong>
                        <span style={{ fontSize: 13, color: '#2b6cb0', fontWeight: 600 }}>
                          {c.startTime} - {c.endTime}
                        </span>
                      </div>
                      {c.location && (
                        <div style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>📍 {c.location}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* GPA Subject Breakdown */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16, color: '#2d3748' }}>GPA Course Breakdown</h3>
                <span style={{ fontSize: 12, color: '#718096' }}>Credit Weighted</span>
              </div>
              {!gpaData?.subjectSummaries.length ? (
                <p style={{ color: '#a0aec0', fontSize: 14 }}>
                  No courses evaluated yet. Record completed exam/quiz scores to calculate GPA.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {gpaData.subjectSummaries.map((s) => (
                    <div
                      key={s.subjectId}
                      style={{
                        padding: '8px 12px',
                        background: '#f7fafc',
                        borderRadius: 4,
                        border: '1px solid #edf2f7',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: 14, color: '#2d3748' }}>{s.subjectName}</strong>
                        <div style={{ fontSize: 12, color: '#718096' }}>
                          {s.creditHours} credits • {formatPercentage(s.computedPercentage, userLocale)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, background: '#c6f6d5', color: '#22543d', padding: '2px 8px', borderRadius: 4 }}>
                          {s.computedBand}
                        </span>
                        <div style={{ fontSize: 11, color: '#4a5568', marginTop: 2, fontWeight: 600 }}>
                          {s.gradePoints} pts
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Excluded Courses list */}
              {gpaData?.excludedSubjects && gpaData.excludedSubjects.length > 0 && (
                <div style={{ marginTop: 14, borderTop: '1px solid #edf2f7', paddingTop: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#718096' }}>Excluded courses:</span>
                  <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 2 }}>
                    {gpaData.excludedSubjects.map((ex) => `${ex.subjectName || ex.subjectId} (${ex.reason})`).join(', ')}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Active Sessions */}
          <section style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: 16, color: '#2d3748', marginBottom: 12 }}>Active Login Sessions</h3>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                <thead style={{ background: '#f7fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ padding: '0.75rem' }}>Device</th>
                    <th style={{ padding: '0.75rem' }}>IP Address</th>
                    <th style={{ padding: '0.75rem' }}>Created</th>
                    <th style={{ padding: '0.75rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                      <td style={{ padding: '0.75rem' }}>
                        {s.deviceInfo || 'Unknown Device'}
                        {s.isCurrent && (
                          <span style={{ marginLeft: 8, background: '#c8e6c9', color: '#2e7d32', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
                            Current
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem' }}>{s.ipAddress || '—'}</td>
                      <td style={{ padding: '0.75rem' }}>{new Date(s.createdAt).toLocaleString()}</td>
                      <td style={{ padding: '0.75rem' }}>
                        {!s.isCurrent && (
                          <button
                            onClick={() => handleRevokeSession(s.id)}
                            style={{ padding: '4px 8px', background: '#ffebee', color: '#c62828', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}