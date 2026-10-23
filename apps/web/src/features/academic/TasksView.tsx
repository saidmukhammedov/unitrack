import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { AcademicPeriod, Subject, Task, CreateTaskInput, TaskType } from '@unitrack/contracts';

export function TasksView() {
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'PENDING' | 'COMPLETED' | 'ALL'>('PENDING');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('HOMEWORK');
  const [subjectId, setSubjectId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `task_${Date.now()}`
  );

  useEffect(() => {
    async function init() {
      try {
        const res = await api.getPeriods();
        setPeriods(res.data);
        if (res.data.length > 0) {
          setSelectedPeriodId(res.data[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load periods');
      }
    }
    init();
  }, []);

  const loadData = async (periodId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const completedQuery = filter === 'ALL' ? 'all' : filter === 'COMPLETED' ? 'true' : 'false';
      const [subsRes, tasksRes] = await Promise.all([
        periodId ? api.getSubjectsByPeriod(periodId) : Promise.resolve({ data: [] }),
        api.getTasks({ periodId, completed: completedQuery }),
      ]);
      setSubjects(subsRes.data);
      setTasks(tasksRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedPeriodId);
  }, [selectedPeriodId, filter]);

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const input: CreateTaskInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        taskType,
        subjectId: subjectId || undefined,
        periodId: selectedPeriodId || undefined,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
      };
      // §SYNC-06 / §SYNC-07: Pass idempotency key on mutation
      await api.createTask(input, idempotencyKey);
      setTitle('');
      setDescription('');
      setDueAt('');
      setIdempotencyKey(typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `task_${Date.now()}`);
      await loadData(selectedPeriodId);
    } catch (err: any) {
      // §SYNC-05: Form state is preserved on failure for safe client retry
      setError(err.message || 'Connection or server error. Your input has been preserved.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (task: Task) => {
    try {
      await api.updateTask(task.id, {
        completedAt: task.isCompleted ? null : new Date().toISOString(),
      });
      await loadData(selectedPeriodId);
    } catch (err: any) {
      alert(err.message || 'Failed to update task status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.deleteTask(id);
      await loadData(selectedPeriodId);
    } catch (err: any) {
      alert(err.message || 'Failed to delete task');
    }
  };

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '1rem', fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ fontSize: 22, color: '#1a365d', marginBottom: 12 }}>Tasks & Assignments</h2>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>
        Track homework, readings, project milestones, and deadlines.
      </p>

      {error && (
        <div style={{ background: '#fff5f5', color: '#c53030', padding: 12, borderRadius: 6, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ {error}</span>
          <button
            onClick={() => handleCreate()}
            disabled={submitting}
            style={{
              background: '#c53030',
              color: '#fff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: 4,
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            {submitting ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      )}

      {/* Period Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <label style={{ fontSize: 14, fontWeight: 600, color: '#2d3748' }}>Active Period:</label>
        <select
          value={selectedPeriodId}
          onChange={(e) => setSelectedPeriodId(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #cbd5e0', fontSize: 14 }}
        >
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Create Task Form */}
      <form onSubmit={handleCreate} style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 16 }}>New Task</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4 }}>Title *</label>
            <input
              type="text"
              placeholder="e.g. Chapter 4 Problem Set"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #cbd5e0', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4 }}>Subject</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #cbd5e0', boxSizing: 'border-box' }}
            >
              <option value="">(None)</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4 }}>Type</label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value as any)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #cbd5e0', boxSizing: 'border-box' }}
            >
              <option value="HOMEWORK">Homework</option>
              <option value="READING">Reading</option>
              <option value="PROJECT">Project</option>
              <option value="LAB">Lab</option>
              <option value="PRESENTATION">Presentation</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4 }}>Due Date & Time</label>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #cbd5e0', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            background: '#2b6cb0',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 4,
            cursor: submitting ? 'not-allowed' : 'pointer',
            fontWeight: 600,
          }}
        >
          {submitting ? 'Adding...' : 'Add Task'}
        </button>
      </form>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['PENDING', 'COMPLETED', 'ALL'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: filter === tab ? '1px solid #2b6cb0' : '1px solid #e2e8f0',
              background: filter === tab ? '#ebf8ff' : '#fff',
              color: filter === tab ? '#2b6cb0' : '#4a5568',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Task List */}
      {loading ? (
        <p>Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <p style={{ color: '#718096' }}>No {filter.toLowerCase()} tasks found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks.map((t) => (
            <div
              key={t.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  type="checkbox"
                  checked={t.isCompleted}
                  onChange={() => handleToggle(t)}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <div>
                  <span
                    style={{
                      fontSize: 15,
                      color: t.isCompleted ? '#a0aec0' : '#1a202c',
                      textDecoration: t.isCompleted ? 'line-through' : 'none',
                      fontWeight: 500,
                    }}
                  >
                    {t.title}
                  </span>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                    {t.subjectName && (
                      <span
                        style={{
                          fontSize: 11,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: '#edf2f7',
                          color: '#2d3748',
                          fontWeight: 600,
                        }}
                      >
                        {t.subjectName}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 11,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: '#edf2f7',
                        color: '#4a5568',
                        fontWeight: 600,
                      }}
                    >
                      {t.taskType}
                    </span>
                    {t.dueAt && (
                      <span style={{ fontSize: 12, color: '#718096' }}>
                        📅 Due: {new Date(t.dueAt).toLocaleDateString()} {new Date(t.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDelete(t.id)}
                style={{
                  background: 'transparent',
                  color: '#e53e3e',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}