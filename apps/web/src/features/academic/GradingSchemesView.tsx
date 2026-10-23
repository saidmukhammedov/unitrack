import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type {
  GradingScheme,
  CreateGradingSchemeInput,
  GradeScaleEntryInput,
  GradingSchemeType,
} from '@unitrack/contracts';
import { validateGradeScaleEntries } from '@unitrack/academic-core';

const DEFAULT_US_ENTRIES: GradeScaleEntryInput[] = [
  { label: 'F', minPercentage: 0, maxPercentage: 59, gradePoints: 0.0, sortOrder: 11 },
  { label: 'D', minPercentage: 60, maxPercentage: 66, gradePoints: 1.0, sortOrder: 10 },
  { label: 'D+', minPercentage: 67, maxPercentage: 69, gradePoints: 1.3, sortOrder: 9 },
  { label: 'C-', minPercentage: 70, maxPercentage: 72, gradePoints: 1.7, sortOrder: 8 },
  { label: 'C', minPercentage: 73, maxPercentage: 76, gradePoints: 2.0, sortOrder: 7 },
  { label: 'C+', minPercentage: 77, maxPercentage: 79, gradePoints: 2.3, sortOrder: 6 },
  { label: 'B-', minPercentage: 80, maxPercentage: 82, gradePoints: 2.7, sortOrder: 5 },
  { label: 'B', minPercentage: 83, maxPercentage: 86, gradePoints: 3.0, sortOrder: 4 },
  { label: 'B+', minPercentage: 87, maxPercentage: 89, gradePoints: 3.3, sortOrder: 3 },
  { label: 'A-', minPercentage: 90, maxPercentage: 92, gradePoints: 3.7, sortOrder: 2 },
  { label: 'A', minPercentage: 93, maxPercentage: 100, gradePoints: 4.0, sortOrder: 1 },
];

export function GradingSchemesView() {
  const [schemes, setSchemes] = useState<GradingScheme[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [schemeType, setSchemeType] = useState<GradingSchemeType>('UNIVERSITY_GPA');
  const [isDefault, setIsDefault] = useState(false);
  const [entries, setEntries] = useState<GradeScaleEntryInput[]>(DEFAULT_US_ENTRIES);
  const [submitting, setSubmitting] = useState(false);

  const loadSchemes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getGradingSchemes();
      setSchemes(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load grading schemes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchemes();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Scheme name is required');
      return;
    }

    if (schemeType === 'SCHOOL_BAND' || schemeType === 'UNIVERSITY_GPA') {
      const validation = validateGradeScaleEntries(entries);
      if (!validation.valid) {
        setError(validation.error || 'Invalid grade boundaries. Must cover [0, 100] without gaps or overlaps.');
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      const input: CreateGradingSchemeInput = {
        name: name.trim(),
        schemeType,
        isDefault,
        entries: schemeType === 'SCHOOL_BAND' || schemeType === 'UNIVERSITY_GPA' ? entries : undefined,
      };
      await api.createGradingScheme(input);
      setName('');
      await loadSchemes();
    } catch (err: any) {
      setError(err.message || 'Failed to create grading scheme');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this grading scheme? Associated subjects will have their scheme unlinked.')) {
      return;
    }
    try {
      await api.deleteGradingScheme(id);
      await loadSchemes();
    } catch (err: any) {
      alert(err.message || 'Failed to delete grading scheme');
    }
  };

  const loadPreset = (preset: 'US' | 'UZ') => {
    if (preset === 'US') {
      setName('US Letter Grade (4.0 Scale)');
      setSchemeType('UNIVERSITY_GPA');
      setEntries(DEFAULT_US_ENTRIES);
    } else {
      setName("O'zbekiston Maktab Baholash (5 ballik)");
      setSchemeType('SCHOOL_BAND');
      setEntries([
        { label: '2', minPercentage: 0, maxPercentage: 49, gradePoints: null, sortOrder: 4 },
        { label: '3', minPercentage: 50, maxPercentage: 69, gradePoints: null, sortOrder: 3 },
        { label: '4', minPercentage: 70, maxPercentage: 89, gradePoints: null, sortOrder: 2 },
        { label: '5', minPercentage: 90, maxPercentage: 100, gradePoints: null, sortOrder: 1 },
      ]);
    }
  };

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '1rem', fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ fontSize: 22, color: '#1a365d', marginBottom: 12 }}>Grading Schemes & Scales</h2>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>
        Configure customizable letter bands, percentage intervals, and GPA grade points per school or university standards.
      </p>

      {error && (
        <div style={{ background: '#fff5f5', color: '#c53030', padding: 12, borderRadius: 6, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Preset Quick Buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#4a5568' }}>Load Preset:</span>
        <button
          type="button"
          onClick={() => loadPreset('US')}
          style={{ background: '#edf2f7', border: '1px solid #cbd5e0', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
        >
          🇺🇸 US Letter Grade (4.0 GPA)
        </button>
        <button
          type="button"
          onClick={() => loadPreset('UZ')}
          style={{ background: '#edf2f7', border: '1px solid #cbd5e0', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
        >
          🇺🇿 Uzbekistan 5-Ballik Maktab
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleCreate} style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 16 }}>Create Grading Scheme</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4 }}>Scheme Name *</label>
            <input
              type="text"
              placeholder="e.g. Standard University GPA"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #cbd5e0', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4 }}>Calculation Type</label>
            <select
              value={schemeType}
              onChange={(e) => setSchemeType(e.target.value as any)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #cbd5e0', boxSizing: 'border-box' }}
            >
              <option value="UNIVERSITY_GPA">University GPA (Bands + Points)</option>
              <option value="SCHOOL_BAND">School Band (Discrete Letters/Numbers)</option>
              <option value="WEIGHTED_AVERAGE">Weighted Average Only (Numeric %)</option>
              <option value="PERCENTAGE">Simple Percentage (Unweighted)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <input
            type="checkbox"
            id="isDefaultScheme"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
          />
          <label htmlFor="isDefaultScheme" style={{ fontSize: 13, color: '#2d3748', cursor: 'pointer' }}>
            Set as default scheme for new subjects
          </label>
        </div>

        {(schemeType === 'UNIVERSITY_GPA' || schemeType === 'SCHOOL_BAND') && (
          <div style={{ marginTop: 12, borderTop: '1px solid #edf2f7', paddingTop: 12 }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#2d3748' }}>
              Grade Scale Bands (must cover [0, 100] without gaps)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
              {entries.map((ent, idx) => (
                <div key={idx} style={{ background: '#fff', border: '1px solid #cbd5e0', borderRadius: 4, padding: 8, fontSize: 12 }}>
                  <div style={{ fontWeight: 700, color: '#1a365d' }}>{ent.label}</div>
                  <div style={{ color: '#4a5568', marginTop: 2 }}>{ent.minPercentage}% – {ent.maxPercentage}%</div>
                  {ent.gradePoints != null && (
                    <div style={{ color: '#2b6cb0', fontWeight: 600 }}>{ent.gradePoints} pts</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
            marginTop: 16,
          }}
        >
          {submitting ? 'Creating...' : 'Create Scheme'}
        </button>
      </form>

      {/* Schemes List */}
      <h3 style={{ fontSize: 16, color: '#2d3748', marginBottom: 12 }}>Configured Grading Schemes</h3>
      {loading ? (
        <p>Loading schemes...</p>
      ) : schemes.length === 0 ? (
        <p style={{ color: '#718096' }}>No grading schemes configured yet. Create one or load a preset above.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {schemes.map((s) => (
            <div
              key={s.id}
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '14px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong style={{ fontSize: 16, color: '#1a202c' }}>{s.name}</strong>
                  {s.isDefault && (
                    <span style={{ background: '#c6f6d5', color: '#22543d', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                      DEFAULT
                    </span>
                  )}
                  <span style={{ background: '#edf2f7', color: '#4a5568', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
                    {s.schemeType}
                  </span>
                  <span style={{ fontSize: 11, color: '#718096' }}>
                    v{s.version}
                  </span>
                </div>
                {s.entries.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {s.entries.map((e) => (
                      <span
                        key={e.id}
                        style={{
                          fontSize: 11,
                          background: '#f7fafc',
                          border: '1px solid #edf2f7',
                          padding: '3px 8px',
                          borderRadius: 4,
                          color: '#2d3748',
                        }}
                      >
                        <strong>{e.label}</strong> ({e.minPercentage}-{e.maxPercentage}%)
                        {e.gradePoints != null ? ` : ${e.gradePoints}pt` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleDelete(s.id)}
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