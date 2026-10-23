import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { AcademicPeriod, Subject, Assessment, CreateAssessmentInput, AssessmentType, AssessmentStatus } from '@unitrack/contracts';

export function AssessmentsView() {
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  // Form state
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('EXAM');
  const [scheduledAt, setScheduledAt] = useState('');
  const [maxScore, setMaxScore] = useState<number>(100);
  const [rawScore, setRawScore] = useState<string>('');
  const [weight, setWeight] = useState<number>(20);
  const [status, setStatus] = useState<AssessmentStatus>('SCHEDULED');
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `assess_${Date.now()}`
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

  const loadData = async (periodId: string) => {
    if (!periodId) return;
    setLoading(true);
    setError(null);
    try {
      const [subsRes, assessRes] = await Promise.all([
        api.getSubjectsByPeriod(periodId),
        api.getAssessments({ periodId }),
      ]);
      setSubjects(subsRes.data);
      if (subsRes.data.length > 0) {
        setSubjectId((prev) => prev || subsRes.data[0].id);
      }
      setAssessments(assessRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPeriodId) {
      loadData(selectedPeriodId);
    }
  }, [selectedPeriodId]);

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!subjectId) {
      setError('Please select a subject');
      return;
    }
    if (!title.trim()) {
      setError('Assessment title is required');
      return;
    }
    if (!scheduledAt) {
      setError('Scheduled date and time is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    setWarning(null);

    try {
      const input: CreateAssessmentInput = {
        subjectId,
        title: title.trim(),
        assessmentType,
        scheduledAt: new Date(scheduledAt).toISOString(),
        weight: Number(weight) || 0,
      };
      // §SYNC-06 / §SYNC-07: Pass idempotency key on mutation
      const created = await api.createAssessment(input, idempotencyKey);

      // If user provided scores or a status other than SCHEDULED, update it immediately
      if (status !== 'SCHEDULED' || rawScore !== '') {
        const numRaw = rawScore !== '' ? Number(rawScore) : undefined;
        const res = await api.updateAssessment(created.id, {
          status,
          maxScore: Number(maxScore),
          rawScore: numRaw,
        });
        if (res.warning) {
          setWarning(`Notice: ${res.warning} (Bonus/Extra credit recorded)`);
        }
      }

      setTitle('');
      setRawScore('');
      setIdempotencyKey(typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `assess_${Date.now()}`);
      await loadData(selectedPeriodId);
    } catch (err: any) {
      // §SYNC-05: Form state preserved on failure for safe client retry
      setError(err.message || 'Connection or server error. Your input has been preserved.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assessment record?')) return;
    try {
      await api.deleteAssessment(id);
      await loadData(selectedPeriodId);
    } catch (err: any) {
      alert(err.message || 'Failed to delete assessment');
    }
  };

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '1rem', fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ fontSize: 22, color: '#1a365d', marginBottom: 12 }}>Assessments & Exam Grades</h2>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>
        Record exam results, quizzes, coursework scores, and weights with full score integrity validation.
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

      {warning && (
        <div style={{ background: '#fffaf0', color: '#dd6b20', border: '1px solid #fbd38d', padding: 12, borderRadius: 6, marginBottom: 16 }}>
          {warning}
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

      {/* Add Assessment Form */}
      <form onSubmit={handleCreate} style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 16 }}>Add Assessment Record</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4 }}>Subject *</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #cbd5e0', boxSizing: 'border-box' }}
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4 }}>Assessment Title *</label>
            <input
              type="text"
              placeholder="e.g. Midterm Examination"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #cbd5e0', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4 }}>Type</label>
            <select
              value={assessmentType}
              onChange={(e) => setAssessmentType(e.target.value as any)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #cbd5e0', boxSizing: 'border-box' }}
            >
              <option value="EXAM">Exam</option>
              <option value="MIDTERM">Midterm</option>
              <option value="FINAL">Final Exam</option>
              <option value="QUIZ">Quiz</option>
              <option value="ASSIGNMENT">Assignment</option>
              <option value="LAB">Lab Work</option>
              <option value="PRESENTATION">Presentation</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4 }}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #cbd5e0', boxSizing: 'border-box' }}
            >
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
              <option value="EXCUSED">Excused</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4 }}>Max Score (&gt; 0)</label>
            <input
              type="number"
              min="0.01"
              step="any"
              value={maxScore}
              onChange={(e) => setMaxScore(Number(e.target.value))}
              required
              style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #cbd5e0', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4 }}>Raw Score (Score Achieved)</label>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="e.g. 95"
              value={rawScore}
              onChange={(e) => setRawScore(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #cbd5e0', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4 }}>Weight (%)</label>
            <input
              type="number"
              min="0"
              step="any"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #cbd5e0', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4 }}>Date & Time *</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #cbd5e0', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || subjects.length === 0}
          style={{
            background: '#2b6cb0',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 4,
            cursor: submitting || subjects.length === 0 ? 'not-allowed' : 'pointer',
            fontWeight: 600,
          }}
        >
          {submitting ? 'Saving...' : 'Add Assessment'}
        </button>
      </form>

      {/* Assessment Table */}
      <h3 style={{ fontSize: 16, color: '#2d3748', marginBottom: 12 }}>Assessments List</h3>
      {loading ? (
        <p>Loading assessments...</p>
      ) : assessments.length === 0 ? (
        <p style={{ color: '#718096' }}>No assessments recorded for this period yet.</p>
      ) : (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead style={{ background: '#f7fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '10px 12px' }}>Assessment</th>
                <th style={{ padding: '10px 12px' }}>Subject</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px' }}>Score</th>
                <th style={{ padding: '10px 12px' }}>Weight</th>
                <th style={{ padding: '10px 12px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => {
                const percentage =
                  a.rawScore != null && a.maxScore != null && a.maxScore > 0
                    ? ((a.rawScore / a.maxScore) * 100).toFixed(1)
                    : null;
                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <strong style={{ color: '#2d3748' }}>{a.title}</strong>
                      <span style={{ marginLeft: 6, fontSize: 11, background: '#edf2f7', padding: '2px 6px', borderRadius: 4, color: '#4a5568' }}>
                        {a.assessmentType}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#4a5568' }}>{a.subjectName || 'Course'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 12,
                          background:
                            a.status === 'COMPLETED'
                              ? '#c6f6d5'
                              : a.status === 'EXCUSED'
                              ? '#feebc8'
                              : '#ebf8ff',
                          color:
                            a.status === 'COMPLETED'
                              ? '#22543d'
                              : a.status === 'EXCUSED'
                              ? '#7b341e'
                              : '#2b6cb0',
                        }}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {a.rawScore != null ? (
                        <span>
                          <strong>{a.rawScore}</strong> / {a.maxScore}{' '}
                          <span style={{ fontSize: 12, color: '#718096' }}>({percentage}%)</span>
                        </span>
                      ) : (
                        <span style={{ color: '#a0aec0' }}>— / {a.maxScore ?? '—'}</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#4a5568' }}>{a.weight}%</td>
                    <td style={{ padding: '10px 12px' }}>
                      <button
                        onClick={() => handleDelete(a.id)}
                        style={{
                          background: 'transparent',
                          color: '#e53e3e',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 12,
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}