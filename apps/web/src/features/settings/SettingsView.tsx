import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import type { NotificationPreference } from '@unitrack/contracts';

export function SettingsView() {
  const { user, refreshProfile, logout } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [languageCode, setLanguageCode] = useState(user?.languageCode || 'en');
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [institutionType, setInstitutionType] = useState(user?.institutionType || 'OTHER');

  // Notification preferences
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [prefLoading, setPrefLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmDeletePassword, setConfirmDeletePassword] = useState('');

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadPrefs() {
      setPrefLoading(true);
      try {
        const res = await api.getNotificationPreferences();
        setPreferences(res.data);
      } catch (err: any) {
        // Ignored or logged
      } finally {
        setPrefLoading(false);
      }
    }
    loadPrefs();
  }, []);

  const handleUpdatePref = async (category: 'TASK_REMINDER' | 'ASSESSMENT_REMINDER', isEnabled: boolean, leadTimeMinutes: number) => {
    try {
      const updated = await api.updateNotificationPreference(category, { isEnabled, leadTimeMinutes });
      setPreferences((prev) => prev.map((p) => (p.category === category ? updated : p)));
      setStatusMsg('Notification preferences updated.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update reminder settings');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setErrorMsg(null);
    try {
      await api.updateMe({
        displayName,
        languageCode: languageCode as any,
        timezone,
        institutionType: institutionType as any,
      });
      await refreshProfile();
      setStatusMsg('Profile updated successfully.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setErrorMsg(null);
    try {
      const res = await api.changePassword({ currentPassword, newPassword });
      setStatusMsg(res.message);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to change password');
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you absolutely sure you want to delete your account? All academic records will be permanently removed.')) {
      return;
    }
    setErrorMsg(null);
    try {
      await api.deleteMe({ confirmPassword: confirmDeletePassword });
      await logout();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete account');
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', padding: '1.5rem' }}>
      <h2>Account Settings</h2>

      {statusMsg && (
        <div style={{ color: 'green', marginBottom: '1rem', padding: '0.75rem', background: '#e8f5e9', borderRadius: 4 }}>
          {statusMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ color: 'red', marginBottom: '1rem', padding: '0.75rem', background: '#ffebee', borderRadius: 4 }}>
          {errorMsg}
        </div>
      )}

      <div style={{ background: '#f9f9f9', padding: '1.5rem', borderRadius: 8, marginBottom: '2rem' }}>
        <h3>Profile Information</h3>
        <form onSubmit={handleUpdateProfile}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Display Name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Preferred Language</label>
            <select
              value={languageCode}
              onChange={(e) => setLanguageCode(e.target.value as any)}
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
            >
              <option value="en">English (en)</option>
              <option value="uz">O'zbek (uz)</option>
              <option value="ru">Русский (ru)</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Timezone</label>
            <input
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="e.g. Asia/Tashkent"
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Institution Type</label>
            <select
              value={institutionType}
              onChange={(e) => setInstitutionType(e.target.value as any)}
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
            >
              <option value="SCHOOL">School</option>
              <option value="UNIVERSITY">University</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <button
            type="submit"
            style={{ padding: '0.6rem 1.2rem', background: '#0066cc', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            Save Profile
          </button>
        </form>
      </div>

      {/* Notification / Reminder Preferences */}
      <div style={{ background: '#f9f9f9', padding: '1.5rem', borderRadius: 8, marginBottom: '2rem' }}>
        <h3>Reminder Preferences</h3>
        <p style={{ fontSize: 13, color: '#666', marginTop: -4, marginBottom: 16 }}>
          Configure push notification lead times for tasks and examinations.
        </p>

        {prefLoading ? (
          <p style={{ color: '#777', fontSize: 13 }}>Loading reminder preferences...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {preferences.map((p) => (
              <div
                key={p.category}
                style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  padding: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <strong>{p.category === 'TASK_REMINDER' ? 'Task Due Reminders' : 'Exam & Assessment Reminders'}</strong>
                  <div style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>
                    Trigger notification before deadline
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <select
                    value={p.leadTimeMinutes}
                    onChange={(e) => handleUpdatePref(p.category, p.isEnabled, parseInt(e.target.value, 10))}
                    style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #cbd5e0' }}
                  >
                    <option value={30}>30 minutes before</option>
                    <option value={60}>1 hour before</option>
                    <option value={120}>2 hours before</option>
                    <option value={720}>12 hours before</option>
                    <option value={1440}>1 day before</option>
                    <option value={2880}>2 days before</option>
                    <option value={10080}>1 week before</option>
                  </select>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={p.isEnabled}
                      onChange={(e) => handleUpdatePref(p.category, e.target.checked, p.leadTimeMinutes)}
                    />
                    Enabled
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: '#f9f9f9', padding: '1.5rem', borderRadius: 8, marginBottom: '2rem' }}>
        <h3>Change Password</h3>
        <form onSubmit={handleChangePassword}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: 4 }}>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 chars, 1 uppercase, 1 digit"
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
              required
            />
          </div>

          <button
            type="submit"
            style={{ padding: '0.6rem 1.2rem', background: '#333', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            Update Password
          </button>
        </form>
      </div>

      <div style={{ background: '#fff0f0', padding: '1.5rem', borderRadius: 8, border: '1px solid #ffcdd2' }}>
        <h3 style={{ color: '#c62828' }}>Danger Zone</h3>
        <p style={{ fontSize: 14, color: '#555' }}>
          Deleting your account will permanently remove all subjects, timetables, grades, and sessions.
        </p>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>Confirm with Password (if email user)</label>
          <input
            type="password"
            value={confirmDeletePassword}
            onChange={(e) => setConfirmDeletePassword(e.target.value)}
            placeholder="Your current password"
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
        </div>
        <button
          onClick={handleDeleteAccount}
          style={{ padding: '0.6rem 1.2rem', background: '#c62828', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          Delete Account Permanently
        </button>
      </div>
    </div>
  );
}
