import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { mobileApi } from '../../lib/api';
import type { Assessment } from '@unitrack/contracts';

export function AssessmentsTab() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAssessments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await mobileApi.getAssessments();
      setAssessments(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssessments();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await mobileApi.deleteAssessment(id);
      await loadAssessments();
    } catch (err: any) {
      alert(err.message || 'Failed to delete assessment');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Exams & Assessments</Text>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#2b6cb0" />
          <Text style={styles.loadingText}>Loading assessment records...</Text>
        </View>
      ) : assessments.length === 0 ? (
        <Text style={styles.emptyText}>No assessments recorded.</Text>
      ) : (
        assessments.map((a) => {
          const percentage =
            a.rawScore != null && a.maxScore != null && a.maxScore > 0
              ? ((a.rawScore / a.maxScore) * 100).toFixed(1)
              : null;
          return (
            <View key={a.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{a.title}</Text>
                  <Text style={styles.cardSub}>
                    {a.subjectName || 'Course'} • {a.assessmentType}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    a.status === 'COMPLETED'
                      ? styles.badgeCompleted
                      : a.status === 'EXCUSED'
                      ? styles.badgeExcused
                      : styles.badgeScheduled,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      a.status === 'COMPLETED'
                        ? styles.textCompleted
                        : a.status === 'EXCUSED'
                        ? styles.textExcused
                        : styles.textScheduled,
                    ]}
                  >
                    {a.status}
                  </Text>
                </View>
              </View>

              <View style={styles.scoreRow}>
                <Text style={styles.scoreText}>
                  Score:{' '}
                  {a.rawScore != null ? (
                    <Text style={{ fontWeight: 'bold' }}>
                      {a.rawScore} / {a.maxScore} ({percentage}%)
                    </Text>
                  ) : (
                    <Text style={{ color: '#a0aec0' }}>— / {a.maxScore ?? '—'}</Text>
                  )}
                </Text>
                <Text style={styles.weightText}>Weight: {a.weight}%</Text>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.dateText}>
                  Scheduled: {new Date(a.scheduledAt).toLocaleDateString()}
                </Text>
                <TouchableOpacity onPress={() => handleDelete(a.id)}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  center: { padding: 24, alignItems: 'center' },
  loadingText: { marginTop: 8, color: '#718096', fontSize: 13 },
  title: { fontSize: 20, fontWeight: '700', color: '#1a365d', marginBottom: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#1a202c' },
  cardSub: { fontSize: 12, color: '#718096', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeCompleted: { backgroundColor: '#c6f6d5' },
  badgeExcused: { backgroundColor: '#feebc8' },
  badgeScheduled: { backgroundColor: '#ebf8ff' },
  statusText: { fontSize: 10, fontWeight: '700' },
  textCompleted: { color: '#22543d' },
  textExcused: { color: '#7b341e' },
  textScheduled: { color: '#2b6cb0' },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
    backgroundColor: '#f7fafc',
    padding: 8,
    borderRadius: 4,
  },
  scoreText: { fontSize: 13, color: '#2d3748' },
  weightText: { fontSize: 13, color: '#4a5568' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { fontSize: 11, color: '#718096' },
  deleteText: { color: '#e53e3e', fontSize: 12, fontWeight: '600' },
  emptyText: { color: '#a0aec0', fontSize: 13, textAlign: 'center', marginTop: 20 },
  errorBox: { backgroundColor: '#fff5f5', padding: 8, borderRadius: 6, marginBottom: 10 },
  errorText: { color: '#c53030', fontSize: 12 },
});