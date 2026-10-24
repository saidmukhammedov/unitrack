import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { WeeklyReview } from '@unitrack/contracts';
import {
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Save,
  CheckCircle2,
  Flame,
  Clock,
  Plus,
  Trash2,
  TrendingUp,
} from 'lucide-react';

function getMondayOfCurrentWeek(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff));
  return monday.toISOString().split('T')[0];
}

export function WeeklyReviewView() {
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(getMondayOfCurrentWeek());
  const [review, setReview] = useState<WeeklyReview | null>(null);
  const [allReviews, setAllReviews] = useState<WeeklyReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form fields
  const [whatWentWell, setWhatWentWell] = useState('');
  const [whatToImprove, setWhatToImprove] = useState('');
  const [keyTakeaways, setKeyTakeaways] = useState('');
  const [intentions, setIntentions] = useState<string[]>([]);
  const [newIntention, setNewIntention] = useState('');

  const loadData = async (weekStart: string) => {
    try {
      setIsLoading(true);
      const [reviewData, listData] = await Promise.all([
        api.getReviewForWeek(weekStart),
        api.getWeeklyReviews(),
      ]);

      setReview(reviewData);
      setAllReviews(listData.data);

      setWhatWentWell(reviewData.reflections?.whatWentWell || '');
      setWhatToImprove(reviewData.reflections?.whatToImprove || '');
      setKeyTakeaways(reviewData.reflections?.keyTakeaways || '');
      setIntentions(reviewData.intentions || []);
    } catch (err: any) {
      console.error('Failed to load weekly review:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedWeekStart);
  }, [selectedWeekStart]);

  const handlePrevWeek = () => {
    const current = new Date(selectedWeekStart);
    current.setUTCDate(current.getUTCDate() - 7);
    setSelectedWeekStart(current.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const current = new Date(selectedWeekStart);
    current.setUTCDate(current.getUTCDate() + 7);
    setSelectedWeekStart(current.toISOString().split('T')[0]);
  };

  const handleAddIntention = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIntention.trim()) return;
    setIntentions([...intentions, newIntention.trim()]);
    setNewIntention('');
  };

  const handleRemoveIntention = (idx: number) => {
    setIntentions(intentions.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveSuccess(false);
      const saved = await api.saveWeeklyReview({
        weekStart: selectedWeekStart,
        reflections: {
          whatWentWell,
          whatToImprove,
          keyTakeaways,
        },
        intentions,
      });
      setReview(saved);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      const listData = await api.getWeeklyReviews();
      setAllReviews(listData.data);
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <p className="font-serif-chronicle italic text-slate-400 text-lg">
          Gathering weekly reflections...
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
            <span>Plan & Review</span>
            <span className="text-slate-600">•</span>
            <span>Week {review?.weekNumber || 1}, {review?.year || 2026}</span>
          </div>
          <h1 className="font-serif-chronicle text-3xl sm:text-4xl text-slate-100 font-normal tracking-tight">
            Weekly Planning & Reflection
          </h1>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1 shrink-0">
          <button
            onClick={handlePrevWeek}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Previous Week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono-tabular text-xs text-slate-300 font-semibold px-2">
            {review?.weekStart} — {review?.weekEnd}
          </span>
          <button
            onClick={handleNextWeek}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Next Week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Actual Week Performance Metrics */}
      <section className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Commitments Attended</span>
          </div>
          <span className="font-mono-tabular text-2xl font-bold text-slate-100">
            {review?.metrics.commitmentsAttended ?? 0}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tasks Completed</span>
          </div>
          <span className="font-mono-tabular text-2xl font-bold text-slate-100">
            {review?.metrics.tasksCompleted ?? 0}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Habits Logged</span>
          </div>
          <span className="font-mono-tabular text-2xl font-bold text-slate-100">
            {review?.metrics.habitCompletions ?? 0}
          </span>
        </div>
      </section>

      {/* Reflection Prompts */}
      <section className="space-y-6">
        <h2 className="font-serif-chronicle text-2xl text-slate-200 !text-2xl !font-normal border-b border-slate-800/80 pb-2">
          Retrospective Reflections
        </h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5 uppercase tracking-wider">
              1. What went well this week?
            </label>
            <textarea
              rows={3}
              placeholder="Key achievements, energizing moments, breakthroughs..."
              value={whatWentWell}
              onChange={(e) => setWhatWentWell(e.target.value)}
              className="w-full text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5 uppercase tracking-wider">
              2. What could be improved or simplified?
            </label>
            <textarea
              rows={3}
              placeholder="Friction points, postponed tasks, distractions..."
              value={whatToImprove}
              onChange={(e) => setWhatToImprove(e.target.value)}
              className="w-full text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5 uppercase tracking-wider">
              3. Core takeaway or adjustment for next week
            </label>
            <textarea
              rows={2}
              placeholder="One actionable insight to carry forward..."
              value={keyTakeaways}
              onChange={(e) => setKeyTakeaways(e.target.value)}
              className="w-full text-sm"
            />
          </div>
        </div>
      </section>

      {/* Next Week Intentions */}
      <section className="space-y-4 pt-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between">
          <h2 className="font-serif-chronicle text-2xl text-slate-200 !text-2xl !font-normal !mb-0">
            Intentions & Anchor Objectives
          </h2>
          <span className="text-xs text-slate-500">Top priorities for next week</span>
        </div>

        <form onSubmit={handleAddIntention} className="flex gap-2 !bg-transparent !border-0 !p-0 !shadow-none">
          <input
            type="text"
            placeholder="Add an anchor intention for next week..."
            value={newIntention}
            onChange={(e) => setNewIntention(e.target.value)}
            className="flex-1 text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </form>

        {intentions.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No intentions set yet for this week.</p>
        ) : (
          <div className="space-y-2">
            {intentions.map((intent, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono-tabular text-xs font-bold text-indigo-400">
                    0{idx + 1}
                  </span>
                  <span className="text-sm text-slate-200">{intent}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveIntention(idx)}
                  className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Save bar */}
      <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
        {saveSuccess ? (
          <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Weekly review saved successfully!
          </span>
        ) : (
          <span className="text-xs text-slate-500">
            Reviews capture retrospective performance and anchor focus.
          </span>
        )}

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving...' : 'Save Review'}</span>
        </button>
      </div>
    </div>
  );
}
