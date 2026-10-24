import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { Habit, Context } from '@unitrack/contracts';
import {
  Flame,
  Plus,
  Check,
  Calendar,
  Trash2,
  X,
  RotateCcw,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

export function HabitsView() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [contexts, setContexts] = useState<Context[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [contextId, setContextId] = useState('');
  const [frequencyType, setFrequencyType] = useState<'DAILY' | 'SELECTED_WEEKDAYS' | 'WEEKLY_TARGET'>('DAILY');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [targetPerWeek, setTargetPerWeek] = useState<number>(3);
  const [targetUnits, setTargetUnits] = useState<number>(1);
  const [unitLabel, setUnitLabel] = useState<string>('mins');

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [habitsRes, contextsRes] = await Promise.all([
        api.getHabits(),
        api.getContexts(),
      ]);
      setHabits(habitsRes.data);
      setContexts(contextsRes.data);
    } catch (err: any) {
      console.error('Failed to load habits:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogOccurrence = async (habitId: string, status: 'COMPLETED' | 'SKIPPED') => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      await api.logHabitOccurrence(habitId, {
        date: todayStr,
        status,
        completedUnits: 1,
      });
      await loadData();
    } catch (err: any) {
      alert(`Could not log habit: ${err.message}`);
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    if (!window.confirm('Are you sure you want to delete this habit?')) return;
    try {
      await api.deleteHabit(habitId);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await api.createHabit({
        title: title.trim(),
        contextId: contextId || undefined,
        frequencyType,
        selectedWeekdays: frequencyType === 'SELECTED_WEEKDAYS' ? selectedWeekdays : undefined,
        targetPerWeek: frequencyType === 'WEEKLY_TARGET' ? targetPerWeek : undefined,
        targetUnits: targetUnits || 1,
        unitLabel: unitLabel.trim() || undefined,
      });

      setTitle('');
      setContextId('');
      setFrequencyType('DAILY');
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleWeekday = (day: number) => {
    if (selectedWeekdays.includes(day)) {
      setSelectedWeekdays(selectedWeekdays.filter((d) => d !== day));
    } else {
      setSelectedWeekdays([...selectedWeekdays, day].sort());
    }
  };

  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <p className="font-serif-chronicle italic text-slate-400 text-lg">
          Gathering daily rhythms...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <header className="border-b border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">
            <span>Rhythm & Cadence</span>
            <span className="text-slate-600">•</span>
            <span>Habit Mastery</span>
          </div>
          <h1 className="font-serif-chronicle text-3xl sm:text-4xl text-slate-100 font-normal tracking-tight">
            Habits & Daily Cadence
          </h1>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-semibold shadow-md transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Habit</span>
        </button>
      </header>

      {/* Habit List */}
      {habits.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
          <Flame className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">No habits tracked yet</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Build consistency with daily rituals, weekday routines, or weekly targets.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs font-medium border border-amber-500/30 transition-colors"
          >
            Create Your First Habit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {habits.map((h) => (
            <div
              key={h.id}
              className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {h.contextName && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{
                            backgroundColor: `${h.contextColor || '#6366f1'}20`,
                            color: h.contextColor || '#818cf8',
                          }}
                        >
                          {h.contextName}
                        </span>
                      )}

                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                        {h.frequencyType === 'DAILY' && 'Every Day'}
                        {h.frequencyType === 'SELECTED_WEEKDAYS' && 'Scheduled Weekdays'}
                        {h.frequencyType === 'WEEKLY_TARGET' && `${h.targetPerWeek}x / week`}
                      </span>
                    </div>

                    <h3 className="font-serif-chronicle text-xl text-slate-100 font-normal">
                      {h.title}
                    </h3>
                  </div>

                  {/* Streak Flame Badge */}
                  <div className="flex flex-col items-end shrink-0">
                    <div className="flex items-center gap-1 text-sm font-mono-tabular font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                      <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span>{h.currentStreak}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 font-mono-tabular">
                      Best: {h.longestStreak}
                    </span>
                  </div>
                </div>

                {h.frequencyType === 'SELECTED_WEEKDAYS' && h.selectedWeekdays.length > 0 && (
                  <div className="flex items-center gap-1 mt-3">
                    {weekdayNames.map((name, idx) => {
                      const isSelected = h.selectedWeekdays.includes(idx);
                      return (
                        <span
                          key={idx}
                          className={`w-6 h-6 rounded-md text-[10px] font-semibold flex items-center justify-center ${
                            isSelected
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-950 text-slate-600'
                          }`}
                        >
                          {(name || '').charAt(0)}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <button
                  onClick={() => handleDeleteHabit(h.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                  title="Delete habit"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleLogOccurrence(h.id, 'SKIPPED')}
                    className="text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors"
                    title="Skip today without breaking streak"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => handleLogOccurrence(h.id, 'COMPLETED')}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Done Today</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE HABIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif-chronicle text-xl text-slate-100">Create Habit</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateHabit} className="space-y-4 !bg-transparent !border-0 !p-0 !shadow-none">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Habit Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Morning 20m Meditation..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Context</label>
                <select
                  value={contextId}
                  onChange={(e) => setContextId(e.target.value)}
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

              <div>
                <label className="text-xs text-slate-400 block mb-1">Cadence / Frequency</label>
                <select
                  value={frequencyType}
                  onChange={(e: any) => setFrequencyType(e.target.value)}
                  className="w-full text-xs"
                >
                  <option value="DAILY">Every Day</option>
                  <option value="SELECTED_WEEKDAYS">Selected Weekdays</option>
                  <option value="WEEKLY_TARGET">Weekly Target (X times/week)</option>
                </select>
              </div>

              {frequencyType === 'SELECTED_WEEKDAYS' && (
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5">Active Weekdays</label>
                  <div className="flex gap-1.5">
                    {weekdayNames.map((name, idx) => {
                      const isSelected = selectedWeekdays.includes(idx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleWeekday(idx)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-amber-400 text-slate-950 font-bold'
                              : 'bg-slate-950 text-slate-400 border border-slate-800'
                          }`}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {frequencyType === 'WEEKLY_TARGET' && (
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Target times per week</label>
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={targetPerWeek}
                    onChange={(e) => setTargetPerWeek(Number(e.target.value))}
                    className="w-full text-xs"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-md"
                >
                  Save Habit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
