import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native';
import { mobileApi } from '../../lib/api';
import type { Task, CreateTaskInput } from '@unitrack/contracts';

export function TasksTab() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'all' | 'false' | 'true'>('false');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Add State
  const [title, setTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const loadTasks = async (completedFilter: 'all' | 'false' | 'true') => {
    setLoading(true);
    setError(null);
    try {
      const res = await mobileApi.getTasks({ completed: completedFilter });
      setTasks(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks(filter);
  }, [filter]);

  const handleToggle = async (task: Task) => {
    try {
      await mobileApi.updateTask(task.id, {
        completedAt: task.isCompleted ? null : new Date().toISOString(),
      });
      await loadTasks(filter);
    } catch (err: any) {
      alert(err.message || 'Failed to update task');
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setAdding(true);
    try {
      const input: CreateTaskInput = {
        title: title.trim(),
        taskType: 'HOMEWORK',
      };
      await mobileApi.createTask(input);
      setTitle('');
      await loadTasks(filter);
    } catch (err: any) {
      setError(err.message || 'Failed to create task');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await mobileApi.deleteTask(id);
      await loadTasks(filter);
    } catch (err: any) {
      alert(err.message || 'Failed to delete task');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tasks & Assignments</Text>

      {/* Filter Chips */}
      <View style={styles.chipRow}>
        {[
          { key: 'false', label: 'Pending' },
          { key: 'true', label: 'Completed' },
          { key: 'all', label: 'All Tasks' },
        ].map((c) => (
          <TouchableOpacity
            key={c.key}
            style={[styles.chip, filter === c.key && styles.chipActive]}
            onPress={() => setFilter(c.key as any)}
          >
            <Text style={[styles.chipText, filter === c.key && styles.chipTextActive]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Add Input */}
      <View style={styles.addBox}>
        <TextInput
          style={styles.input}
          placeholder="New task title..."
          value={title}
          onChangeText={setTitle}
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreate}
          disabled={adding || !title.trim()}
        >
          <Text style={styles.addButtonText}>{adding ? '...' : 'Add'}</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#2b6cb0" />
          <Text style={styles.loadingText}>Loading tasks...</Text>
        </View>
      ) : tasks.length === 0 ? (
        <Text style={styles.emptyText}>No tasks found.</Text>
      ) : (
        tasks.map((t) => (
          <View key={t.id} style={styles.taskCard}>
            <TouchableOpacity onPress={() => handleToggle(t)} style={styles.checkCircle}>
              <Text style={styles.checkText}>{t.isCompleted ? '✓' : ''}</Text>
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.taskTitle, t.isCompleted && styles.taskDone]}>
                {t.title}
              </Text>
              <Text style={styles.taskSub}>
                {t.subjectName ? `${t.subjectName} • ` : ''}
                {t.dueAt ? `Due ${new Date(t.dueAt).toLocaleDateString()}` : 'No due date'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(t.id)} style={styles.deleteBtn}>
              <Text style={styles.deleteText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  center: { padding: 24, alignItems: 'center' },
  loadingText: { marginTop: 8, color: '#718096', fontSize: 13 },
  title: { fontSize: 20, fontWeight: '700', color: '#1a365d', marginBottom: 12 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#edf2f7',
  },
  chipActive: { backgroundColor: '#2b6cb0' },
  chipText: { fontSize: 12, color: '#4a5568', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  addBox: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#2b6cb0',
    paddingHorizontal: 14,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2b6cb0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: '#2b6cb0', fontWeight: 'bold', fontSize: 13 },
  taskTitle: { fontSize: 14, fontWeight: '500', color: '#2d3748' },
  taskDone: { textDecorationLine: 'line-through', color: '#a0aec0' },
  taskSub: { fontSize: 11, color: '#718096', marginTop: 2 },
  deleteBtn: { padding: 4 },
  deleteText: { color: '#e53e3e', fontSize: 14 },
  emptyText: { color: '#a0aec0', fontSize: 13, textAlign: 'center', marginTop: 20 },
  errorBox: { backgroundColor: '#fff5f5', padding: 8, borderRadius: 6, marginBottom: 10 },
  errorText: { color: '#c53030', fontSize: 12 },
});