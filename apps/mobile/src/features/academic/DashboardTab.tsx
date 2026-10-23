import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { mobileApi } from '../../lib/api';
import type { DashboardResponse, UserProfile, PeriodGpaResponse, AcademicPeriod } from '@unitrack/contracts';
import { formatGpa, formatPercentage } from '@unitrack/i18n';

interface Props {
  user: UserProfile;
  onNavigate: (tab: string) => void;
}

export function DashboardTab({ user, onNavigate }: Props) {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<AcademicPeriod | null>(null);
  const [gpaData, setGpaData] = useState<PeriodGpaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [res, periodsRes] = await Promise.all([
          mobileApi.getDashboard(),
          mobileApi.getPeriods(),
        ]);
        setDashboard(res);

        const active = periodsRes.data.find((p) => !p.isArchived) || periodsRes.data[0];
        if (active) {
          setCurrentPeriod(active);
          try {
            const gpaRes = await mobileApi.getPeriodGpa(active.id);
            setGpaData(gpaRes);
          } catch {
            // No eligible courses yet
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2b6cb0" />
        <Text style={styles.loadingText}>Loading today's schedule...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorBox}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Welcome, {user.displayName}!</Text>
      <Text style={styles.dateLabel}>{dashboard?.date}</Text>

      {/* GPA Summary Card */}
      <View style={styles.gpaCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.gpaSubLabel}>CUMULATIVE PERIOD GPA (§3.5)</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
            <Text style={styles.gpaValue}>
              {gpaData && gpaData.gpa !== null ? formatGpa(gpaData.gpa, user.languageCode || 'en') : '—'}
            </Text>
            <Text style={styles.gpaScale}>
              {gpaData ? ` / 4.00 (${gpaData.totalCredits} cr)` : ' (No courses evaluated)'}
            </Text>
          </View>
          {currentPeriod && (
            <Text style={styles.periodNameText}>{currentPeriod.name}</Text>
          )}
        </View>
        <TouchableOpacity style={styles.gpaButton} onPress={() => onNavigate('grades')}>
          <Text style={styles.gpaButtonText}>Grades →</Text>
        </TouchableOpacity>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <TouchableOpacity style={styles.metricCard} onPress={() => onNavigate('timetable')}>
          <Text style={styles.metricNumber}>{dashboard?.todaysClasses.length ?? 0}</Text>
          <Text style={styles.metricLabel}>Classes Today</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.metricCard} onPress={() => onNavigate('tasks')}>
          <Text style={[styles.metricNumber, { color: '#dd6b20' }]}>
            {dashboard?.upcomingTasks.length ?? 0}
          </Text>
          <Text style={styles.metricLabel}>Pending Tasks</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.metricCard} onPress={() => onNavigate('assessments')}>
          <Text style={[styles.metricNumber, { color: '#e53e3e' }]}>
            {dashboard?.upcomingAssessments.length ?? 0}
          </Text>
          <Text style={styles.metricLabel}>Exams Ahead</Text>
        </TouchableOpacity>
      </View>

      {/* Today's Classes Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Schedule</Text>
        {!dashboard?.todaysClasses.length ? (
          <Text style={styles.emptyText}>No classes scheduled for today.</Text>
        ) : (
          dashboard.todaysClasses.map((c) => (
            <View key={c.sessionId} style={styles.classItem}>
              <View style={[styles.colorBar, { backgroundColor: c.subjectColor || '#2b6cb0' }]} />
              <View style={styles.classContent}>
                <Text style={styles.className}>{c.subjectName}</Text>
                <Text style={styles.classTime}>
                  ⏰ {c.startTime} - {c.endTime}
                  {c.location ? `  📍 ${c.location}` : ''}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Upcoming Assessments */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Deadlines & Exams</Text>
        {!dashboard?.upcomingAssessments.length && !dashboard?.upcomingTasks.length ? (
          <Text style={styles.emptyText}>No upcoming deadlines this week.</Text>
        ) : (
          <>
            {dashboard?.upcomingAssessments.map((a) => (
              <View key={a.id} style={styles.deadlineItem}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>EXAM</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.deadlineTitle}>{a.title}</Text>
                  {a.subjectName && <Text style={styles.deadlineSub}>{a.subjectName}</Text>}
                </View>
                <Text style={styles.deadlineDate}>
                  {new Date(a.scheduledAt).toLocaleDateString()}
                </Text>
              </View>
            ))}
            {dashboard?.upcomingTasks.map((t) => (
              <View key={t.id} style={styles.deadlineItem}>
                <View style={[styles.badge, { backgroundColor: '#feebc8' }]}>
                  <Text style={[styles.badgeText, { color: '#7b341e' }]}>TASK</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.deadlineTitle}>{t.title}</Text>
                  {t.subjectName && <Text style={styles.deadlineSub}>{t.subjectName}</Text>}
                </View>
                <Text style={styles.deadlineDate}>
                  {t.dueAt ? new Date(t.dueAt).toLocaleDateString() : '—'}
                </Text>
              </View>
            ))}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  center: { padding: 30, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#718096', fontSize: 14 },
  greeting: { fontSize: 20, fontWeight: '700', color: '#1a365d' },
  dateLabel: { fontSize: 13, color: '#718096', marginTop: 2, marginBottom: 14 },
  gpaCard: {
    backgroundColor: '#f0fff4',
    borderLeftWidth: 4,
    borderLeftColor: '#38a169',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#c6f6d5',
  },
  gpaSubLabel: { fontSize: 10, fontWeight: '700', color: '#276749', letterSpacing: 0.5 },
  gpaValue: { fontSize: 24, fontWeight: '800', color: '#22543d' },
  gpaScale: { fontSize: 12, color: '#718096', marginLeft: 6 },
  periodNameText: { fontSize: 11, color: '#4a5568', marginTop: 2 },
  gpaButton: { backgroundColor: '#38a169', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  gpaButtonText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 16 },
  metricCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metricNumber: { fontSize: 22, fontWeight: 'bold', color: '#2b6cb0' },
  metricLabel: { fontSize: 11, color: '#718096', marginTop: 4, fontWeight: '600' },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#2d3748', marginBottom: 10 },
  emptyText: { color: '#a0aec0', fontSize: 13 },
  classItem: {
    flexDirection: 'row',
    backgroundColor: '#f7fafc',
    borderRadius: 6,
    marginBottom: 8,
    overflow: 'hidden',
  },
  colorBar: { width: 5 },
  classContent: { padding: 10, flex: 1 },
  className: { fontSize: 14, fontWeight: '600', color: '#1a202c' },
  classTime: { fontSize: 12, color: '#4a5568', marginTop: 3 },
  deadlineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  badge: {
    backgroundColor: '#fed7d7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#9b2c2c' },
  deadlineTitle: { fontSize: 13, fontWeight: '500', color: '#2d3748' },
  deadlineSub: { fontSize: 11, color: '#718096' },
  deadlineDate: { fontSize: 12, color: '#e53e3e', fontWeight: '600' },
  errorBox: { backgroundColor: '#fff5f5', padding: 10, borderRadius: 6, marginVertical: 8 },
  errorText: { color: '#c53030', fontSize: 13 },
});