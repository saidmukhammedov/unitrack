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
        <div className="w-6 h-6 border-2 border-[#171614] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="font-serif-chronicle italic text-[#74726A] text-lg">
          Gathering daily rhythms & rituals...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      {/* Editorial Header */}
      <header className="border-b border-[#E5E3D8] pb-8 pt-2 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 text-[11px] font-mono-tabular tracking-wider uppercase text-[#74726A]">
            <span>Cadence Ledger</span>
            <span className="text-[#D8D5C8]">•</span>
            <span className="text-[#A33F17] font-semibold">Habit Mastery</span>
          </div>
          <h1 className="font-serif-chronicle text-3xl sm:text-5xl text-[#171614] font-normal tracking-tight">
            Habits & Daily Cadence
          </h1>
          <p className="text-xs text-[#74726A] max-w-xl">
            Repetition establishes character. Log recurring intentions and observe your personal velocity across seasons.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#171614] hover:bg-[#2C2B27] text-[#FBFBF9] rounded text-xs font-medium transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Habit</span>
        </button>
      </header>

      {/* Habit Cards & Matrix */}
      {habits.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-[#E5E3D8] rounded bg-[#F4F3ED]/40">
          <Flame className="w-8 h-8 text-[#A33F17] mx-auto mb-3 opacity-60" />
          <h3 className="font-serif-chronicle text-xl text-[#171614]">No habits registered</h3>
          <p className="text-xs text-[#74726A] mt-1 mb-5 max-w-sm mx-auto">
            Build consistency with daily rituals, weekday routines, or targeted weekly rhythms.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-[#171614] hover:bg-[#2C2B27] text-[#FBFBF9] rounded text-xs font-medium transition-colors cursor-pointer"
          >
            Create Your First Habit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {habits.map((h) => (
            <div
              key={h.id}
              className="p-5 rounded border border-[#E5E3D8] bg-[#FBFBF9] hover:border-[#D8D5C8] flex flex-col justify-between space-y-5 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {h.contextName && (
                        <span
                          className="px-1.5 py-0.2 rounded text-[10px] font-mono-tabular border"
                          style={{
                            borderColor: `${h.contextColor || '#171614'}40`,
                            color: h.contextColor || '#171614',
                          }}
                        >
                          {h.contextName}
                        </span>
                      )}

                      <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-[#74726A]">
                        {h.frequencyType === 'DAILY' && 'Every Day'}
                        {h.frequencyType === 'SELECTED_WEEKDAYS' && 'Scheduled Weekdays'}
                        {h.frequencyType === 'WEEKLY_TARGET' && `${h.targetPerWeek}x / week`}
                      </span>
                    </div>

                    <h3 className="font-serif-chronicle text-xl text-[#171614] font-normal leading-snug">
                      {h.title}
                    </h3>
                  </div>

                  {/* Streak Flame Badge */}
                  <div className="flex flex-col items-end shrink-0">
                    <div className="flex items-center gap-1 text-sm font-mono-tabular font-semibold text-[#A33F17] bg-[#A33F17]/10 border border-[#A33F17]/20 px-2.5 py-1 rounded">
                      <Flame className="w-3.5 h-3.5 text-[#A33F17]" />
                      <span>{h.currentStreak}</span>
                    </div>
                    <span className="text-[10px] text-[#74726A] mt-1 font-mono-tabular">
                      Best: {h.longestStreak}
                    </span>
                  </div>
                </div>

                {h.frequencyType === 'SELECTED_WEEKDAYS' && h.selectedWeekdays.length > 0 && (
                  <div className="flex items-center gap-1 mt-4">
                    {weekdayNames.map((name, idx) => {
                      const isSelected = h.selectedWeekdays.includes(idx);
                      return (
                        <span
                          key={idx}
                          className={`w-6 h-6 rounded text-[10px] font-mono-tabular flex items-center justify-center ${
                            isSelected
                              ? 'bg-[#171614] text-[#FBFBF9] font-medium'
                              : 'bg-[#F4F3ED] text-[#74726A] border border-[#E5E3D8]'
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
              <div className="pt-3 border-t border-[#E5E3D8] flex items-center justify-between">
                <button
                  onClick={() => handleDeleteHabit(h.id)}
                  className="p-1.5 text-[#74726A] hover:text-[#A33F17] rounded transition-colors cursor-pointer"
                  title="Delete habit"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleLogOccurrence(h.id, 'SKIPPED')}
                    className="text-xs font-mono-tabular text-[#74726A] hover:text-[#171614] px-2.5 py-1 rounded transition-colors cursor-pointer"
                    title="Skip today without breaking streak"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => handleLogOccurrence(h.id, 'COMPLETED')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#171614] hover:bg-[#2C2B27] text-[#FBFBF9] text-xs font-medium rounded transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-[#171614]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border border-[#D8D5C8] rounded shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-baseline justify-between border-b border-[#E5E3D8] pb-3">
              <h3 className="font-serif-chronicle text-2xl text-[#171614]">Create Habit</h3>
              <button
                onClick={() => setIsModalOpen(false)}
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
                  placeholder="e.g. Morning 20m Meditation..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-mono-tabular uppercase tracking-wider text-[#74726A] block mb-1">
                  Context
                </label>
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
                <label className="text-xs font-mono-tabular uppercase tracking-wider text-[#74726A] block mb-1">
                  Cadence / Frequency
                </label>
                <select
                  value={frequencyType}
                  onChange={(e: any) => setFrequencyType(e.target.value)}
                  className="w-full text-xs font-mono-tabular"
                >
                  <option value="DAILY">Every Day</option>
                  <option value="SELECTED_WEEKDAYS">Selected Weekdays</option>
                  <option value="WEEKLY_TARGET">Weekly Target (X times/week)</option>
                </select>
              </div>

              {frequencyType === 'SELECTED_WEEKDAYS' && (
                <div>
                  <label className="text-xs font-mono-tabular uppercase tracking-wider text-[#74726A] block mb-1.5">
                    Active Weekdays
                  </label>
                  <div className="flex gap-1.5">
                    {weekdayNames.map((name, idx) => {
                      const isSelected = selectedWeekdays.includes(idx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleWeekday(idx)}
                          className={`flex-1 py-1.5 rounded text-xs font-mono-tabular transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#171614] text-[#FBFBF9] font-semibold'
                              : 'bg-[#F4F3ED] text-[#74726A] border border-[#E5E3D8]'
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
                  <label className="text-xs font-mono-tabular uppercase tracking-wider text-[#74726A] block mb-1">
                    Target times per week
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={targetPerWeek}
                    onChange={(e) => setTargetPerWeek(Number(e.target.value))}
                    className="w-full text-xs font-mono-tabular"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E3D8]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono-tabular text-[#74726A] hover:text-[#171614]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-medium text-[#FBFBF9] bg-[#171614] hover:bg-[#2C2B27] rounded transition-colors"
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
