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
  Check,
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
        <div className="w-6 h-6 border-2 border-[#171614] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="font-serif-chronicle italic text-[#74726A] text-lg">
          Gathering weekly reflections & observations...
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
            <span>Retrospective Ledger</span>
            <span className="text-[#D8D5C8]">•</span>
            <span>Week {review?.weekNumber || 1}, {review?.year || 2026}</span>
          </div>
          <h1 className="font-serif-chronicle text-3xl sm:text-5xl text-[#171614] font-normal tracking-tight">
            Weekly Planning & Reflection
          </h1>
          <p className="text-xs text-[#74726A] max-w-xl">
            A sacred space for honest appraisal. Reconcile intended plans against reality, distill lessons, and set clear anchors for the week ahead.
          </p>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-2 border border-[#E5E3D8] bg-[#FBFBF9] rounded p-1 shrink-0">
          <button
            onClick={handlePrevWeek}
            className="p-1.5 text-[#74726A] hover:text-[#171614] rounded hover:bg-[#F4F3ED] transition-colors cursor-pointer"
            title="Previous Week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono-tabular text-xs text-[#171614] font-semibold px-2">
            {review?.weekStart} — {review?.weekEnd}
          </span>
          <button
            onClick={handleNextWeek}
            className="p-1.5 text-[#74726A] hover:text-[#171614] rounded hover:bg-[#F4F3ED] transition-colors cursor-pointer"
            title="Next Week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Actual Week Performance Metrics */}
      <section className="grid grid-cols-3 gap-4 border border-[#E5E3D8] rounded p-4 bg-[#FBFBF9]">
        <div className="text-center sm:text-left sm:pl-4">
          <div className="flex items-center gap-1.5 text-[10px] font-mono-tabular uppercase tracking-wider text-[#74726A] mb-1">
            <Clock className="w-3 h-3 text-[#171614]" />
            <span>Commitments Attended</span>
          </div>
          <span className="font-serif-chronicle text-2xl sm:text-3xl font-medium text-[#171614]">
            {review?.metrics.commitmentsAttended ?? 0}
          </span>
        </div>

        <div className="text-center sm:text-left sm:border-l border-[#E5E3D8] sm:pl-6">
          <div className="flex items-center gap-1.5 text-[10px] font-mono-tabular uppercase tracking-wider text-[#74726A] mb-1">
            <CheckCircle2 className="w-3 h-3 text-[#2C4839]" />
            <span>Tasks Completed</span>
          </div>
          <span className="font-serif-chronicle text-2xl sm:text-3xl font-medium text-[#2C4839]">
            {review?.metrics.tasksCompleted ?? 0}
          </span>
        </div>

        <div className="text-center sm:text-left sm:border-l border-[#E5E3D8] sm:pl-6">
          <div className="flex items-center gap-1.5 text-[10px] font-mono-tabular uppercase tracking-wider text-[#74726A] mb-1">
            <Flame className="w-3 h-3 text-[#A33F17]" />
            <span>Habits Logged</span>
          </div>
          <span className="font-serif-chronicle text-2xl sm:text-3xl font-medium text-[#A33F17]">
            {review?.metrics.habitCompletions ?? 0}
          </span>
        </div>
      </section>

      {/* Reflection Prompts */}
      <section className="space-y-6">
        <h2 className="font-serif-chronicle text-2xl text-[#171614] font-normal border-b border-[#E5E3D8] pb-2">
          Retrospective Reflections
        </h2>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-mono-tabular uppercase tracking-wider text-[#74726A] block">
              1. What went well this week?
            </label>
            <textarea
              rows={3}
              placeholder="Key achievements, energizing moments, breakthroughs, commitments fulfilled..."
              value={whatWentWell}
              onChange={(e) => setWhatWentWell(e.target.value)}
              className="w-full text-sm leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono-tabular uppercase tracking-wider text-[#74726A] block">
              2. What could be improved or simplified?
            </label>
            <textarea
              rows={3}
              placeholder="Friction points, postponed tasks, energy drains, systemic miscalculations..."
              value={whatToImprove}
              onChange={(e) => setWhatToImprove(e.target.value)}
              className="w-full text-sm leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono-tabular uppercase tracking-wider text-[#74726A] block">
              3. Core takeaway or adjustment for next week
            </label>
            <textarea
              rows={2}
              placeholder="One actionable rule or standard to anchor your upcoming cycle..."
              value={keyTakeaways}
              onChange={(e) => setKeyTakeaways(e.target.value)}
              className="w-full text-sm leading-relaxed"
            />
          </div>
        </div>
      </section>

      {/* Next Week Intentions */}
      <section className="space-y-4 pt-6 border-t border-[#E5E3D8]">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif-chronicle text-2xl text-[#171614] font-normal !mb-0">
            Intentions & Anchor Objectives
          </h2>
          <span className="text-xs font-mono-tabular text-[#74726A]">Priorities for next cycle</span>
        </div>

        <form onSubmit={handleAddIntention} className="flex gap-2">
          <input
            type="text"
            placeholder="Add an anchor intention for next week..."
            value={newIntention}
            onChange={(e) => setNewIntention(e.target.value)}
            className="flex-1 text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-[#171614] hover:bg-[#2C2B27] text-[#FBFBF9] rounded text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </form>

        {intentions.length === 0 ? (
          <p className="text-xs text-[#74726A] font-serif-chronicle italic">
            No intentions registered for next week yet. Anchor your focus with 1 to 3 core goals.
          </p>
        ) : (
          <div className="divide-y divide-[#E5E3D8] border border-[#E5E3D8] rounded bg-[#FBFBF9]">
            {intentions.map((intent, idx) => (
              <div
                key={idx}
                className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#F4F3ED]/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono-tabular text-xs font-bold text-[#A33F17]">
                    0{idx + 1}
                  </span>
                  <span className="text-sm text-[#171614]">{intent}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveIntention(idx)}
                  className="p-1 text-[#74726A] hover:text-[#A33F17] transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Save bar */}
      <div className="pt-6 border-t border-[#E5E3D8] flex items-center justify-between">
        {saveSuccess ? (
          <span className="text-xs font-semibold text-[#2C4839] flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Retrospective saved to the archive!
          </span>
        ) : (
          <span className="text-xs text-[#74726A]">
            Reviews form your permanent personal history and inform the daily rhythm.
          </span>
        )}

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-6 py-2 bg-[#171614] hover:bg-[#2C2B27] text-[#FBFBF9] font-medium text-xs rounded transition-colors cursor-pointer disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'Saving...' : 'Save Review'}</span>
        </button>
      </div>
    </div>
  );
}
