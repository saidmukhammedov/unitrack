import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ActivityIndicator } from 'react-native';
import { mobileApi } from '../../lib/api';
import type { NotificationPreference } from '@unitrack/contracts';

export function NotificationPreferencesCard() {
  const [prefs, setPrefs] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await mobileApi.getNotificationPreferences();
        setPrefs(res.data);
      } catch {
        // Ignored
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleToggle = async (category: 'TASK_REMINDER' | 'ASSESSMENT_REMINDER', value: boolean) => {
    const existing = prefs.find((p) => p.category === category);
    const leadTimeMinutes = existing ? existing.leadTimeMinutes : (category === 'TASK_REMINDER' ? 1440 : 60);

    try {
      const updated = await mobileApi.updateNotificationPreference(category, {
        isEnabled: value,
        leadTimeMinutes,
      });
      setPrefs((prev) => prev.map((p) => (p.category === category ? updated : p)));
      setStatusMsg('Preferences saved');
      setTimeout(() => setStatusMsg(null), 3000);
    } catch {
      alert('Failed to update notification setting');
    }
  };

  const handleCycleLeadTime = async (category: 'TASK_REMINDER' | 'ASSESSMENT_REMINDER') => {
    const existing = prefs.find((p) => p.category === category);
    if (!existing) return;

    const options = [30, 60, 120, 720, 1440, 2880];
    const currentIndex = options.indexOf(existing.leadTimeMinutes);
    const nextLeadTime = options[(currentIndex + 1) % options.length];

    try {
      const updated = await mobileApi.updateNotificationPreference(category, {
        isEnabled: existing.isEnabled,
        leadTimeMinutes: nextLeadTime,
      });
      setPrefs((prev) => prev.map((p) => (p.category === category ? updated : p)));
    } catch {
      alert('Failed to update lead time');
    }
  };

  const formatLeadTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min before`;
    if (minutes < 1440) return `${Math.round(minutes / 60)} hr before`;
    return `${Math.round(minutes / 1440)} day before`;
  };

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color="#2b6cb0" />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Push Notification Reminders</Text>
      <Text style={styles.cardSubtitle}>Configure mobile reminder lead times</Text>

      {statusMsg && <Text style={styles.successText}>{statusMsg}</Text>}

      {prefs.map((p) => (
        <View key={p.category} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>
              {p.category === 'TASK_REMINDER' ? 'Task Reminders' : 'Exam Reminders'}
            </Text>
            <TouchableOpacity onPress={() => handleCycleLeadTime(p.category)}>
              <Text style={styles.leadTimeLink}>
                Lead time: {formatLeadTime(p.leadTimeMinutes)} (tap to cycle)
              </Text>
            </TouchableOpacity>
          </View>
          <Switch
            value={p.isEnabled}
            onValueChange={(val) => handleToggle(p.category, val)}
            trackColor={{ false: '#cbd5e0', true: '#63b3ed' }}
            thumbColor={p.isEnabled ? '#2b6cb0' : '#f7fafc'}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 14,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1a365d' },
  cardSubtitle: { fontSize: 12, color: '#718096', marginTop: 2, marginBottom: 12 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#edf2f7',
  },
  label: { fontSize: 14, fontWeight: '600', color: '#2d3748' },
  leadTimeLink: { fontSize: 12, color: '#2b6cb0', marginTop: 2 },
  successText: { color: '#276749', fontSize: 12, marginBottom: 8 },
});
