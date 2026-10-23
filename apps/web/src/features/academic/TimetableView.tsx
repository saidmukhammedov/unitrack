import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { AcademicPeriod, Subject, ClassSession, CreateClassSessionInput } from '@unitrack/contracts';

const WEEKDAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

export function TimetableView() {
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<AcademicPeriod | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [subjectId, setSubjectId] = useState('');
  const [weekday, setWeekday] = useState<number>(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:30');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const res = await api.getPeriods();
        setPeriods(res.data);
        if (res.data.length > 0) {
          setSelectedPeriod(res.data[0]);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load periods');
      }
    }
    init();
  }, []);

  const loadData = async (period: AcademicPeriod) => {
    setLoading(true);
    setError(null);
    try {
      const [subsRes, timeRes] = await Promise.all([
        api.getSubjectsByPeriod(period.id),
        api.getTimetable({ periodId: period.id }),
      ]);
      setSubjects(subsRes.data);
      if (subsRes.data.length > 0) {
        setSubjectId((prev) => prev || subsRes.data[0].id);
      }
      setSessions(timeRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load timetable data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPeriod) {
      loadData(selectedPeriod);
    }
  }, [selectedPeriod]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPeriod) {
      setError('Select an academic period first');
      return;
    }
    if (!subjectId) {
      setError('Please select a subject');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const input: CreateClassSessionInput = {
        subjectId,
        weekday: Number(weekday),
        startTime,
        endTime,
        location: location.trim() || undefined,
        effectiveFrom: selectedPeriod.startDate,
      };
      await api.createClassSession(input);
      setLocation('');
      await loadData(selectedPeriod);
    } catch (err: any) {
      setError(err.message || 'Failed to add class session');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this class session from timetable?')) return;
    try {
      await api.deleteClassSession(id);
      if (selectedPeriod) await loadData(selectedPeriod);
    } catch (err: any) {
      alert(err.message || 'Failed to delete class session');
    }
  };

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '1rem', fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ fontSize: 22, color: '#1a365d', marginBottom: 12 }}>Weekly Timetable</h2>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>
        Recurring weekly schedule for all enrolled subjects in this period.
      </p>

      {error && (
        <div style={{ background: '#fff5f5', color: '#c53030', padding: 12, borderRadius: 6, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Period Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <label style={{ fontSize: 14, fontWeight: 600, color: '#2d3748' }}>Active Period:</label>
        <select
          value={selectedPeriod?.id || ''}
          onChange={(e) => {
            const found = periods.find((p) => p.id === e.target.value);
            if (found) setSelectedPeriod(found);
          }}
          style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #cbd5e0', fontSize: 14 }}
        >
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Add Session Form */}
      <form onSubmit={handleCreate} style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 16 }}>Schedule a Class Session</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 12 }}>
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
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4 }}>Weekday</label>
            <select
              value={weekday}
              onChange={(e) => setWeekday(Number(e.target.value))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #cbd5e0', boxSizing: 'border-box' }}
            >
              {WEEKDAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4 }}>Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #cbd5e0', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4 }}>End Time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #cbd5e0', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4 }}>Location / Room</label>
            <input
              type="text"
              placeholder="e.g. Auditorium B"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
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
          {submitting ? 'Saving...' : 'Add Class Session'}
        </button>
      </form>

      {/* Timetable Matrix */}
      <h3 style={{ fontSize: 16, color: '#2d3748', marginBottom: 12 }}>Schedule by Day</h3>
      {loading ? (
        <p>Loading schedule...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {WEEKDAYS.map((day) => {
            const daySessions = sessions
              .filter((s) => s.weekday === day.value)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));
            return (
              <div key={day.value} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: 15, color: '#2b6cb0' }}>
                  {day.label}
                  <span style={{ fontSize: 12, color: '#718096', fontWeight: 400, marginLeft: 8 }}>
                    ({daySessions.length} {daySessions.length === 1 ? 'class' : 'classes'})
                  </span>
                </h4>
                {daySessions.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 13, color: '#a0aec0' }}>No classes scheduled</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {daySessions.map((s) => (
                      <div
                        key={s.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: '#f7fafc',
                          borderLeft: `4px solid ${s.subjectColor || '#3182ce'}`,
                          borderRadius: 4,
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: 14, color: '#1a202c' }}>
                            {s.startTime} – {s.endTime}
                          </strong>{' '}
                          <span style={{ fontWeight: 600, marginLeft: 8 }}>{s.subjectName || 'Class'}</span>
                          {s.location && (
                            <span style={{ marginLeft: 12, fontSize: 12, color: '#4a5568', background: '#edf2f7', padding: '2px 6px', borderRadius: 4 }}>
                              📍 {s.location}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDelete(s.id)}
                          style={{
                            background: 'transparent',
                            color: '#e53e3e',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 12,
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}