import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { mobileApi } from '../../lib/api';
import type { WeeklyReview } from '@unitrack/contracts';

function getCurrentMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

export function MobileReviewTab() {
  const currentWeekMonday = getCurrentMonday();
  const [weekStart, setWeekStart] = useState<string>(currentWeekMonday);
  const [review, setReview] = useState<WeeklyReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form values
  const [whatWentWell, setWhatWentWell] = useState('');
  const [whatToImprove, setWhatToImprove] = useState('');
  const [keyTakeaways, setKeyTakeaways] = useState('');
  const [intentions, setIntentions] = useState('');

  const loadReview = async (week: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await mobileApi.getReviewForWeek(week);
      setReview(res);
      const reflections = res.reflections || { whatWentWell: '', whatToImprove: '', keyTakeaways: '' };
      setWhatWentWell(reflections.whatWentWell || '');
      setWhatToImprove(reflections.whatToImprove || '');
      setKeyTakeaways(reflections.keyTakeaways || '');
      const ints = Array.isArray(res.intentions) ? (res.intentions as string[]).join('\n') : '';
      setIntentions(ints);
    } catch (err: any) {
      setError(err.message || 'Failed to load weekly review');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReview(weekStart);
  }, [weekStart]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const parsedIntentions = intentions
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const saved = await mobileApi.saveWeeklyReview({
        weekStart,
        reflections: {
          whatWentWell,
          whatToImprove,
          keyTakeaways,
        },
        intentions: parsedIntentions,
      });

      setReview(saved);
      Alert.alert('Saved', 'Your weekly reflection and intentions have been recorded.');
    } catch (err: any) {
      Alert.alert('Save Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading Weekly Chronicle...</Text>
      </View>
    );
  }

  const metrics = review?.metrics || {
    tasksCompleted: 0,
    commitmentsAttended: 0,
    habitCompletions: 0,
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Weekly Review</Text>
        <Text style={styles.subtitle}>Week of {weekStart}</Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Snapshot metrics */}
      <View style={styles.metricsCard}>
        <Text style={styles.cardHeader}>Week at a Glance</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{metrics.tasksCompleted ?? 0}</Text>
            <Text style={styles.statLabel}>Tasks Done</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{metrics.commitmentsAttended ?? 0}</Text>
            <Text style={styles.statLabel}>Attended</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{metrics.habitCompletions ?? 0}</Text>
            <Text style={styles.statLabel}>Habit Reps</Text>
          </View>
        </View>
      </View>

      {/* Retrospective reflections */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Retrospective Reflection</Text>

        <Text style={styles.fieldLabel}>Key Wins & Accomplishments</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={3}
          placeholder="What went exceptionally well this week?"
          placeholderTextColor="#94a3b8"
          value={whatWentWell}
          onChangeText={setWhatWentWell}
        />

        <Text style={styles.fieldLabel}>Friction & Challenges</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={3}
          placeholder="Where did intentions slip or reality diverge from plan?"
          placeholderTextColor="#94a3b8"
          value={whatToImprove}
          onChangeText={setWhatToImprove}
        />

        <Text style={styles.fieldLabel}>Key Insight / Lesson</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={2}
          placeholder="One principle to carry forward into next week..."
          placeholderTextColor="#94a3b8"
          value={keyTakeaways}
          onChangeText={setKeyTakeaways}
        />
      </View>

      {/* Next week intentions */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Intentions for Next Week</Text>
        <Text style={styles.fieldDesc}>
          List your high-leverage focus areas (one per line):
        </Text>
        <TextInput
          style={[styles.input, styles.textAreaLarge]}
          multiline
          numberOfLines={4}
          placeholder="1. Finish architecture refactor&#10;2. 5x morning workout&#10;3. Submit quarterly assessment"
          placeholderTextColor="#94a3b8"
          value={intentions}
          onChangeText={setIntentions}
        />
      </View>

      {/* Save action */}
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Commit Weekly Review</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  center: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  header: {
    marginVertical: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
  },
  metricsCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#38bdf8',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginTop: 8,
    marginBottom: 4,
  },
  fieldDesc: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0f172a',
  },
  textArea: {
    height: 64,
    textAlignVertical: 'top',
  },
  textAreaLarge: {
    height: 96,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#0f172a',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
});
