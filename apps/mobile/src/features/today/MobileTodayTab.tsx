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
import { mobileApi, mobileSyncEngine } from '../../lib/api';
import type { SyncState } from '@unitrack/api-client';
import type { TodayResponse, Task, TodayCommitmentItem, TodayHabitItem } from '@unitrack/contracts';

interface MobileTodayTabProps {
  onNavigateToAcademic?: (tab: string) => void;
}

export function MobileTodayTab({ onNavigateToAcademic }: MobileTodayTabProps) {
  const [data, setData] = useState<TodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick add states
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickCommitmentTitle, setQuickCommitmentTitle] = useState('');
  const [quickStartTime, setQuickStartTime] = useState('09:00');
  const [quickEndTime, setQuickEndTime] = useState('10:00');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isAddingCommitment, setIsAddingCommitment] = useState(false);

  const loadToday = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await mobileApi.getToday();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load today stream');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadToday();
    const unsubscribe = mobileSyncEngine.subscribe((state: SyncState) => {
      if (!state.isSyncing && state.pendingCount === 0 && state.lastSyncedAt) {
        loadToday();
      }
    });
    return unsubscribe;
  }, []);

  const handleToggleTask = async (task: Task) => {
    const nextStatus = task.isCompleted ? 'PENDING' : 'COMPLETED';
    try {
      await mobileApi.updateTask(task.id, {
        status: nextStatus as any,
        version: task.version,
      });
      await loadToday();
    } catch (err: any) {
      // Fallback to offline queue on network failure
      await mobileSyncEngine.enqueueMutation({
        entityType: 'TASK',
        action: 'UPDATE',
        entityId: task.id,
        payload: { status: nextStatus },
        version: task.version,
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((t) =>
                t.id === task.id
                  ? { ...t, isCompleted: !t.isCompleted, status: nextStatus as any }
                  : t
              ),
            }
          : null
      );
      Alert.alert('Offline', 'Task update queued for sync upon reconnection.');
    }
  };

  const handleLogCommitment = async (c: TodayCommitmentItem, status: 'ATTENDED' | 'CANCELLED') => {
    if (c.source === 'ACADEMIC') {
      if (onNavigateToAcademic) onNavigateToAcademic('timetable');
      return;
    }
    const todayDate = data?.date || new Date().toISOString().split('T')[0];
    try {
      await mobileApi.logCommitmentOccurrence(c.id, todayDate, { status });
      await loadToday();
    } catch (err: any) {
      await mobileSyncEngine.enqueueMutation({
        entityType: 'COMMITMENT_LOG',
        action: 'CREATE',
        entityId: c.id,
        payload: { date: todayDate, status },
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              commitments: prev.commitments.map((item) =>
                item.id === c.id ? { ...item, status } : item
              ),
            }
          : null
      );
      Alert.alert('Offline', 'Commitment log queued for sync.');
    }
  };

  const handleLogHabit = async (habitId: string, status: 'COMPLETED' | 'SKIPPED') => {
    const todayDate = data?.date || new Date().toISOString().split('T')[0];
    try {
      await mobileApi.logHabitOccurrence(habitId, {
        date: todayDate,
        status,
        completedUnits: 1,
      });
      await loadToday();
    } catch (err: any) {
      await mobileSyncEngine.enqueueMutation({
        entityType: 'HABIT_LOG',
        action: 'CREATE',
        entityId: habitId,
        payload: { date: todayDate, status, completedUnits: 1 },
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              habits: prev.habits.map((item) =>
                item.habit.id === habitId ? { ...item, status } : item
              ),
            }
          : null
      );
      Alert.alert('Offline', 'Habit log queued for sync.');
    }
  };

  const handleCreateTask = async () => {
    if (!quickTaskTitle.trim()) return;
    try {
      await mobileApi.createTask({
        title: quickTaskTitle.trim(),
        taskType: 'OTHER',
        priority: 'MEDIUM',
      });
      setQuickTaskTitle('');
      setIsAddingTask(false);
      await loadToday();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleCreateCommitment = async () => {
    if (!quickCommitmentTitle.trim()) return;
    try {
      const todayDate = data?.date || new Date().toISOString().split('T')[0];
      await mobileApi.createCommitment({
        title: quickCommitmentTitle.trim(),
        isRecurring: false,
        specificDate: todayDate,
        startTime: quickStartTime,
        endTime: quickEndTime,
      });
      setQuickCommitmentTitle('');
      setIsAddingCommitment(false);
      await loadToday();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Composing Today's Chronicle...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || 'Could not load today view'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadToday}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Date Header */}
      <View style={styles.dateCard}>
        <Text style={styles.dateLabel}>{data.date}</Text>
        <Text style={styles.chronicleTitle}>Today's Rhythm & Intentions</Text>
        {data.topIntentions.length > 0 && (
          <View style={styles.intentionsRow}>
            <Text style={styles.intentionsText}>
              Anchor: {data.topIntentions[0]}
            </Text>
          </View>
        )}
      </View>

      {/* Commitments Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Commitments & Schedule</Text>
          <TouchableOpacity onPress={() => setIsAddingCommitment(!isAddingCommitment)}>
            <Text style={styles.actionText}>{isAddingCommitment ? 'Cancel' : '+ Add'}</Text>
          </TouchableOpacity>
        </View>

        {isAddingCommitment && (
          <View style={styles.inlineForm}>
            <TextInput
              style={styles.input}
              placeholder="Commitment title..."
              placeholderTextColor="#64748b"
              value={quickCommitmentTitle}
              onChangeText={setQuickCommitmentTitle}
            />
            <View style={styles.timeRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                placeholder="Start (09:00)"
                placeholderTextColor="#64748b"
                value={quickStartTime}
                onChangeText={setQuickStartTime}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="End (10:00)"
                placeholderTextColor="#64748b"
                value={quickEndTime}
                onChangeText={setQuickEndTime}
              />
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={handleCreateCommitment}>
              <Text style={styles.saveButtonText}>Save Commitment</Text>
            </TouchableOpacity>
          </View>
        )}

        {data.commitments.length === 0 ? (
          <Text style={styles.emptyText}>No commitments scheduled for today.</Text>
        ) : (
          data.commitments.map((c) => (
            <View key={c.id} style={styles.itemCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.timeText}>{c.startTime} – {c.endTime}</Text>
                <Text style={styles.itemTitle}>{c.title}</Text>
                {c.location && <Text style={styles.subText}>📍 {c.location}</Text>}
              </View>

              <View style={styles.btnRow}>
                {c.status === 'ATTENDED' ? (
                  <Text style={styles.statusBadgeAttended}>Attended</Text>
                ) : c.status === 'CANCELLED' ? (
                  <Text style={styles.statusBadgeCancelled}>Cancelled</Text>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.smallBtn}
                      onPress={() => handleLogCommitment(c, 'ATTENDED')}
                    >
                      <Text style={styles.smallBtnText}>Attend</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.smallBtnSecondary}
                      onPress={() => handleLogCommitment(c, 'CANCELLED')}
                    >
                      <Text style={styles.smallBtnSecText}>Skip</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Prioritized Tasks Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tasks & Action Items</Text>
          <TouchableOpacity onPress={() => setIsAddingTask(!isAddingTask)}>
            <Text style={styles.actionText}>{isAddingTask ? 'Cancel' : '+ Add'}</Text>
          </TouchableOpacity>
        </View>

        {isAddingTask && (
          <View style={styles.inlineForm}>
            <TextInput
              style={styles.input}
              placeholder="Task title..."
              placeholderTextColor="#64748b"
              value={quickTaskTitle}
              onChangeText={setQuickTaskTitle}
            />
            <TouchableOpacity style={styles.saveButton} onPress={handleCreateTask}>
              <Text style={styles.saveButtonText}>Save Task</Text>
            </TouchableOpacity>
          </View>
        )}

        {data.tasks.length === 0 ? (
          <Text style={styles.emptyText}>All tasks completed or none due today.</Text>
        ) : (
          data.tasks.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.itemCard, t.isCompleted && { opacity: 0.5 }]}
              onPress={() => handleToggleTask(t)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemTitle, t.isCompleted && styles.completedText]}>
                  {t.title}
                </Text>
                <View style={styles.tagRow}>
                  <Text style={styles.priorityBadge}>{t.priority}</Text>
                  {t.contextName && <Text style={styles.contextBadge}>{t.contextName}</Text>}
                </View>
              </View>
              <Text style={styles.checkIcon}>{t.isCompleted ? '✓' : '○'}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Daily Habits Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daily Habits & Cadence</Text>
        </View>

        {data.habits.length === 0 ? (
          <Text style={styles.emptyText}>No active habits configured.</Text>
        ) : (
          data.habits.map((item) => {
            const h = item.habit;
            const isDone = item.status === 'COMPLETED';
            return (
              <View key={h.id} style={styles.itemCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{h.title}</Text>
                  <Text style={styles.subText}>🔥 Streak: {h.currentStreak} days</Text>
                </View>

                <TouchableOpacity
                  style={[styles.habitBtn, isDone && styles.habitBtnDone]}
                  onPress={() => handleLogHabit(h.id, isDone ? 'SKIPPED' : 'COMPLETED')}
                >
                  <Text style={styles.habitBtnText}>{isDone ? 'Completed' : 'Mark Done'}</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingBottom: 40,
  },
  centerContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  dateCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  dateLabel: {
    color: '#818cf8',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  chronicleTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  intentionsRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  intentionsText: {
    color: '#fbbf24',
    fontSize: 12,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionText: {
    color: '#818cf8',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  itemCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeText: {
    color: '#818cf8',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  itemTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#64748b',
  },
  subText: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  priorityBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    color: '#a5b4fc',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  contextBadge: {
    backgroundColor: '#1e293b',
    color: '#94a3b8',
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  checkIcon: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 6,
  },
  smallBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  smallBtnText: {
    color: '#020617',
    fontSize: 11,
    fontWeight: 'bold',
  },
  smallBtnSecondary: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  smallBtnSecText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  statusBadgeAttended: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: 'bold',
  },
  statusBadgeCancelled: {
    color: '#64748b',
    fontSize: 11,
    fontStyle: 'italic',
  },
  habitBtn: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  habitBtnDone: {
    backgroundColor: '#334155',
  },
  habitBtnText: {
    color: '#020617',
    fontSize: 12,
    fontWeight: 'bold',
  },
  inlineForm: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#020617',
    color: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
  },
  saveButton: {
    backgroundColor: '#4f46e5',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
