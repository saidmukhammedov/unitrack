import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { AcademicPeriod, CreateAcademicPeriodInput } from '@unitrack/contracts';

export function PeriodsView() {
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<'SEMESTER' | 'TRIMESTER' | 'QUARTER' | 'SCHOOL_YEAR' | 'CUSTOM'>('SEMESTER');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadPeriods = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getPeriods();
      setPeriods(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load academic periods');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPeriods();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) {
      setError('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const input: CreateAcademicPeriodInput = {
        name,
        type,
        startDate,
        endDate,
      };
      await api.createPeriod(input);
      setName('');
      setStartDate('');
      setEndDate('');
      await loadPeriods();
    } catch (err: any) {
      setError(err.message || 'Failed to create period');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this academic period? All associated subjects, timetable entries, and assessments will be deleted.')) {
      return;
    }
    try {
      await api.deletePeriod(id);
      await loadPeriods();
    } catch (err: any) {
      alert(err.message || 'Failed to delete period');
    }
  };

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '1rem', fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ fontSize: 22, color: '#1a365d', marginBottom: 12 }}>Academic Periods</h2>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>
        Manage semesters, trimesters, or school years. All courses, timetable sessions, and assessments are grouped by academic period.
      </p>

      {error && (
        <div style={{ background: '#fff5f5', color: '#c53030', padding: 12, borderRadius: 6, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleCreate} style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 16 }}>Add New Academic Period</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4 }}>Period Name *</label>
            <input
              type="text"
              placeholder="e.g. Fall 2026 Semester"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #cbd5e0', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4 }}>Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #cbd5e0', boxSizing: 'border-box' }}
            >
              <option value="SEMESTER">Semester</option>
              <option value="TRIMESTER">Trimester</option>
              <option value="QUARTER">Quarter</option>
              <option value="SCHOOL_YEAR">School Year</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4 }}>Start Date *</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #cbd5e0', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4 }}>End Date *</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
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
          {submitting ? 'Creating...' : 'Create Academic Period'}
        </button>
      </form>

      {/* List */}
      <h3 style={{ fontSize: 16, color: '#2d3748', marginBottom: 12 }}>Configured Periods</h3>
      {loading ? (
        <p>Loading periods...</p>
      ) : periods.length === 0 ? (
        <p style={{ color: '#718096' }}>No academic periods found. Create one above to get started.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {periods.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong style={{ fontSize: 15, color: '#1a202c' }}>{p.name}</strong>
                  <span style={{ background: '#edf2f7', color: '#4a5568', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
                    {p.type}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#718096', marginTop: 4 }}>
                  {p.startDate} — {p.endDate}
                </div>
              </div>
              <button
                onClick={() => handleDelete(p.id)}
                style={{
                  background: '#fff5f5',
                  color: '#c53030',
                  border: '1px solid #feb2b2',
                  padding: '4px 10px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 12,
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