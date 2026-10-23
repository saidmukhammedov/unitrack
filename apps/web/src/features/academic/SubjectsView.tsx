import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { AcademicPeriod, Subject, CreateSubjectInput, GradingScheme, SubjectGradeResponse } from '@unitrack/contracts';
import { formatPercentage } from '@unitrack/i18n';

export function SubjectsView() {
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schemes, setSchemes] = useState<GradingScheme[]>([]);
  const [subjectGrades, setSubjectGrades] = useState<Record<string, SubjectGradeResponse>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [creditHours, setCreditHours] = useState<number>(3);
  const [colorHex, setColorHex] = useState('#3182ce');
  const [gradingSchemeId, setGradingSchemeId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const [pRes, sRes] = await Promise.all([
          api.getPeriods(),
          api.getGradingSchemes(),
        ]);
        setPeriods(pRes.data);
        setSchemes(sRes.data);
        if (pRes.data.length > 0) {
          setSelectedPeriodId(pRes.data[0].id);
        }
        const defaultScheme = sRes.data.find((s) => s.isDefault) || sRes.data[0];
        if (defaultScheme) {
          setGradingSchemeId(defaultScheme.id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initialize subjects');
      }
    }
    init();
  }, []);

  const loadSubjectsAndGrades = async (periodId: string) => {
    if (!periodId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSubjectsByPeriod(periodId);
      setSubjects(res.data);

      // Load grades in parallel
      const gradesMap: Record<string, SubjectGradeResponse> = {};
      await Promise.all(
        res.data.map(async (sub) => {
          try {
            const grade = await api.getSubjectGrade(sub.id);
            gradesMap[sub.id] = grade;
          } catch {
            // No assessments recorded yet or empty
          }
        })
      );
      setSubjectGrades(gradesMap);
    } catch (err: any) {
      setError(err.message || 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPeriodId) {
      loadSubjectsAndGrades(selectedPeriodId);
    }
  }, [selectedPeriodId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPeriodId) {
      setError('Select an academic period first');
      return;
    }
    if (!name.trim()) {
      setError('Subject name is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const input: CreateSubjectInput = {
        name: name.trim(),
        teacherName: teacherName.trim() || undefined,
        creditHours: Number(creditHours) > 0 ? Number(creditHours) : undefined,
        colorHex,
        gradingSchemeId: gradingSchemeId || undefined,
      };
      await api.createSubject(selectedPeriodId, input);
      setName('');
      setTeacherName('');
      setCreditHours(3);
      await loadSubjectsAndGrades(selectedPeriodId);
    } catch (err: any) {
      setError(err.message || 'Failed to create subject');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject? All associated timetable sessions and assessments will be deleted.')) {
      return;
    }
    try {
      await api.deleteSubject(id);
      await loadSubjectsAndGrades(selectedPeriodId);
    } catch (err: any) {
      alert(err.message || 'Failed to delete subject');
    }
  };

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '1rem', fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ fontSize: 22, color: '#1a365d', marginBottom: 12 }}>Subjects & Courses</h2>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>
        Manage courses, credit weights, grading schemes, and live computed subject grades.
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

      {/* Create Subject Form */}
      <form onSubmit={handleCreate} style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 16 }}>Add New Subject</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4 }}>Subject Name *</label>
            <input
              type="text"
              placeholder="e.g. Linear Algebra"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #cbd5e0', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4 }}>Instructor</label>
            <input
              type="text"
              placeholder="e.g. Prof. David Johnson"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #cbd5e0', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4 }}>Credit Hours</label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={creditHours}
              onChange={(e) => setCreditHours(Number(e.target.value))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #cbd5e0', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4 }}>Grading Scheme</label>
            <select
              value={gradingSchemeId}
              onChange={(e) => setGradingSchemeId(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #cbd5e0', boxSizing: 'border-box' }}
            >
              <option value="">(Default / Unweighted)</option>
              {schemes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.schemeType})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4 }}>Color Theme</label>
            <input
              type="color"
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value)}
              style={{ width: '100%', height: 38, padding: 2, borderRadius: 4, border: '1px solid #cbd5e0', boxSizing: 'border-box', cursor: 'pointer' }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || !selectedPeriodId}
          style={{
            background: '#2b6cb0',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 4,
            cursor: submitting || !selectedPeriodId ? 'not-allowed' : 'pointer',
            fontWeight: 600,
          }}
        >
          {submitting ? 'Adding...' : 'Add Subject'}
        </button>
      </form>

      {/* Subjects List */}
      <h3 style={{ fontSize: 16, color: '#2d3748', marginBottom: 12 }}>Enrolled Subjects & Grades</h3>
      {loading ? (
        <p>Loading subjects...</p>
      ) : subjects.length === 0 ? (
        <p style={{ color: '#718096' }}>No subjects added for this period yet.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {subjects.map((s) => {
            const grade = subjectGrades[s.id];
            return (
              <div
                key={s.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderLeft: `6px solid ${s.colorHex || '#3182ce'}`,
                  borderRadius: 6,
                  padding: '14px',
                  background: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <strong style={{ fontSize: 16, color: '#1a202c' }}>{s.name}</strong>
                    {s.creditHours != null && (
                      <span style={{ fontSize: 12, color: '#4a5568', background: '#edf2f7', padding: '2px 6px', borderRadius: 4 }}>
                        {s.creditHours} credits
                      </span>
                    )}
                  </div>
                  {s.teacherName && (
                    <div style={{ fontSize: 13, color: '#718096', marginTop: 4 }}>
                      👤 {s.teacherName}
                    </div>
                  )}

                  {/* Computed Grade Box */}
                  <div style={{ marginTop: 12, padding: '10px', background: '#f7fafc', borderRadius: 6, border: '1px solid #edf2f7' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#718096', textTransform: 'uppercase' }}>Current Grade</div>
                    {grade && grade.computedPercentage !== null ? (
                      <div style={{ marginTop: 4, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 20, fontWeight: 800, color: '#2b6cb0' }}>
                          {formatPercentage(grade.computedPercentage, 'en')}
                        </span>
                        {grade.computedBand && (
                          <span style={{ fontSize: 14, fontWeight: 700, background: '#c6f6d5', color: '#22543d', padding: '2px 8px', borderRadius: 4 }}>
                            {grade.computedBand}
                          </span>
                        )}
                        {grade.computedGradePoints != null && (
                          <span style={{ fontSize: 12, color: '#4a5568', fontWeight: 600 }}>
                            ({grade.computedGradePoints} pts)
                          </span>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: '#a0aec0', marginTop: 4 }}>
                        No completed scores yet
                      </div>
                    )}
                    {grade && (
                      <div style={{ fontSize: 11, color: '#718096', marginTop: 4 }}>
                        {grade.assessmentsIncluded} of {grade.assessmentsIncluded + grade.assessmentsExcluded} scored
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 14, textAlign: 'right' }}>
                  <button
                    onClick={() => handleDelete(s.id)}
                    style={{
                      background: '#fff5f5',
                      color: '#c53030',
                      border: '1px solid #feb2b2',
                      padding: '3px 8px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}