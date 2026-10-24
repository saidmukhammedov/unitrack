import React, { useState, useEffect } from 'react';
import { api, syncEngine } from '../../lib/api';
import type {
  TodayResponse,
  TodayCommitmentItem,
  TodayHabitItem,
  Task,
  Context,
} from '@unitrack/contracts';
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Flame,
  ChevronRight,
  Eye,
  EyeOff,
  Filter,
  AlertCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  X,
  Check,
  Tag,
  CalendarDays,
  Target,
} from 'lucide-react';

interface TodayViewProps {
  onNavigateToAcademic?: (tab: string) => void;
}

export function TodayView({ onNavigateToAcademic }: TodayViewProps) {
  const [data, setData] = useState<TodayResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Toggles
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);

  // Modals / Quick Adds
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCommitmentModalOpen, setIsCommitmentModalOpen] = useState(false);
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);

  // Quick Add Forms state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [newTaskContextId, setNewTaskContextId] = useState<string>('');

  const [newCommitmentTitle, setNewCommitmentTitle] = useState('');
  const [newCommitmentStartTime, setNewCommitmentStartTime] = useState('09:00');
  const [newCommitmentEndTime, setNewCommitmentEndTime] = useState('10:00');
  const [newCommitmentContextId, setNewCommitmentContextId] = useState<string>('');

  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitFrequency, setNewHabitFrequency] = useState<'DAILY' | 'SELECTED_WEEKDAYS' | 'WEEKLY_TARGET'>('DAILY');
  const [newHabitContextId, setNewHabitContextId] = useState<string>('');

  const loadTodayData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.getToday();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load today view:', err);
      setError(err.message || 'Unable to load today schedule.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTodayData();
    const unsubscribe = syncEngine.subscribe((state) => {
      if (!state.isSyncing && state.pendingCount === 0 && state.lastSyncedAt) {
        loadTodayData();
      }
    });
    return unsubscribe;
  }, []);

  // Quick actions
  const handleToggleTask = async (task: Task) => {
    const nextStatus = task.isCompleted ? 'PENDING' : 'COMPLETED';
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    if (isOffline) {
      await syncEngine.enqueueMutation({
        entityType: 'TASK',
        action: 'UPDATE',
        entityId: task.id,
        payload: { status: nextStatus },
        version: task.version,
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((t) =>
                t.id === task.id
                  ? {
                      ...t,
                      isCompleted: !t.isCompleted,
                      status: nextStatus as any,
                    }
                  : t
              ),
            }
          : null
      );
      return;
    }

    try {
      await api.updateTask(task.id, {
        status: nextStatus as any,
        version: task.version,
      });
      await loadTodayData();
    } catch (err: any) {
      alert(`Could not update task: ${err.message}`);
    }
  };

  const handlePostponeTask = async (task: Task) => {
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    if (isOffline) {
      await syncEngine.enqueueMutation({
        entityType: 'TASK',
        action: 'UPDATE',
        entityId: task.id,
        payload: { status: 'POSTPONED' },
        version: task.version,
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((t) =>
                t.id === task.id
                  ? {
                      ...t,
                      status: 'POSTPONED' as any,
                    }
                  : t
              ),
            }
          : null
      );
      return;
    }

    try {
      await api.updateTask(task.id, {
        status: 'POSTPONED' as any,
        version: task.version,
      });
      await loadTodayData();
    } catch (err: any) {
      alert(`Could not postpone task: ${err.message}`);
    }
  };

  const handleLogCommitment = async (
    commitment: TodayCommitmentItem,
    status: 'ATTENDED' | 'MISSED' | 'CANCELLED'
  ) => {
    if (commitment.source === 'ACADEMIC') {
      alert('Academic class attendance is managed in Timetable.');
      return;
    }
    const todayDate = data?.date || new Date().toISOString().split('T')[0];
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    if (isOffline) {
      await syncEngine.enqueueMutation({
        entityType: 'COMMITMENT_LOG',
        action: 'CREATE',
        entityId: commitment.id,
        payload: { date: todayDate, status },
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              commitments: prev.commitments.map((c) =>
                c.id === commitment.id ? { ...c, status } : c
              ),
            }
          : null
      );
      return;
    }

    try {
      await api.logCommitmentOccurrence(commitment.id, todayDate, { status });
      await loadTodayData();
    } catch (err: any) {
      alert(`Could not update commitment: ${err.message}`);
    }
  };

  const handleLogHabit = async (habitId: string, status: 'COMPLETED' | 'SKIPPED') => {
    const todayDate = data?.date || new Date().toISOString().split('T')[0];
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    if (isOffline) {
      await syncEngine.enqueueMutation({
        entityType: 'HABIT_LOG',
        action: 'CREATE',
        entityId: habitId,
        payload: {
          date: todayDate,
          status,
          completedUnits: 1,
        },
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              habits: prev.habits.map((h) =>
                h.habit.id === habitId ? { ...h, status } : h
              ),
            }
          : null
      );
      return;
    }

    try {
      await api.logHabitOccurrence(habitId, {
        date: todayDate,
        status,
        completedUnits: 1,
      });
      await loadTodayData();
    } catch (err: any) {
      alert(`Could not update habit: ${err.message}`);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    if (isOffline) {
      const tempId = `temp-${Date.now()}`;
      await syncEngine.enqueueMutation({
        entityType: 'TASK',
        action: 'CREATE',
        entityId: tempId,
        payload: {
          title: newTaskTitle.trim(),
          taskType: 'OTHER',
          priority: newTaskPriority,
          contextId: newTaskContextId || undefined,
        },
      });
      setNewTaskTitle('');
      setIsTaskModalOpen(false);
      return;
    }

    try {
      await api.createTask({
        title: newTaskTitle.trim(),
        taskType: 'OTHER',
        priority: newTaskPriority,
        contextId: newTaskContextId || undefined,
      });
      setNewTaskTitle('');
      setIsTaskModalOpen(false);
      await loadTodayData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateCommitment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommitmentTitle.trim()) return;
    try {
      const todayDate = data?.date || new Date().toISOString().split('T')[0];
      await api.createCommitment({
        title: newCommitmentTitle.trim(),
        isRecurring: false,
        specificDate: todayDate,
        startTime: newCommitmentStartTime,
        endTime: newCommitmentEndTime,
        contextId: newCommitmentContextId || undefined,
      });
      setNewCommitmentTitle('');
      setIsCommitmentModalOpen(false);
      await loadTodayData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;
    try {
      await api.createHabit({
        title: newHabitTitle.trim(),
        frequencyType: newHabitFrequency,
        targetUnits: 1,
        contextId: newHabitContextId || undefined,
      });
      setNewHabitTitle('');
      setIsHabitModalOpen(false);
      await loadTodayData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
        <p className="font-serif-chronicle italic text-slate-400 text-lg">
          Composing today's chronicle...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-12 text-center max-w-md mx-auto">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-200">Could not load Today view</h3>
        <p className="text-sm text-slate-400 mt-1 mb-4">{error}</p>
        <button
          onClick={loadTodayData}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold text-white transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Format date display
  const dateStr = data.date || new Date().toISOString().split('T')[0];
  const [year, month, day] = dateStr.split('-');
  const dateObj = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  const monthName = dateObj.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
  const dayNum = dateObj.getUTCDate();

  // Filtered views safely defaulting to empty lists
  const contexts = data?.contexts || [];
  const commitments = data?.commitments || [];
  const tasks = data?.tasks || [];
  const habits = data?.habits || [];

  const filteredCommitments = commitments.filter((c) => {
    if (!showCancelled && c.status === 'CANCELLED') return false;
    if (selectedContextId && c.contextId !== selectedContextId) return false;
    return true;
  });

  const filteredTasks = tasks.filter((t) => {
    if (selectedContextId && t.contextId !== selectedContextId) return false;
    return true;
  });

  const filteredHabits = habits.filter((h) => {
    if (selectedContextId && h.habit?.contextId !== selectedContextId) return false;
    return true;
  });

  const completedTasksCount = tasks.filter((t) => t.isCompleted).length;
  const attendedCommitmentsCount = commitments.filter((c) => c.status === 'ATTENDED').length;
  const completedHabitsCount = habits.filter((h) => h.status === 'COMPLETED').length;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* 1. The Chronicle Editorial Header */}
      <header className="border-b border-slate-800 pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">
              <span>{dayName}</span>
              <span className="text-slate-600">•</span>
              <span>{monthName} {dayNum}, {year}</span>
              <span className="text-slate-600">•</span>
              <span className="text-indigo-400">The Chronicle</span>
            </div>
            <h1 className="font-serif-chronicle text-3xl sm:text-4xl text-slate-100 font-normal tracking-tight">
              Focus, Commitments & Daily Rhythm
            </h1>
          </div>

          {/* Quick Context Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedContextId(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                selectedContextId === null
                  ? 'bg-slate-200 text-slate-900 font-semibold'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              All
            </button>
            {contexts.map((ctx) => {
              const isSelected = selectedContextId === ctx.id;
              return (
                <button
                  key={ctx.id}
                  onClick={() => setSelectedContextId(isSelected ? null : ctx.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                    isSelected
                      ? 'bg-slate-800 text-white border-slate-600 shadow-sm'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border-slate-800/80'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: ctx.colorHex }}
                  />
                  <span>{ctx.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Top Intentions / Anchor Priorities */}
        {data.topIntentions.length > 0 && (
          <div className="mt-5 p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-start gap-3">
            <div className="w-5 h-5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-3 h-3" />
            </div>
            <div className="flex-1 text-xs">
              <span className="font-semibold text-slate-300 mr-2 uppercase tracking-wider text-[11px]">
                Today's Anchors:
              </span>
              <span className="text-slate-400">
                {data.topIntentions.join('  •  ')}
              </span>
            </div>
          </div>
        )}
      </header>

      {/* 2. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (Commitments Timeline & Habits) - 7 cols */}
        <div className="lg:col-span-7 space-y-8">
          {/* Commitments & Agenda */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <h2 className="font-serif-chronicle text-xl text-slate-200 font-normal !mb-0 !text-xl">
                  Today's Commitments
                </h2>
                <span className="text-xs text-slate-500 font-mono-tabular">
                  ({filteredCommitments.length})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCancelled(!showCancelled)}
                  className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors px-2 py-1 rounded bg-slate-900 border border-slate-800"
                  title="Toggle cancelled occurrences"
                >
                  {showCancelled ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showCancelled ? 'Hide Cancelled' : 'Show Cancelled'}</span>
                </button>

                <button
                  onClick={() => setIsCommitmentModalOpen(true)}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Commitment</span>
                </button>
              </div>
            </div>

            {filteredCommitments.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-slate-800/80 rounded-xl bg-slate-950/40">
                <p className="text-xs text-slate-500">No scheduled commitments for today.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCommitments.map((c) => {
                  const isCancelled = c.status === 'CANCELLED';
                  const isAttended = c.status === 'ATTENDED';

                  return (
                    <div
                      key={c.id}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isCancelled
                          ? 'bg-slate-950/40 border-slate-800/40 opacity-60'
                          : isAttended
                          ? 'bg-slate-900/30 border-emerald-900/30'
                          : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      {/* Time & Title */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="font-mono-tabular text-xs font-semibold text-slate-300 w-24 shrink-0">
                          {c.startTime} – {c.endTime}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-medium truncate ${
                                isCancelled ? 'line-through text-slate-500' : 'text-slate-100'
                              }`}
                            >
                              {c.title}
                            </span>
                            {c.contextName && (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0"
                                style={{
                                  backgroundColor: `${c.contextColor || '#6366f1'}20`,
                                  color: c.contextColor || '#818cf8',
                                }}
                              >
                                {c.contextName}
                              </span>
                            )}
                          </div>
                          {c.location && (
                            <span className="text-[11px] text-slate-400 block truncate">
                              📍 {c.location}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {c.source === 'UNIVERSAL' && (
                          <>
                            {isAttended ? (
                              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Check className="w-3 h-3" /> Attended
                              </span>
                            ) : isCancelled ? (
                              <span className="text-[11px] text-slate-500 italic">Cancelled</span>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleLogCommitment(c, 'ATTENDED')}
                                  className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/30 rounded-lg transition-colors"
                                  title="Mark as Attended"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleLogCommitment(c, 'CANCELLED')}
                                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                                  title="Cancel for today"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </>
                        )}
                        {c.source === 'ACADEMIC' && onNavigateToAcademic && (
                          <button
                            onClick={() => onNavigateToAcademic('timetable')}
                            className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium px-2 py-1"
                          >
                            Academic Class
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Habits & Daily Routines */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <h2 className="font-serif-chronicle text-xl text-slate-200 font-normal !mb-0 !text-xl">
                  Daily Habits & Rhythm
                </h2>
                <span className="text-xs text-slate-500 font-mono-tabular">
                  ({filteredHabits.length})
                </span>
              </div>

              <button
                onClick={() => setIsHabitModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Habit</span>
              </button>
            </div>

            {filteredHabits.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-slate-800/80 rounded-xl bg-slate-950/40">
                <p className="text-xs text-slate-500">No active habits. Create one to build consistency.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredHabits.map((item) => {
                  const h = item.habit;
                  const isDone = item.status === 'COMPLETED';
                  const isSkipped = item.status === 'SKIPPED';

                  return (
                    <div
                      key={h.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                        isDone
                          ? 'bg-amber-950/15 border-amber-500/30'
                          : isSkipped
                          ? 'bg-slate-950/40 border-slate-800/50 opacity-60'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-100">
                              {h.title}
                            </span>
                            {h.contextName && (
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: h.contextColor || '#6366f1' }}
                                title={h.contextName}
                              />
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {h.frequencyType === 'DAILY' && 'Every day'}
                            {h.frequencyType === 'SELECTED_WEEKDAYS' && 'Scheduled days'}
                            {h.frequencyType === 'WEEKLY_TARGET' && `${h.targetPerWeek}x per week`}
                          </span>
                        </div>

                        {/* Streak Badge */}
                        <div className="flex items-center gap-1 text-xs font-mono-tabular font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          <Flame className="w-3 h-3 text-amber-500" />
                          <span>{h.currentStreak}</span>
                        </div>
                      </div>

                      {/* Action Row */}
                      <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between">
                        <span className="text-[11px] font-medium text-slate-400">
                          {isDone ? 'Completed' : isSkipped ? 'Skipped' : 'Pending'}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {isDone ? (
                            <button
                              onClick={() => handleLogHabit(h.id, 'SKIPPED')}
                              className="text-[10px] text-slate-400 hover:text-slate-200 px-2 py-0.5"
                            >
                              Edit
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleLogHabit(h.id, 'SKIPPED')}
                                className="text-[11px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded hover:bg-slate-800 transition-colors"
                                title="Skip today (streak protected)"
                              >
                                Skip
                              </button>
                              <button
                                onClick={() => handleLogHabit(h.id, 'COMPLETED')}
                                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Done</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right Column (Prioritized Tasks & Day Closeout) - 5 cols */}
        <div className="lg:col-span-5 space-y-8">
          {/* Prioritized Tasks */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h2 className="font-serif-chronicle text-xl text-slate-200 font-normal !mb-0 !text-xl">
                  Tasks & Actions
                </h2>
                <span className="text-xs text-slate-500 font-mono-tabular">
                  ({filteredTasks.length})
                </span>
              </div>

              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Task</span>
              </button>
            </div>

            {filteredTasks.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-slate-800/80 rounded-xl bg-slate-950/40">
                <p className="text-xs text-slate-500">All tasks completed or none due today.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTasks.map((t) => {
                  const priorityColors: Record<string, string> = {
                    URGENT: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
                    HIGH: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                    MEDIUM: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
                    LOW: 'text-slate-400 bg-slate-800 border-slate-700',
                  };

                  return (
                    <div
                      key={t.id}
                      className={`p-3 rounded-xl border transition-all flex items-start gap-3 ${
                        t.isCompleted
                          ? 'bg-slate-950/30 border-slate-800/40 opacity-50'
                          : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <button
                        onClick={() => handleToggleTask(t)}
                        className={`mt-0.5 rounded cursor-pointer transition-colors ${
                          t.isCompleted ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {t.isCompleted ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-medium ${
                              t.isCompleted ? 'line-through text-slate-500' : 'text-slate-100'
                            }`}
                          >
                            {t.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                              priorityColors[t.priority] || priorityColors.MEDIUM
                            }`}
                          >
                            {t.priority}
                          </span>

                          {t.contextName && (
                            <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                              {t.contextName}
                            </span>
                          )}

                          {t.postponedCount > 0 && (
                            <span className="text-[10px] text-amber-400/80">
                              Postponed {t.postponedCount}x
                            </span>
                          )}
                        </div>
                      </div>

                      {!t.isCompleted && (
                        <button
                          onClick={() => handlePostponeTask(t)}
                          className="p-1 text-slate-500 hover:text-amber-400 rounded transition-colors"
                          title="Postpone"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Day Closeout / Progress Overview */}
          <section className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
            <h3 className="font-serif-chronicle text-lg text-slate-200 !text-lg !font-normal">
              Today's Rhythm Summary
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="font-mono-tabular text-lg font-bold text-indigo-400 block">
                  {attendedCommitmentsCount}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400">
                  Attended
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="font-mono-tabular text-lg font-bold text-emerald-400 block">
                  {completedTasksCount}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400">
                  Tasks Done
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="font-mono-tabular text-lg font-bold text-amber-400 block">
                  {completedHabitsCount}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400">
                  Habits
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* MODAL: Add Task */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif-chronicle text-xl text-slate-100">Add Task</h3>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-4 !bg-transparent !border-0 !shadow-none !p-0">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="Task title..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e: any) => setNewTaskPriority(e.target.value)}
                    className="w-full"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Context</label>
                  <select
                    value={newTaskContextId}
                    onChange={(e) => setNewTaskContextId(e.target.value)}
                    className="w-full"
                  >
                    <option value="">(None)</option>
                    {contexts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Commitment */}
      {isCommitmentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif-chronicle text-xl text-slate-100">Add Commitment</h3>
              <button onClick={() => setIsCommitmentModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCommitment} className="space-y-4 !bg-transparent !border-0 !shadow-none !p-0">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="Focus Block, Meeting, etc..."
                  value={newCommitmentTitle}
                  onChange={(e) => setNewCommitmentTitle(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Start Time (HH:MM)</label>
                  <input
                    type="time"
                    required
                    value={newCommitmentStartTime}
                    onChange={(e) => setNewCommitmentStartTime(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">End Time (HH:MM)</label>
                  <input
                    type="time"
                    required
                    value={newCommitmentEndTime}
                    onChange={(e) => setNewCommitmentEndTime(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Context</label>
                <select
                  value={newCommitmentContextId}
                  onChange={(e) => setNewCommitmentContextId(e.target.value)}
                  className="w-full"
                >
                  <option value="">(None)</option>
                  {contexts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCommitmentModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg"
                >
                  Save Commitment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Habit */}
      {isHabitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif-chronicle text-xl text-slate-100">New Habit</h3>
              <button onClick={() => setIsHabitModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateHabit} className="space-y-4 !bg-transparent !border-0 !shadow-none !p-0">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Habit Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Read 20 mins, Workout..."
                  value={newHabitTitle}
                  onChange={(e) => setNewHabitTitle(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Frequency</label>
                  <select
                    value={newHabitFrequency}
                    onChange={(e: any) => setNewHabitFrequency(e.target.value)}
                    className="w-full"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY_TARGET">Weekly Target</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Context</label>
                  <select
                    value={newHabitContextId}
                    onChange={(e) => setNewHabitContextId(e.target.value)}
                    className="w-full"
                  >
                    <option value="">(None)</option>
                    {contexts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsHabitModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg"
                >
                  Create Habit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
