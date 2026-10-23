import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { mobileApi } from '../../lib/api';
import type { Subject, GradingScheme, PeriodGpaResponse, AcademicPeriod, SubjectGradeResponse } from '@unitrack/contracts';
import { formatGpa, formatPercentage } from '@unitrack/i18n';

interface SubjectGradeItem {
  subject: Subject;
  gradeData?: SubjectGradeResponse;
}

export function GradesTab({ locale }: { locale: 'en' | 'uz' | 'ru' }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<AcademicPeriod | null>(null);
  const [schemes, setSchemes] = useState<GradingScheme[]>([]);
  const [subjectGrades, setSubjectGrades] = useState<SubjectGradeItem[]>([]);
  const [gpaData, setGpaData] = useState<PeriodGpaResponse | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'grades' | 'schemes'>('grades');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [periodsRes, schemesRes] = await Promise.all([
        mobileApi.getPeriods(),
        mobileApi.getGradingSchemes(),
      ]);

      setSchemes(schemesRes.data);

      const active = periodsRes.data.find((p) => !p.isArchived) || periodsRes.data[0];
      if (active) {
        setSelectedPeriod(active);
        await loadPeriodGrades(active.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load grade information');
    } finally {
      setLoading(false);
    }
  };

  const loadPeriodGrades = async (periodId: string) => {
    try {
      const subsRes = await mobileApi.getSubjectsByPeriod(periodId);
      const items: SubjectGradeItem[] = await Promise.all(
        subsRes.data.map(async (subj: Subject) => {
          try {
            const gradeRes = await mobileApi.getSubjectGrade(subj.id);
            return { subject: subj, gradeData: gradeRes };
          } catch {
            return { subject: subj };
          }
        })
      );
      setSubjectGrades(items);

      try {
        const gpaRes = await mobileApi.getPeriodGpa(periodId);
        setGpaData(gpaRes);
      } catch {
        setGpaData(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load subject grades');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2b6cb0" />
        <Text style={styles.loadingText}>Loading grades & GPA...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Grades & Academic Performance</Text>

      {/* Sub Tabs */}
      <View style={styles.subTabRow}>
        <TouchableOpacity
          style={[styles.subTab, activeSubTab === 'grades' && styles.subTabActive]}
          onPress={() => setActiveSubTab('grades')}
        >
          <Text style={[styles.subTabText, activeSubTab === 'grades' && styles.subTabTextActive]}>
            Course Grades & GPA
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, activeSubTab === 'schemes' && styles.subTabActive]}
          onPress={() => setActiveSubTab('schemes')}
        >
          <Text style={[styles.subTabText, activeSubTab === 'schemes' && styles.subTabTextActive]}>
            Grading Scales ({schemes.length})
          </Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {activeSubTab === 'grades' && (
        <View>
          {/* GPA Card */}
          <View style={styles.gpaBanner}>
            <View>
              <Text style={styles.gpaTitle}>Cumulative Period GPA (§3.5)</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
                <Text style={styles.gpaValue}>
                  {gpaData && gpaData.gpa !== null ? formatGpa(gpaData.gpa, locale) : '—'}
                </Text>
                <Text style={styles.gpaSubtitle}>
                  {gpaData ? ` / 4.00 (${gpaData.totalCredits} credit hours)` : ' (No eligible courses)'}
                </Text>
              </View>
            </View>
            {selectedPeriod && (
              <Text style={styles.periodBadge}>{selectedPeriod.name}</Text>
            )}
          </View>

          {/* Subjects List */}
          <Text style={styles.sectionHeader}>Enrolled Courses</Text>
          {subjectGrades.length === 0 ? (
            <Text style={styles.emptyText}>No subjects found for this period.</Text>
          ) : (
            subjectGrades.map(({ subject, gradeData }) => {
              return (
                <View key={subject.id} style={styles.subjectCard}>
                  <View style={styles.subjectHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subjectName}>{subject.name}</Text>
                      <Text style={styles.subjectMeta}>
                        Credits: {subject.creditHours ?? '—'}
                        {subject.teacherName ? ` • ${subject.teacherName}` : ''}
                      </Text>
                    </View>
                    {gradeData?.computedBand ? (
                      <View style={styles.bandBadge}>
                        <Text style={styles.bandBadgeText}>{gradeData.computedBand}</Text>
                      </View>
                    ) : (
                      <View style={[styles.bandBadge, { backgroundColor: '#edf2f7' }]}>
                        <Text style={[styles.bandBadgeText, { color: '#718096' }]}>N/A</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.scoreRow}>
                    <Text style={styles.scoreItem}>
                      Average:{' '}
                      <Text style={{ fontWeight: '700', color: '#1a365d' }}>
                        {gradeData?.computedPercentage != null
                          ? formatPercentage(gradeData.computedPercentage, locale)
                          : 'No assessments'}
                      </Text>
                    </Text>
                    {gradeData?.computedGradePoints != null && (
                      <Text style={styles.scoreItem}>
                        Points:{' '}
                        <Text style={{ fontWeight: '700', color: '#276749' }}>
                          {gradeData.computedGradePoints.toFixed(2)}
                        </Text>
                      </Text>
                    )}
                  </View>

                  {gradeData?.schemeId && (
                    <Text style={styles.schemeTag}>
                      Scale Version: v{gradeData.schemeVersion} • {gradeData.assessmentsIncluded} assessments included
                    </Text>
                  )}
                </View>
              );
            })
          )}
        </View>
      )}

      {activeSubTab === 'schemes' && (
        <View>
          <Text style={styles.sectionHeader}>Configured Grading Systems</Text>
          {schemes.map((s) => (
            <View key={s.id} style={styles.schemeCard}>
              <View style={styles.schemeHeader}>
                <Text style={styles.schemeName}>{s.name}</Text>
                <Text style={styles.schemeVersion}>v{s.version} • {s.schemeType}</Text>
              </View>

              <View style={styles.bandsContainer}>
                {s.entries.map((b) => (
                  <View key={b.id} style={styles.bandRow}>
                    <Text style={styles.bandLabel}>{b.label}</Text>
                    <Text style={styles.bandRange}>
                      {b.minPercentage}% – {b.maxPercentage}%
                    </Text>
                    {b.gradePoints != null && (
                      <Text style={styles.bandPoints}>{b.gradePoints.toFixed(2)} pts</Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  center: { padding: 30, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#718096', fontSize: 13 },
  title: { fontSize: 20, fontWeight: '700', color: '#1a365d', marginBottom: 12 },
  subTabRow: { flexDirection: 'row', backgroundColor: '#edf2f7', borderRadius: 8, padding: 3, marginBottom: 14 },
  subTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  subTabActive: { backgroundColor: '#fff', elevation: 1 },
  subTabText: { fontSize: 13, color: '#718096', fontWeight: '600' },
  subTabTextActive: { color: '#1a365d', fontWeight: '700' },
  gpaBanner: {
    backgroundColor: '#f0fff4',
    borderLeftWidth: 4,
    borderLeftColor: '#38a169',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#c6f6d5',
  },
  gpaTitle: { fontSize: 11, fontWeight: '700', color: '#276749', letterSpacing: 0.5 },
  gpaValue: { fontSize: 28, fontWeight: '800', color: '#22543d' },
  gpaSubtitle: { fontSize: 13, color: '#718096', marginLeft: 8 },
  periodBadge: { fontSize: 12, color: '#4a5568', marginTop: 4 },
  sectionHeader: { fontSize: 15, fontWeight: '700', color: '#2d3748', marginBottom: 10 },
  subjectCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  subjectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  subjectName: { fontSize: 15, fontWeight: '600', color: '#1a202c' },
  subjectMeta: { fontSize: 12, color: '#718096', marginTop: 2 },
  bandBadge: { backgroundColor: '#c6f6d5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  bandBadgeText: { fontSize: 12, fontWeight: '700', color: '#22543d' },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f7fafc',
    padding: 8,
    borderRadius: 6,
    marginVertical: 8,
  },
  scoreItem: { fontSize: 12, color: '#4a5568' },
  schemeTag: { fontSize: 11, color: '#a0aec0' },
  schemeCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  schemeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  schemeName: { fontSize: 15, fontWeight: '700', color: '#1a202c' },
  schemeVersion: { fontSize: 11, color: '#718096', fontWeight: '600' },
  bandsContainer: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#edf2f7', paddingTop: 8 },
  bandRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  bandLabel: { fontSize: 13, fontWeight: '600', color: '#2d3748', width: 60 },
  bandRange: { fontSize: 12, color: '#4a5568', flex: 1, textAlign: 'center' },
  bandPoints: { fontSize: 12, fontWeight: '600', color: '#276749', width: 70, textAlign: 'right' },
  emptyText: { color: '#a0aec0', fontSize: 13, textAlign: 'center', marginVertical: 16 },
  errorBox: { backgroundColor: '#fff5f5', padding: 10, borderRadius: 6, marginBottom: 12 },
  errorText: { color: '#c53030', fontSize: 12 },
});
