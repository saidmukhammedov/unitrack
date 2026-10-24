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
  CornerDownRight,
  MapPin,
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
  const [newCommitmentLocation, setNewCommitmentLocation] = useState('');
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
        location: newCommitmentLocation.trim() || undefined,
        contextId: newCommitmentContextId || undefined,
      });
      setNewCommitmentTitle('');
      setNewCommitmentLocation('');
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
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-6 h-6 border-2 border-[#171614] border-t-transparent rounded-full animate-spin" />
        <p className="font-serif-chronicle italic text-[#74726A] text-lg">
          Inscribing today's chronicle...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-16 text-center max-w-md mx-auto paper-panel">
        <AlertCircle className="w-8 h-8 text-[#A33F17] mx-auto mb-3" />
        <h3 className="font-serif-chronicle text-xl text-[#171614]">Chronicle Unavailable</h3>
        <p className="text-xs text-[#74726A] mt-1 mb-5">{error}</p>
        <button
          onClick={loadTodayData}
          className="px-4 py-2 bg-[#171614] hover:bg-[#2C2B27] rounded text-xs font-medium text-[#FBFBF9] transition-colors"
        >
          Re-open Ledger
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
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      {/* 1. The Chronicle Editorial Header */}
      <header className="border-b border-[#E5E3D8] pb-8 pt-2">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 text-[11px] font-mono-tabular tracking-wider uppercase text-[#74726A]">
              <span>{dayName}</span>
              <span className="text-[#D8D5C8]">•</span>
              <span>{monthName} {dayNum}, {year}</span>
              <span className="text-[#D8D5C8]">•</span>
              <span className="text-[#A33F17] font-semibold">Chrono-Stream</span>
            </div>
            <h1 className="font-serif-chronicle text-3xl sm:text-5xl text-[#171614] font-normal tracking-tight">
              Focus, Commitments & Daily Rhythm
            </h1>
          </div>

          {/* Quick Context Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#74726A] mr-1">
              Filter:
            </span>
            <button
              onClick={() => setSelectedContextId(null)}
              className={`px-3 py-1 text-xs rounded transition-all cursor-pointer ${
                selectedContextId === null
                  ? 'bg-[#171614] text-[#FBFBF9] font-medium shadow-xs'
                  : 'text-[#74726A] hover:text-[#171614] hover:bg-[#F4F3ED] border border-[#E5E3D8]'
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
                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded transition-all border cursor-pointer ${
                    isSelected
                      ? 'bg-[#171614] text-[#FBFBF9] border-[#171614] font-medium shadow-xs'
                      : 'text-[#74726A] hover:text-[#171614] hover:bg-[#F4F3ED] border-[#E5E3D8]'
                  }`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
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
          <div className="mt-6 p-4 rounded bg-[#F4F3ED] border-l-2 border-[#A33F17] border-y border-r border-[#E5E3D8] flex items-start gap-3">
            <div className="text-[#A33F17] shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1 text-xs leading-relaxed">
              <span className="font-mono-tabular uppercase tracking-wider text-[11px] font-semibold text-[#171614] mr-2">
                Today's Anchors:
              </span>
              <span className="text-[#2C2B27] font-serif-chronicle italic text-sm">
                {data.topIntentions.join('  —  ')}
              </span>
            </div>
          </div>
        )}
      </header>

      {/* 2. Top Rhythm Ledger Bar */}
      <section className="grid grid-cols-3 gap-4 border border-[#E5E3D8] rounded p-4 bg-[#FBFBF9]">
        <div className="text-center sm:text-left sm:pl-4">
          <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-[#74726A] block">
            Attended Agenda
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-serif-chronicle text-2xl sm:text-3xl font-medium text-[#171614]">
              {attendedCommitmentsCount}
            </span>
            <span className="text-xs text-[#74726A] font-mono-tabular">
              / {commitments.length}
            </span>
          </div>
        </div>
        <div className="text-center sm:text-left sm:border-l border-[#E5E3D8] sm:pl-6">
          <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-[#74726A] block">
            Tasks Resolved
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-serif-chronicle text-2xl sm:text-3xl font-medium text-[#2C4839]">
              {completedTasksCount}
            </span>
            <span className="text-xs text-[#74726A] font-mono-tabular">
              / {tasks.length}
            </span>
          </div>
        </div>
        <div className="text-center sm:text-left sm:border-l border-[#E5E3D8] sm:pl-6">
          <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-[#74726A] block">
            Habit Rituals
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-serif-chronicle text-2xl sm:text-3xl font-medium text-[#A33F17]">
              {completedHabitsCount}
            </span>
            <span className="text-xs text-[#74726A] font-mono-tabular">
              / {habits.length}
            </span>
          </div>
        </div>
      </section>

      {/* 3. Main Chronicle Stream & Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column: Commitments Timeline & Daily Cadence (7 cols) */}
        <div className="lg:col-span-7 space-y-10">
          {/* Commitments & Agenda Section */}
          <section className="space-y-4">
            <div className="flex items-baseline justify-between border-b border-[#E5E3D8] pb-2">
              <div className="flex items-baseline gap-2.5">
                <h2 className="font-serif-chronicle text-2xl text-[#171614] font-normal !mb-0">
                  Today's Commitments
                </h2>
                <span className="text-xs text-[#74726A] font-mono-tabular">
                  ({filteredCommitments.length})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCancelled(!showCancelled)}
                  className="text-[11px] font-mono-tabular text-[#74726A] hover:text-[#171614] flex items-center gap-1.5 transition-colors px-2 py-1 rounded border border-[#E5E3D8] bg-[#FBFBF9]"
                  title="Toggle cancelled occurrences"
                >
                  {showCancelled ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showCancelled ? 'Hide Cancelled' : 'Show Cancelled'}</span>
                </button>

                <button
                  onClick={() => setIsCommitmentModalOpen(true)}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-[#171614] text-[#FBFBF9] hover:bg-[#2C2B27] transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Commitment</span>
                </button>
              </div>
            </div>

            {filteredCommitments.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-[#E5E3D8] rounded bg-[#F4F3ED]/40">
                <Clock className="w-6 h-6 text-[#74726A] mx-auto mb-2 opacity-50" />
                <p className="text-xs text-[#74726A] font-serif-chronicle italic text-sm">
                  No scheduled commitments for today. Free flow of time.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#E5E3D8] border-y border-[#E5E3D8]">
                {filteredCommitments.map((c) => {
                  const isCancelled = c.status === 'CANCELLED';
                  const isAttended = c.status === 'ATTENDED';

                  return (
                    <div
                      key={c.id}
                      className={`py-3.5 px-2 flex items-center justify-between gap-4 transition-colors ${
                        isCancelled
                          ? 'opacity-40 bg-[#F4F3ED]/30'
                          : isAttended
                          ? 'bg-[#2C4839]/5'
                          : 'hover:bg-[#F4F3ED]/40'
                      }`}
                    >
                      {/* Time & Title */}
                      <div className="flex items-baseline gap-4 min-w-0">
                        <div className="font-mono-tabular text-xs font-semibold text-[#171614] w-24 shrink-0 tracking-tight">
                          {c.startTime} — {c.endTime}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-medium ${
                                isCancelled
                                  ? 'line-through text-[#74726A]'
                                  : 'text-[#171614]'
                              }`}
                            >
                              {c.title}
                            </span>
                            {c.contextName && (
                              <span
                                className="px-1.5 py-0.2 rounded text-[10px] font-mono-tabular border"
                                style={{
                                  borderColor: `${c.contextColor || '#171614'}40`,
                                  color: c.contextColor || '#171614',
                                }}
                              >
                                {c.contextName}
                              </span>
                            )}
                          </div>
                          {c.location && (
                            <span className="text-[11px] text-[#74726A] flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#A33F17]" />
                              <span>{c.location}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {c.source === 'UNIVERSAL' && (
                          <>
                            {isAttended ? (
                              <span className="text-[11px] font-mono-tabular font-semibold text-[#2C4839] bg-[#2C4839]/10 border border-[#2C4839]/20 px-2.5 py-0.5 rounded flex items-center gap-1">
                                <Check className="w-3 h-3" /> Attended
                              </span>
                            ) : isCancelled ? (
                              <span className="text-[11px] font-serif-chronicle italic text-[#74726A]">
                                Cancelled
                              </span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleLogCommitment(c, 'ATTENDED')}
                                  className="text-xs px-2.5 py-1 font-medium bg-[#F4F3ED] hover:bg-[#E5E3D8] text-[#171614] border border-[#D8D5C8] rounded transition-colors cursor-pointer flex items-center gap-1"
                                  title="Mark as Attended"
                                >
                                  <Check className="w-3 h-3 text-[#2C4839]" />
                                  <span>Attend</span>
                                </button>
                                <button
                                  onClick={() => handleLogCommitment(c, 'CANCELLED')}
                                  className="text-[11px] font-mono-tabular text-[#74726A] hover:text-[#A33F17] p-1 transition-colors"
                                  title="Cancel for today"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                        {c.source === 'ACADEMIC' && onNavigateToAcademic && (
                          <button
                            onClick={() => onNavigateToAcademic('timetable')}
                            className="text-xs font-mono-tabular text-[#1E2D42] hover:underline"
                          >
                            Academic Class →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Habits & Daily Rhythm Section */}
          <section className="space-y-4">
            <div className="flex items-baseline justify-between border-b border-[#E5E3D8] pb-2">
              <div className="flex items-baseline gap-2.5">
                <h2 className="font-serif-chronicle text-2xl text-[#171614] font-normal !mb-0">
                  Daily Habits & Rhythm
                </h2>
                <span className="text-xs text-[#74726A] font-mono-tabular">
                  ({filteredHabits.length})
                </span>
              </div>

              <button
                onClick={() => setIsHabitModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-[#E5E3D8] hover:border-[#171614] text-[#171614] bg-[#FBFBF9] transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Habit</span>
              </button>
            </div>

            {filteredHabits.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-[#E5E3D8] rounded bg-[#F4F3ED]/40">
                <Flame className="w-6 h-6 text-[#74726A] mx-auto mb-2 opacity-50" />
                <p className="text-xs text-[#74726A] font-serif-chronicle italic text-sm">
                  No active rituals registered. Create a habit to anchor your day.
                </p>
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
                      className={`p-3.5 rounded border transition-all flex flex-col justify-between ${
                        isDone
                          ? 'bg-[#2C4839]/5 border-[#2C4839]/30'
                          : isSkipped
                          ? 'bg-[#F4F3ED] border-[#E5E3D8] opacity-60'
                          : 'bg-[#FBFBF9] border-[#E5E3D8] hover:border-[#D8D5C8]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[#171614]">
                              {h.title}
                            </span>
                            {h.contextName && (
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: h.contextColor || '#171614' }}
                                title={h.contextName}
                              />
                            )}
                          </div>
                          <span className="text-[11px] font-mono-tabular text-[#74726A] block">
                            {h.frequencyType === 'DAILY' && 'Daily cadence'}
                            {h.frequencyType === 'SELECTED_WEEKDAYS' && 'Scheduled days'}
                            {h.frequencyType === 'WEEKLY_TARGET' && `${h.targetPerWeek}x per week`}
                          </span>
                        </div>

                        {/* Streak Badge */}
                        <div className="flex items-center gap-1 text-xs font-mono-tabular font-semibold text-[#A33F17] bg-[#A33F17]/10 px-2 py-0.5 rounded border border-[#A33F17]/20">
                          <Flame className="w-3 h-3 text-[#A33F17]" />
                          <span>{h.currentStreak}</span>
                        </div>
                      </div>

                      {/* Action Row */}
                      <div className="mt-4 pt-2.5 border-t border-[#E5E3D8] flex items-center justify-between">
                        <span className="text-[11px] font-mono-tabular text-[#74726A]">
                          {isDone ? '✓ Completed' : isSkipped ? '— Skipped' : 'Pending'}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {isDone ? (
                            <button
                              onClick={() => handleLogHabit(h.id, 'SKIPPED')}
                              className="text-[10px] font-mono-tabular text-[#74726A] hover:text-[#171614] px-1.5 py-0.5"
                            >
                              Edit
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleLogHabit(h.id, 'SKIPPED')}
                                className="text-[11px] font-mono-tabular text-[#74726A] hover:text-[#171614] px-2 py-0.5 transition-colors"
                                title="Skip today (streak protected)"
                              >
                                Skip
                              </button>
                              <button
                                onClick={() => handleLogHabit(h.id, 'COMPLETED')}
                                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded bg-[#171614] text-[#FBFBF9] hover:bg-[#2C2B27] transition-colors cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
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

        {/* Right Column: Actions Ledger (Tasks & Actions) (5 cols) */}
        <div className="lg:col-span-5 space-y-10">
          <section className="space-y-4">
            <div className="flex items-baseline justify-between border-b border-[#E5E3D8] pb-2">
              <div className="flex items-baseline gap-2.5">
                <h2 className="font-serif-chronicle text-2xl text-[#171614] font-normal !mb-0">
                  Tasks & Actions
                </h2>
                <span className="text-xs text-[#74726A] font-mono-tabular">
                  ({filteredTasks.length})
                </span>
              </div>

              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-[#171614] text-[#FBFBF9] hover:bg-[#2C2B27] transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Task</span>
              </button>
            </div>

            {filteredTasks.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-[#E5E3D8] rounded bg-[#F4F3ED]/40">
                <CheckCircle2 className="w-6 h-6 text-[#74726A] mx-auto mb-2 opacity-50" />
                <p className="text-xs text-[#74726A] font-serif-chronicle italic text-sm">
                  Ledger clear. All intentions fulfilled or none due today.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#E5E3D8] border-y border-[#E5E3D8]">
                {filteredTasks.map((t) => {
                  const priorityStyles: Record<string, string> = {
                    URGENT: 'text-[#A33F17] border-[#A33F17]/30 bg-[#A33F17]/10',
                    HIGH: 'text-[#B45309] border-[#B45309]/30 bg-[#B45309]/10',
                    MEDIUM: 'text-[#1E2D42] border-[#1E2D42]/30 bg-[#1E2D42]/10',
                    LOW: 'text-[#74726A] border-[#D8D5C8] bg-[#F4F3ED]',
                  };

                  return (
                    <div
                      key={t.id}
                      className={`py-3 px-2 flex items-start gap-3 transition-colors ${
                        t.isCompleted
                          ? 'opacity-40 bg-[#F4F3ED]/30'
                          : 'hover:bg-[#F4F3ED]/40'
                      }`}
                    >
                      <button
                        onClick={() => handleToggleTask(t)}
                        className="mt-0.5 text-[#171614] cursor-pointer"
                        title={t.isCompleted ? 'Mark pending' : 'Mark complete'}
                      >
                        {t.isCompleted ? (
                          <div className="w-4 h-4 rounded-xs border border-[#2C4839] bg-[#2C4839] text-[#FBFBF9] flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-xs border border-[#74726A] hover:border-[#171614] bg-[#FBFBF9]" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm ${
                              t.isCompleted
                                ? 'line-through text-[#74726A]'
                                : 'text-[#171614] font-medium'
                            }`}
                          >
                            {t.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono-tabular uppercase tracking-wider border ${
                              priorityStyles[t.priority] || priorityStyles.MEDIUM
                            }`}
                          >
                            {t.priority}
                          </span>

                          {t.contextName && (
                            <span className="text-[10px] font-mono-tabular text-[#74726A] bg-[#F4F3ED] px-1.5 py-0.2 rounded border border-[#E5E3D8]">
                              {t.contextName}
                            </span>
                          )}

                          {t.postponedCount > 0 && (
                            <span className="text-[10px] font-mono-tabular text-[#A33F17]">
                              Postponed {t.postponedCount}×
                            </span>
                          )}
                        </div>
                      </div>

                      {!t.isCompleted && (
                        <button
                          onClick={() => handlePostponeTask(t)}
                          className="p-1 text-[#74726A] hover:text-[#A33F17] transition-colors"
                          title="Postpone to tomorrow"
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

          {/* Quiet Retrospective Invitation */}
          <div className="p-5 rounded border border-[#E5E3D8] bg-[#F4F3ED] space-y-2">
            <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-[#A33F17] font-semibold block">
              Editorial Notice
            </span>
            <p className="font-serif-chronicle text-sm text-[#171614] leading-relaxed">
              "The discipline of tracking is not merely about output, but clarity of purpose."
            </p>
            <p className="text-xs text-[#74726A]">
              Review your full weekly trajectory anytime in the <span className="font-semibold text-[#171614]">Retrospective</span> ledger.
            </p>
          </div>
        </div>
      </div>

      {/* MODAL: Add Task */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#171614]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border border-[#D8D5C8] rounded shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-baseline justify-between border-b border-[#E5E3D8] pb-3">
              <h3 className="font-serif-chronicle text-2xl text-[#171614]">Add Task</h3>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="text-[#74726A] hover:text-[#171614]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="text-xs font-mono-tabular uppercase tracking-wider text-[#74726A] block mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="Task title..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full text-sm"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono-tabular uppercase tracking-wider text-[#74726A] block mb-1">
                    Priority
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e: any) => setNewTaskPriority(e.target.value)}
                    className="w-full text-xs font-mono-tabular"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-mono-tabular uppercase tracking-wider text-[#74726A] block mb-1">
                    Context
                  </label>
                  <select
                    value={newTaskContextId}
                    onChange={(e) => setNewTaskContextId(e.target.value)}
                    className="w-full text-xs"
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
              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E3D8]">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono-tabular text-[#74726A] hover:text-[#171614]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-medium text-[#FBFBF9] bg-[#171614] hover:bg-[#2C2B27] rounded transition-colors"
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
        <div className="fixed inset-0 z-50 bg-[#171614]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border border-[#D8D5C8] rounded shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-baseline justify-between border-b border-[#E5E3D8] pb-3">
              <h3 className="font-serif-chronicle text-2xl text-[#171614]">Add Commitment</h3>
              <button
                onClick={() => setIsCommitmentModalOpen(false)}
                className="text-[#74726A] hover:text-[#171614]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateCommitment} className="space-y-4">
              <div>
                <label className="text-xs font-mono-tabular uppercase tracking-wider text-[#74726A] block mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="Focus Block, Seminar, Discussion..."
                  value={newCommitmentTitle}
                  onChange={(e) => setNewCommitmentTitle(e.target.value)}
                  className="w-full text-sm"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono-tabular uppercase tracking-wider text-[#74726A] block mb-1">
                    Start (HH:MM)
                  </label>
                  <input
                    type="time"
                    required
                    value={newCommitmentStartTime}
                    onChange={(e) => setNewCommitmentStartTime(e.target.value)}
                    className="w-full text-xs font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono-tabular uppercase tracking-wider text-[#74726A] block mb-1">
                    End (HH:MM)
                  </label>
                  <input
                    type="time"
                    required
                    value={newCommitmentEndTime}
                    onChange={(e) => setNewCommitmentEndTime(e.target.value)}
                    className="w-full text-xs font-mono-tabular"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-mono-tabular uppercase tracking-wider text-[#74726A] block mb-1">
                  Location (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Library, Studio, Office..."
                  value={newCommitmentLocation}
                  onChange={(e) => setNewCommitmentLocation(e.target.value)}
                  className="w-full text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-mono-tabular uppercase tracking-wider text-[#74726A] block mb-1">
                  Context
                </label>
                <select
                  value={newCommitmentContextId}
                  onChange={(e) => setNewCommitmentContextId(e.target.value)}
                  className="w-full text-xs"
                >
                  <option value="">(None)</option>
                  {contexts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E3D8]">
                <button
                  type="button"
                  onClick={() => setIsCommitmentModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono-tabular text-[#74726A] hover:text-[#171614]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-medium text-[#FBFBF9] bg-[#171614] hover:bg-[#2C2B27] rounded transition-colors"
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
        <div className="fixed inset-0 z-50 bg-[#171614]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border border-[#D8D5C8] rounded shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-baseline justify-between border-b border-[#E5E3D8] pb-3">
              <h3 className="font-serif-chronicle text-2xl text-[#171614]">New Habit</h3>
              <button
                onClick={() => setIsHabitModalOpen(false)}
                className="text-[#74726A] hover:text-[#171614]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateHabit} className="space-y-4">
              <div>
                <label className="text-xs font-mono-tabular uppercase tracking-wider text-[#74726A] block mb-1">
                  Habit Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Read 30 mins, Deep writing..."
                  value={newHabitTitle}
                  onChange={(e) => setNewHabitTitle(e.target.value)}
                  className="w-full text-sm"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono-tabular uppercase tracking-wider text-[#74726A] block mb-1">
                    Frequency
                  </label>
                  <select
                    value={newHabitFrequency}
                    onChange={(e: any) => setNewHabitFrequency(e.target.value)}
                    className="w-full text-xs font-mono-tabular"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY_TARGET">Weekly Target</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-mono-tabular uppercase tracking-wider text-[#74726A] block mb-1">
                    Context
                  </label>
                  <select
                    value={newHabitContextId}
                    onChange={(e) => setNewHabitContextId(e.target.value)}
                    className="w-full text-xs"
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
              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E3D8]">
                <button
                  type="button"
                  onClick={() => setIsHabitModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono-tabular text-[#74726A] hover:text-[#171614]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-medium text-[#FBFBF9] bg-[#171614] hover:bg-[#2C2B27] rounded transition-colors"
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
