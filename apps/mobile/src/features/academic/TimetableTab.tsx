import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { mobileApi } from '../../lib/api';
import type { ClassSession } from '@unitrack/contracts';

const DAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

export function TimetableTab() {
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await mobileApi.getTimetable();
        setSessions(res.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load timetable');
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
        <Text style={styles.loadingText}>Loading weekly timetable...</Text>
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
      <Text style={styles.title}>Weekly Schedule</Text>
      {DAYS.map((d) => {
        const dayClasses = sessions
          .filter((s) => s.weekday === d.value)
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
        return (
          <View key={d.value} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>{d.label}</Text>
              <Text style={styles.dayBadge}>
                {dayClasses.length} {dayClasses.length === 1 ? 'class' : 'classes'}
              </Text>
            </View>

            {dayClasses.length === 0 ? (
              <Text style={styles.emptyDay}>No classes scheduled</Text>
            ) : (
              dayClasses.map((s) => (
                <View key={s.id} style={styles.classRow}>
                  <View style={[styles.colorIndicator, { backgroundColor: s.subjectColor || '#3182ce' }]} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.subjectName}>{s.subjectName || 'Course'}</Text>
                    <Text style={styles.timeLocation}>
                      ⏰ {s.startTime} - {s.endTime}
                      {s.location ? `  📍 ${s.location}` : ''}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  center: { padding: 30, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#718096', fontSize: 14 },
  title: { fontSize: 20, fontWeight: '700', color: '#1a365d', marginBottom: 14 },
  dayCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
    paddingBottom: 6,
  },
  dayTitle: { fontSize: 15, fontWeight: '700', color: '#2b6cb0' },
  dayBadge: { fontSize: 11, color: '#718096' },
  emptyDay: { color: '#a0aec0', fontSize: 12, fontStyle: 'italic', paddingVertical: 4 },
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7fafc',
    borderRadius: 6,
    padding: 8,
    marginVertical: 4,
  },
  colorIndicator: { width: 4, height: 32, borderRadius: 2 },
  subjectName: { fontSize: 14, fontWeight: '600', color: '#1a202c' },
  timeLocation: { fontSize: 12, color: '#4a5568', marginTop: 2 },
  errorBox: { backgroundColor: '#fff5f5', padding: 10, borderRadius: 6, marginVertical: 8 },
  errorText: { color: '#c53030', fontSize: 13 },
});