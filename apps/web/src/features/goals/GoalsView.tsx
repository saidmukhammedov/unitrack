import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { Goal, Context, CreateGoalInput } from '@unitrack/contracts';
import {
  Target,
  Plus,
  CheckCircle2,
  Circle,
  Calendar,
  X,
  Trash2,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Tag,
  Check,
} from 'lucide-react';

export function GoalsView() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [contexts, setContexts] = useState<Context[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [expandedGoalIds, setExpandedGoalIds] = useState<Set<string>>(new Set());

  // Modal State
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [newContextId, setNewContextId] = useState('');
  const [initialMilestones, setInitialMilestones] = useState<string[]>(['']);

  // Add Milestone Inline
  const [addingMilestoneGoalId, setAddingMilestoneGoalId] = useState<string | null>(null);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [goalsRes, contextsRes] = await Promise.all([
        api.getGoals(),
        api.getContexts(),
      ]);
      setGoals(goalsRes.data);
      setContexts(contextsRes.data);
      // Auto-expand all active goals
      setExpandedGoalIds(new Set(goalsRes.data.map((g) => g.id)));
    } catch (err: any) {
      console.error('Failed to load goals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleExpand = (goalId: string) => {
    const next = new Set(expandedGoalIds);
    if (next.has(goalId)) {
      next.delete(goalId);
    } else {
      next.add(goalId);
    }
    setExpandedGoalIds(next);
  };

  const handleToggleMilestone = async (goalId: string, milestoneId: string, currentlyCompleted: boolean) => {
    try {
      await api.updateMilestone(goalId, milestoneId, {
        isCompleted: !currentlyCompleted,
      });
      await loadData();
    } catch (err: any) {
      alert(`Could not update milestone: ${err.message}`);
    }
  };

  const handleCreateMilestone = async (goalId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim()) return;
    try {
      await api.createMilestone(goalId, {
        title: newMilestoneTitle.trim(),
      });
      setNewMilestoneTitle('');
      setAddingMilestoneGoalId(null);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!window.confirm('Are you sure you want to delete this goal and its milestones?')) return;
    try {
      await api.deleteGoal(goalId);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const validMilestones = initialMilestones
        .filter((m) => m.trim().length > 0)
        .map((title, idx) => ({ title: title.trim(), sortOrder: idx }));

      await api.createGoal({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        targetDate: newTargetDate || undefined,
        contextId: newContextId || undefined,
        initialMilestones: validMilestones.length > 0 ? validMilestones : undefined,
      });

      setNewTitle('');
      setNewDescription('');
      setNewTargetDate('');
      setNewContextId('');
      setInitialMilestones(['']);
      setIsGoalModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredGoals = goals.filter((g) => {
    if (statusFilter === 'ALL') return true;
    return g.status === statusFilter;
  });

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <p className="font-serif-chronicle italic text-slate-400 text-lg">
          Loading meaningful aspirations...
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
            <span>Aspirations & Horizon</span>
            <span className="text-slate-600">•</span>
            <span>Strategic Direction</span>
          </div>
          <h1 className="font-serif-chronicle text-3xl sm:text-4xl text-slate-100 font-normal tracking-tight">
            Goals & Key Milestones
          </h1>
        </div>

        <button
          onClick={() => setIsGoalModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Goal</span>
        </button>
      </header>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {['ALL', 'IN_PROGRESS', 'COMPLETED', 'PAUSED'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              statusFilter === status
                ? 'bg-slate-200 text-slate-900 font-semibold'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Goal Cards */}
      {filteredGoals.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
          <Target className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">No goals found</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Set deliberate goals and decompose them into actionable milestones.
          </p>
          <button
            onClick={() => setIsGoalModalOpen(true)}
            className="px-3.5 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 rounded-lg text-xs font-medium border border-indigo-500/30 transition-colors"
          >
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGoals.map((goal) => {
            const isExpanded = expandedGoalIds.has(goal.id);
            const isCompleted = goal.status === 'COMPLETED' || goal.progressPercentage === 100;

            return (
              <div
                key={goal.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden transition-all"
              >
                {/* Goal summary header */}
                <div className="p-5 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] ${
                          isCompleted
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                        }`}
                      >
                        {goal.status.replace('_', ' ')}
                      </span>

                      {goal.contextName && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{
                            backgroundColor: `${goal.contextColor || '#6366f1'}20`,
                            color: goal.contextColor || '#818cf8',
                          }}
                        >
                          {goal.contextName}
                        </span>
                      )}

                      {goal.targetDate && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono-tabular">
                          <Calendar className="w-3 h-3 text-slate-500" /> Target: {goal.targetDate}
                        </span>
                      )}
                    </div>

                    <h3 className="font-serif-chronicle text-xl text-slate-100 font-normal">
                      {goal.title}
                    </h3>

                    {goal.description && (
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {goal.description}
                      </p>
                    )}

                    {/* Progress Bar */}
                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${goal.progressPercentage}%` }}
                        />
                      </div>
                      <span className="font-mono-tabular text-xs font-bold text-slate-300 w-12 text-right">
                        {goal.progressPercentage}%
                      </span>
                    </div>
                  </div>

                  {/* Actions & Chevron */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Delete Goal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleExpand(goal.id)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Milestones list (collapsible) */}
                {isExpanded && (
                  <div className="border-t border-slate-800/80 bg-slate-950/40 p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
                      <span>Actionable Milestones ({goal.milestones.length})</span>
                      <button
                        onClick={() => setAddingMilestoneGoalId(goal.id)}
                        className="text-indigo-400 hover:text-indigo-300 text-[11px] flex items-center gap-1 capitalize"
                      >
                        <Plus className="w-3 h-3" /> Add Milestone
                      </button>
                    </div>

                    {/* Inline Add Milestone form */}
                    {addingMilestoneGoalId === goal.id && (
                      <form
                        onSubmit={(e) => handleCreateMilestone(goal.id, e)}
                        className="flex gap-2 !bg-transparent !border-0 !p-0 !shadow-none"
                      >
                        <input
                          type="text"
                          placeholder="Milestone title..."
                          value={newMilestoneTitle}
                          onChange={(e) => setNewMilestoneTitle(e.target.value)}
                          className="flex-1 text-xs"
                          autoFocus
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddingMilestoneGoalId(null)}
                          className="px-2 text-xs text-slate-500 hover:text-white"
                        >
                          Cancel
                        </button>
                      </form>
                    )}

                    {goal.milestones.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No milestones defined yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {goal.milestones.map((m) => (
                          <div
                            key={m.id}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                              m.isCompleted
                                ? 'bg-slate-900/30 border-slate-800/50 opacity-60'
                                : 'bg-slate-900/70 border-slate-800'
                            }`}
                          >
                            <button
                              onClick={() => handleToggleMilestone(goal.id, m.id, m.isCompleted)}
                              className={`rounded cursor-pointer ${
                                m.isCompleted ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              {m.isCompleted ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <Circle className="w-4 h-4" />
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <span
                                className={`text-xs font-medium block truncate ${
                                  m.isCompleted ? 'line-through text-slate-500' : 'text-slate-200'
                                }`}
                              >
                                {m.title}
                              </span>
                            </div>

                            {m.targetDate && (
                              <span className="font-mono-tabular text-[10px] text-slate-500">
                                {m.targetDate}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE GOAL MODAL */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif-chronicle text-xl text-slate-100">Set New Goal</h3>
              <button onClick={() => setIsGoalModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4 !bg-transparent !border-0 !p-0 !shadow-none">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Goal Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master React Native, Run a Half Marathon..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Why does this matter? What does success look like?"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Target Date</label>
                  <input
                    type="date"
                    value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    className="w-full text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Context</label>
                  <select
                    value={newContextId}
                    onChange={(e) => setNewContextId(e.target.value)}
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

              {/* Initial Milestones */}
              <div className="space-y-2">
                <label className="text-xs text-slate-400 block">Initial Milestones</label>
                {initialMilestones.map((m, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      placeholder={`Milestone #${idx + 1}`}
                      value={m}
                      onChange={(e) => {
                        const copy = [...initialMilestones];
                        copy[idx] = e.target.value;
                        setInitialMilestones(copy);
                      }}
                      className="flex-1 text-xs"
                    />
                    {initialMilestones.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setInitialMilestones(initialMilestones.filter((_, i) => i !== idx))
                        }
                        className="p-1 text-slate-500 hover:text-rose-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setInitialMilestones([...initialMilestones, ''])}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-1"
                >
                  <Plus className="w-3 h-3" /> Add another milestone
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
