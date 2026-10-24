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
import type { Goal } from '@unitrack/contracts';

export function MobileGoalsTab() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');

  const loadGoals = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await mobileApi.getGoals();
      setGoals(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const handleToggleMilestone = async (goalId: string, milestoneId: string, current: boolean) => {
    try {
      await mobileApi.updateMilestone(goalId, milestoneId, { isCompleted: !current });
      await loadGoals();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleCreateGoal = async () => {
    if (!newTitle.trim()) return;
    try {
      await mobileApi.createGoal({
        title: newTitle.trim(),
        targetDate: newTargetDate.trim() || undefined,
      });
      setNewTitle('');
      setNewTargetDate('');
      setIsAdding(false);
      await loadGoals();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading Horizons & Goals...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Goals & Key Milestones</Text>
        <TouchableOpacity onPress={() => setIsAdding(!isAdding)}>
          <Text style={styles.addText}>{isAdding ? 'Cancel' : '+ Goal'}</Text>
        </TouchableOpacity>
      </View>

      {isAdding && (
        <View style={styles.formCard}>
          <TextInput
            style={styles.input}
            placeholder="Goal title..."
            placeholderTextColor="#64748b"
            value={newTitle}
            onChangeText={setNewTitle}
          />
          <TextInput
            style={styles.input}
            placeholder="Target date (YYYY-MM-DD)"
            placeholderTextColor="#64748b"
            value={newTargetDate}
            onChangeText={setNewTargetDate}
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleCreateGoal}>
            <Text style={styles.saveBtnText}>Save Goal</Text>
          </TouchableOpacity>
        </View>
      )}

      {goals.length === 0 ? (
        <Text style={styles.empty}>No active goals yet. Dream big and set your horizon.</Text>
      ) : (
        goals.map((g) => (
          <View key={g.id} style={styles.goalCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.goalTitle}>{g.title}</Text>
              <Text style={styles.progressText}>{g.progressPercentage}%</Text>
            </View>

            {/* Progress bar */}
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${g.progressPercentage}%` }]} />
            </View>

            {/* Milestones list */}
            {g.milestones.length > 0 && (
              <View style={styles.milestonesList}>
                {g.milestones.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={styles.milestoneRow}
                    onPress={() => handleToggleMilestone(g.id, m.id, m.isCompleted)}
                  >
                    <Text style={styles.checkIcon}>{m.isCompleted ? '✓' : '○'}</Text>
                    <Text
                      style={[
                        styles.milestoneText,
                        m.isCompleted && styles.completedText,
                      ]}
                    >
                      {m.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingBottom: 40,
  },
  center: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addText: {
    color: '#818cf8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  empty: {
    color: '#64748b',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 30,
  },
  formCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
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
  saveBtn: {
    backgroundColor: '#4f46e5',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  goalCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  progressText: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 13,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#1e293b',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3,
  },
  milestonesList: {
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 8,
    gap: 6,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  checkIcon: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: 'bold',
  },
  milestoneText: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#64748b',
  },
});
