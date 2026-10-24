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
import type { Habit } from '@unitrack/contracts';

export function MobileHabitsTab() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick add states
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [frequencyType, setFrequencyType] = useState<'DAILY' | 'SELECTED_WEEKDAYS' | 'WEEKLY_TARGET'>('DAILY');
  const [targetCount, setTargetCount] = useState('1');

  const loadHabits = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await mobileApi.getHabits();
      setHabits(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load habits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHabits();
  }, []);

  const handleLog = async (habitId: string, status: 'COMPLETED' | 'SKIPPED') => {
    try {
      const todayDate = new Date().toISOString().split('T')[0];
      await mobileApi.logHabitOccurrence(habitId, {
        date: todayDate,
        status,
        completedUnits: 1,
      });
      await loadHabits();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleCreateHabit = async () => {
    if (!title.trim()) return;
    try {
      await mobileApi.createHabit({
        title: title.trim(),
        frequencyType,
        targetUnits: parseInt(targetCount, 10) || 1,
      });
      setTitle('');
      setFrequencyType('DAILY');
      setTargetCount('1');
      setIsAdding(false);
      await loadHabits();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    Alert.alert('Delete Habit', 'Are you sure you want to delete this habit?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await mobileApi.deleteHabit(habitId);
            await loadHabits();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading Habits & Streaks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Daily Rituals</Text>
          <Text style={styles.subtitle}>Consistency over intensity.</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsAdding(!isAdding)}
        >
          <Text style={styles.addText}>{isAdding ? 'Close' : '+ New Habit'}</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Creation form */}
      {isAdding && (
        <View style={styles.createCard}>
          <Text style={styles.createTitle}>Establish a New Habit</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Deep reading, Morning mobility, Review code"
            placeholderTextColor="#94a3b8"
            value={title}
            onChangeText={setTitle}
          />
          <View style={styles.freqRow}>
            {(['DAILY', 'SELECTED_WEEKDAYS', 'WEEKLY_TARGET'] as const).map((freq) => (
              <TouchableOpacity
                key={freq}
                style={[
                  styles.freqPill,
                  frequencyType === freq && styles.freqPillActive,
                ]}
                onPress={() => setFrequencyType(freq)}
              >
                <Text
                  style={[
                    styles.freqText,
                    frequencyType === freq && styles.freqTextActive,
                  ]}
                >
                  {freq === 'DAILY' ? 'Daily' : freq === 'SELECTED_WEEKDAYS' ? 'Weekdays' : 'Weekly Target'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.submitButton} onPress={handleCreateHabit}>
            <Text style={styles.submitButtonText}>Save Habit</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Habit List */}
      {habits.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No habits yet</Text>
          <Text style={styles.emptySub}>
            Define your foundational habits to begin logging daily repetitions and building streaks.
          </Text>
        </View>
      ) : (
        habits.map((habit) => (
          <View key={habit.id} style={styles.habitCard}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.habitTitle}>{habit.title}</Text>
                <Text style={styles.habitCadence}>
                  {habit.frequencyType.toLowerCase()} • Target: {habit.targetUnits} {habit.unitLabel || 'reps'}
                </Text>
              </View>
              <View style={styles.streakBadge}>
                <Text style={styles.streakText}>🔥 {habit.currentStreak} d</Text>
                <Text style={styles.bestStreakText}>Best: {habit.longestStreak}</Text>
              </View>
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.actionDone}
                onPress={() => handleLog(habit.id, 'COMPLETED')}
              >
                <Text style={styles.actionDoneText}>✓ Done</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionSkip}
                onPress={() => handleLog(habit.id, 'SKIPPED')}
              >
                <Text style={styles.actionSkipText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionDelete}
                onPress={() => handleDeleteHabit(habit.id)}
              >
                <Text style={styles.actionDeleteText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#0f172a',
    borderRadius: 6,
  },
  addText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
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
  createCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  createTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
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
    marginBottom: 10,
  },
  freqRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  freqPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  freqPillActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  freqText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  freqTextActive: {
    color: '#ffffff',
  },
  submitButton: {
    backgroundColor: '#0f172a',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  habitCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  habitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  habitCadence: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  streakBadge: {
    alignItems: 'flex-end',
  },
  streakText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ea580c',
  },
  bestStreakText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  actionDone: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionDoneText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  actionSkip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  actionSkipText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '500',
  },
  actionDelete: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 6,
  },
  actionDeleteText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
  },
});
