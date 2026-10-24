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
        <div className="w-6 h-6 border-2 border-[#171614] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="font-serif-chronicle italic text-[#74726A] text-lg">
          Charting strategic horizons & aspirations...
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
            <span>Horizons Ledger</span>
            <span className="text-[#D8D5C8]">•</span>
            <span className="text-[#1E2D42] font-semibold">Strategic Direction</span>
          </div>
          <h1 className="font-serif-chronicle text-3xl sm:text-5xl text-[#171614] font-normal tracking-tight">
            Goals & Key Milestones
          </h1>
          <p className="text-xs text-[#74726A] max-w-xl">
            Long-term aspirations broken into verifiable checkpoints. Measure your progress by tangible milestones achieved.
          </p>
        </div>

        <button
          onClick={() => setIsGoalModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#171614] hover:bg-[#2C2B27] text-[#FBFBF9] rounded text-xs font-medium transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Goal</span>
        </button>
      </header>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#74726A] mr-1">
          Status:
        </span>
        {['ALL', 'IN_PROGRESS', 'COMPLETED', 'PAUSED'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1 text-xs rounded transition-all cursor-pointer font-mono-tabular ${
              statusFilter === status
                ? 'bg-[#171614] text-[#FBFBF9] font-medium'
                : 'text-[#74726A] hover:text-[#171614] hover:bg-[#F4F3ED] border border-[#E5E3D8]'
            }`}
          >
            {status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Goal Cards */}
      {filteredGoals.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-[#E5E3D8] rounded bg-[#F4F3ED]/40">
          <Target className="w-8 h-8 text-[#1E2D42] mx-auto mb-3 opacity-60" />
          <h3 className="font-serif-chronicle text-xl text-[#171614]">No goals found</h3>
          <p className="text-xs text-[#74726A] mt-1 mb-5 max-w-sm mx-auto">
            Set deliberate goals and decompose them into actionable, accountable milestones.
          </p>
          <button
            onClick={() => setIsGoalModalOpen(true)}
            className="px-4 py-2 bg-[#171614] hover:bg-[#2C2B27] text-[#FBFBF9] rounded text-xs font-medium transition-colors cursor-pointer"
          >
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredGoals.map((goal) => {
            const isExpanded = expandedGoalIds.has(goal.id);
            const isCompleted = goal.status === 'COMPLETED' || goal.progressPercentage === 100;

            return (
              <div
                key={goal.id}
                className="rounded border border-[#E5E3D8] bg-[#FBFBF9] hover:border-[#D8D5C8] transition-all overflow-hidden"
              >
                {/* Goal summary header */}
                <div className="p-5 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono-tabular uppercase tracking-wider border ${
                          isCompleted
                            ? 'bg-[#2C4839]/10 text-[#2C4839] border-[#2C4839]/20'
                            : 'bg-[#1E2D42]/10 text-[#1E2D42] border-[#1E2D42]/20'
                        }`}
                      >
                        {goal.status.replace('_', ' ')}
                      </span>

                      {goal.contextName && (
                        <span
                          className="px-1.5 py-0.2 rounded text-[10px] font-mono-tabular border"
                          style={{
                            borderColor: `${goal.contextColor || '#171614'}40`,
                            color: goal.contextColor || '#171614',
                          }}
                        >
                          {goal.contextName}
                        </span>
                      )}

                      {goal.targetDate && (
                        <span className="text-[11px] text-[#74726A] flex items-center gap-1 font-mono-tabular">
                          <Calendar className="w-3 h-3 text-[#74726A]" /> Target: {goal.targetDate}
                        </span>
                      )}
                    </div>

                    <h3 className="font-serif-chronicle text-2xl text-[#171614] font-normal">
                      {goal.title}
                    </h3>

                    {goal.description && (
                      <p className="text-xs text-[#74726A] leading-relaxed max-w-2xl">
                        {goal.description}
                      </p>
                    )}

                    {/* Progress Bar */}
                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex-1 h-1.5 rounded-full bg-[#E5E3D8] overflow-hidden">
                        <div
                          className="h-full bg-[#171614] transition-all duration-500"
                          style={{ width: `${goal.progressPercentage}%` }}
                        />
                      </div>
                      <span className="font-mono-tabular text-xs font-semibold text-[#171614] w-12 text-right">
                        {goal.progressPercentage}%
                      </span>
                    </div>
                  </div>

                  {/* Actions & Chevron */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-1.5 text-[#74726A] hover:text-[#A33F17] rounded transition-colors cursor-pointer"
                      title="Delete Goal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleExpand(goal.id)}
                      className="p-1.5 text-[#74726A] hover:text-[#171614] rounded transition-colors cursor-pointer"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Milestones list (collapsible) */}
                {isExpanded && (
                  <div className="border-t border-[#E5E3D8] bg-[#F4F3ED]/40 p-5 space-y-4">
                    <div className="flex items-center justify-between text-xs text-[#74726A] font-mono-tabular uppercase tracking-wider">
                      <span>Actionable Milestones ({goal.milestones.length})</span>
                      <button
                        onClick={() => setAddingMilestoneGoalId(goal.id)}
                        className="text-[#171614] hover:underline text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add Milestone
                      </button>
                    </div>

                    {/* Inline Add Milestone form */}
                    {addingMilestoneGoalId === goal.id && (
                      <form
                        onSubmit={(e) => handleCreateMilestone(goal.id, e)}
                        className="flex gap-2"
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
                          className="px-3 py-1 bg-[#171614] text-[#FBFBF9] rounded text-xs font-medium"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddingMilestoneGoalId(null)}
                          className="px-2 text-xs font-mono-tabular text-[#74726A] hover:text-[#171614]"
                        >
                          Cancel
                        </button>
                      </form>
                    )}

                    {goal.milestones.length === 0 ? (
                      <p className="text-xs text-[#74726A] font-serif-chronicle italic">
                        No milestones defined yet. Break this horizon into incremental steps.
                      </p>
                    ) : (
                      <div className="divide-y divide-[#E5E3D8] border border-[#E5E3D8] rounded bg-[#FBFBF9]">
                        {goal.milestones.map((m) => (
                          <div
                            key={m.id}
                            className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                              m.isCompleted ? 'opacity-40 bg-[#F4F3ED]/30' : 'hover:bg-[#F4F3ED]/40'
                            }`}
                          >
                            <button
                              onClick={() => handleToggleMilestone(goal.id, m.id, m.isCompleted)}
                              className="text-[#171614] cursor-pointer"
                            >
                              {m.isCompleted ? (
                                <div className="w-4 h-4 rounded-xs border border-[#2C4839] bg-[#2C4839] text-[#FBFBF9] flex items-center justify-center">
                                  <Check className="w-3 h-3" />
                                </div>
                              ) : (
                                <div className="w-4 h-4 rounded-xs border border-[#74726A] hover:border-[#171614] bg-[#FBFBF9]" />
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <span
                                className={`text-xs block truncate ${
                                  m.isCompleted ? 'line-through text-[#74726A]' : 'text-[#171614] font-medium'
                                }`}
                              >
                                {m.title}
                              </span>
                            </div>

                            {m.targetDate && (
                              <span className="font-mono-tabular text-[10px] text-[#74726A]">
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
        <div className="fixed inset-0 z-50 bg-[#171614]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border border-[#D8D5C8] rounded shadow-xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-baseline justify-between border-b border-[#E5E3D8] pb-3">
              <h3 className="font-serif-chronicle text-2xl text-[#171614]">Set New Goal</h3>
              <button
                onClick={() => setIsGoalModalOpen(false)}
                className="text-[#74726A] hover:text-[#171614]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="text-xs font-mono-tabular uppercase tracking-wider text-[#74726A] block mb-1">
                  Goal Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master React Native, Run a Half Marathon..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-mono-tabular uppercase tracking-wider text-[#74726A] block mb-1">
                  Description (Optional)
                </label>
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
                  <label className="text-xs font-mono-tabular uppercase tracking-wider text-[#74726A] block mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    className="w-full text-xs font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono-tabular uppercase tracking-wider text-[#74726A] block mb-1">
                    Context
                  </label>
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
                <label className="text-xs font-mono-tabular uppercase tracking-wider text-[#74726A] block">
                  Initial Milestones
                </label>
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
                        className="p-1 text-[#74726A] hover:text-[#A33F17]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setInitialMilestones([...initialMilestones, ''])}
                  className="text-xs text-[#171614] hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add another milestone
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E3D8]">
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono-tabular text-[#74726A] hover:text-[#171614]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-medium text-[#FBFBF9] bg-[#171614] hover:bg-[#2C2B27] rounded transition-colors"
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
