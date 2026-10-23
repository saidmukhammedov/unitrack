import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import type { DashboardResponse, SessionItem, AcademicPeriod, PeriodGpaResponse } from '@unitrack/contracts';
import { formatGpa, formatPercentage, formatDate } from '@unitrack/i18n';
import {
  Calendar,
  Award,
  Clock,
  CheckSquare,
  FileText,
  Shield,
  Laptop,
  ArrowRight,
  Sparkles,
  MapPin,
  TrendingUp,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: 'periods' | 'subjects' | 'timetable' | 'tasks' | 'assessments' | 'schemes' | 'settings') => void;
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const { user } = useAuth();
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
            // No eligible courses yet
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
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/60 via-slate-900 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Academic Overview</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome, {user?.displayName}!
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Here is your active term status, today's timetable, and ongoing coursework.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigate('timetable')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Clock className="w-4 h-4" />
              <span>Full Schedule</span>
            </button>
            <button
              onClick={() => onNavigate('tasks')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Manage Tasks</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm font-medium">Syncing your courses and timetable...</p>
        </div>
      ) : (
        <>
          {/* Active Period & GPA Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Active Period Card */}
            <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 flex flex-col justify-between shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    Active Term
                  </span>
                  {currentPeriod && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
                      In Progress
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-white">
                  {currentPeriod ? currentPeriod.name : 'No Active Period Configured'}
                </h3>
                {currentPeriod ? (
                  <p className="text-xs text-slate-400 mt-1">
                    {formatDate(currentPeriod.startDate, userLocale)} — {formatDate(currentPeriod.endDate, userLocale)}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">Configure your first term to begin tracking courses.</p>
                )}
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-400">Manage terms & dates</span>
                <button
                  onClick={() => onNavigate('periods')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  Configure Periods <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* GPA Summary Card */}
            <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 flex flex-col justify-between shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Award className="w-4 h-4" />
                    Term GPA
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-semibold">
                    {gpaData?.totalCredits ?? 0} Credits
                  </span>
                </div>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-4xl font-extrabold text-white tracking-tight">
                    {gpaData && gpaData.gpa !== null ? formatGpa(gpaData.gpa, userLocale) : '—'}
                  </span>
                  <span className="text-sm text-slate-400 font-medium">/ 4.00 Max</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {gpaData?.subjectSummaries.length
                    ? `Calculated dynamically across ${gpaData.subjectSummaries.length} completed courses.`
                    : 'Add assessment grades to start calculating your cumulative GPA.'}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-400">Grading scales</span>
                <button
                  onClick={() => onNavigate('schemes')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  View Scheme <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Metric Counter Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              onClick={() => onNavigate('timetable')}
              className="rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 p-5 cursor-pointer transition-all hover:scale-[1.01] shadow-sm"
            >
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Classes Today</span>
                <Clock className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-3xl font-extrabold text-white mt-2">
                {dashboard?.todaysClasses.length ?? 0}
              </div>
              <div className="text-xs text-indigo-400 font-medium mt-2 flex items-center gap-1">
                View Timetable <ArrowRight className="w-3 h-3" />
              </div>
            </div>

            <div
              onClick={() => onNavigate('tasks')}
              className="rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 p-5 cursor-pointer transition-all hover:scale-[1.01] shadow-sm"
            >
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Active Tasks</span>
                <CheckSquare className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-3xl font-extrabold text-white mt-2">
                {dashboard?.upcomingTasks.length ?? 0}
              </div>
              <div className="text-xs text-amber-400 font-medium mt-2 flex items-center gap-1">
                Check Assignments <ArrowRight className="w-3 h-3" />
              </div>
            </div>

            <div
              onClick={() => onNavigate('assessments')}
              className="rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 p-5 cursor-pointer transition-all hover:scale-[1.01] shadow-sm"
            >
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Upcoming Exams</span>
                <FileText className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-3xl font-extrabold text-white mt-2">
                {dashboard?.upcomingAssessments.length ?? 0}
              </div>
              <div className="text-xs text-rose-400 font-medium mt-2 flex items-center gap-1">
                View Assessments <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </div>

          {/* Today's Schedule & Course Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Schedule Card */}
            <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  Today's Schedule
                </h3>
                <span className="text-xs text-slate-400 font-medium">{dashboard?.date}</span>
              </div>

              {!dashboard?.todaysClasses.length ? (
                <div className="py-12 text-center">
                  <Clock className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-400 font-medium">No classes scheduled for today.</p>
                  <p className="text-xs text-slate-500 mt-1">Enjoy your study time!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboard.todaysClasses.map((c) => (
                    <div
                      key={c.sessionId}
                      className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-start justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-2.5 h-10 rounded-full shrink-0 mt-0.5"
                          style={{ backgroundColor: c.subjectColor || '#6366f1' }}
                        />
                        <div>
                          <h4 className="text-sm font-bold text-white">{c.subjectName}</h4>
                          {c.location && (
                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-500" />
                              {c.location}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold whitespace-nowrap">
                        {c.startTime} – {c.endTime}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* GPA Course Breakdown */}
            <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  GPA Course Breakdown
                </h3>
                <span className="text-xs text-slate-400 font-medium">Weighted Credits</span>
              </div>

              {!gpaData?.subjectSummaries.length ? (
                <div className="py-12 text-center">
                  <Award className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-400 font-medium">No evaluated courses yet.</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Add assessment scores in your subjects to view grade points.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {gpaData.subjectSummaries.map((s) => (
                    <div
                      key={s.subjectId}
                      className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-4"
                    >
                      <div>
                        <h4 className="text-sm font-bold text-white">{s.subjectName}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {s.creditHours} Credits • {formatPercentage(s.computedPercentage, userLocale)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                          {s.computedBand}
                        </span>
                        <div className="text-[11px] text-slate-400 font-semibold mt-1">
                          {s.gradePoints} pts
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active Sessions Manager */}
          <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-400" />
                Active Sessions & Devices
              </h3>
              <span className="text-xs text-slate-400">{sessions.length} active</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="pb-3 pl-2">Device</th>
                    <th className="pb-3">IP Address</th>
                    <th className="pb-3">Logged In</th>
                    <th className="pb-3 pr-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 pl-2 flex items-center gap-2 text-slate-200 font-medium">
                        <Laptop className="w-4 h-4 text-slate-500" />
                        <span>{s.deviceInfo || 'Web Browser'}</span>
                        {s.isCurrent && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                            Current
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-slate-400">{s.ipAddress || '—'}</td>
                      <td className="py-3 text-slate-400">{new Date(s.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 pr-2 text-right">
                        {!s.isCurrent && (
                          <button
                            onClick={() => handleRevokeSession(s.id)}
                            className="text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
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
          </div>
        </>
      )}
    </div>
  );
}
