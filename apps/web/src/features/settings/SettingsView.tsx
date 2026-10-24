import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import type { NotificationPreference } from '@unitrack/contracts';
import { User, Bell, Key, AlertTriangle, Check, Shield } from 'lucide-react';

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
    if (!window.confirm('Are you absolutely sure you want to delete your account? All records will be permanently removed.')) {
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
    <div className="max-w-3xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <header className="border-b border-[#E5E3D8] pb-8 pt-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 text-[11px] font-mono-tabular tracking-wider uppercase text-[#74726A]">
            <span>Account Ledger</span>
            <span className="text-[#D8D5C8]">•</span>
            <span>Preferences & Security</span>
          </div>
          <h1 className="font-serif-chronicle text-3xl sm:text-5xl text-[#171614] font-normal tracking-tight">
            Account Settings
          </h1>
          <p className="text-xs text-[#74726A] max-w-xl">
            Configure identity parameters, localized timestamps, and notification lead times.
          </p>
        </div>
      </header>

      {/* Status Messages */}
      {statusMsg && (
        <div className="p-3.5 rounded bg-[#2C4839]/10 border border-[#2C4839]/20 text-[#2C4839] text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded bg-[#A33F17]/10 border border-[#A33F17]/20 text-[#A33F17] text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Profile Section */}
      <section className="p-6 rounded border border-[#E5E3D8] bg-[#FBFBF9] space-y-6">
        <div className="flex items-baseline gap-2 border-b border-[#E5E3D8] pb-3">
          <User className="w-4 h-4 text-[#171614]" />
          <h2 className="font-serif-chronicle text-2xl text-[#171614] font-normal">
            Profile Information
          </h2>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="text-xs font-mono-tabular uppercase tracking-wider text-[#74726A] block mb-1">
              Display Name
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono-tabular uppercase tracking-wider text-[#74726A] block mb-1">
                Preferred Language
              </label>
              <select
                value={languageCode}
                onChange={(e) => setLanguageCode(e.target.value as any)}
                className="w-full text-xs font-mono-tabular"
              >
                <option value="en">English (en)</option>
                <option value="uz">O'zbek (uz)</option>
                <option value="ru">Русский (ru)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-mono-tabular uppercase tracking-wider text-[#74726A] block mb-1">
                Timezone
              </label>
              <input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="e.g. Asia/Tashkent"
                className="w-full text-xs font-mono-tabular"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-mono-tabular uppercase tracking-wider text-[#74726A] block mb-1">
              Institution Affiliation (Optional)
            </label>
            <select
              value={institutionType}
              onChange={(e) => setInstitutionType(e.target.value as any)}
              className="w-full text-xs font-mono-tabular"
            >
              <option value="SCHOOL">School</option>
              <option value="UNIVERSITY">University</option>
              <option value="OTHER">Independent / Other</option>
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-5 py-2 text-xs font-medium text-[#FBFBF9] bg-[#171614] hover:bg-[#2C2B27] rounded transition-colors cursor-pointer"
            >
              Save Profile
            </button>
          </div>
        </form>
      </section>

      {/* Reminder Preferences */}
      <section className="p-6 rounded border border-[#E5E3D8] bg-[#FBFBF9] space-y-6">
        <div className="flex items-baseline justify-between border-b border-[#E5E3D8] pb-3">
          <div className="flex items-baseline gap-2">
            <Bell className="w-4 h-4 text-[#171614]" />
            <h2 className="font-serif-chronicle text-2xl text-[#171614] font-normal">
              Reminder Preferences
            </h2>
          </div>
          <span className="text-[11px] font-mono-tabular text-[#74726A]">Push & Device Lead Times</span>
        </div>

        {prefLoading ? (
          <p className="text-xs font-mono-tabular text-[#74726A]">Loading preferences...</p>
        ) : (
          <div className="space-y-3">
            {preferences.map((p) => (
              <div
                key={p.category}
                className="p-4 rounded border border-[#E5E3D8] bg-[#F4F3ED]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <h4 className="text-sm font-medium text-[#171614]">
                    {p.category === 'TASK_REMINDER' ? 'Task Due Reminders' : 'Exam & Assessment Reminders'}
                  </h4>
                  <p className="text-xs text-[#74726A]">
                    Trigger notification prior to stated deadline
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={p.leadTimeMinutes}
                    onChange={(e) => handleUpdatePref(p.category, p.isEnabled, parseInt(e.target.value, 10))}
                    className="text-xs font-mono-tabular py-1 px-2.5"
                  >
                    <option value={30}>30 minutes before</option>
                    <option value={60}>1 hour before</option>
                    <option value={120}>2 hours before</option>
                    <option value={720}>12 hours before</option>
                    <option value={1440}>1 day before</option>
                    <option value={2880}>2 days before</option>
                    <option value={10080}>1 week before</option>
                  </select>

                  <label className="flex items-center gap-2 text-xs font-mono-tabular text-[#171614] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={p.isEnabled}
                      onChange={(e) => handleUpdatePref(p.category, e.target.checked, p.leadTimeMinutes)}
                      className="cursor-pointer"
                    />
                    Enabled
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Change Password */}
      <section className="p-6 rounded border border-[#E5E3D8] bg-[#FBFBF9] space-y-6">
        <div className="flex items-baseline gap-2 border-b border-[#E5E3D8] pb-3">
          <Key className="w-4 h-4 text-[#171614]" />
          <h2 className="font-serif-chronicle text-2xl text-[#171614] font-normal">
            Change Password
          </h2>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono-tabular uppercase tracking-wider text-[#74726A] block mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full text-xs"
                required
              />
            </div>

            <div>
              <label className="text-xs font-mono-tabular uppercase tracking-wider text-[#74726A] block mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 chars, 1 uppercase, 1 digit"
                className="w-full text-xs"
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-5 py-2 text-xs font-medium text-[#FBFBF9] bg-[#171614] hover:bg-[#2C2B27] rounded transition-colors cursor-pointer"
            >
              Update Password
            </button>
          </div>
        </form>
      </section>

      {/* Danger Zone */}
      <section className="p-6 rounded border border-[#A33F17]/30 bg-[#A33F17]/5 space-y-4">
        <div className="flex items-baseline gap-2 border-b border-[#A33F17]/20 pb-3">
          <Shield className="w-4 h-4 text-[#A33F17]" />
          <h2 className="font-serif-chronicle text-2xl text-[#A33F17] font-normal">
            Danger Zone
          </h2>
        </div>

        <p className="text-xs text-[#74726A] leading-relaxed">
          Deleting your account will irreversibly remove all commitments, tasks, habits, and academic records. This operation cannot be undone.
        </p>

        <div className="max-w-sm space-y-2">
          <label className="text-[11px] font-mono-tabular text-[#74726A] block">
            Confirm with Password (if email registered user)
          </label>
          <input
            type="password"
            value={confirmDeletePassword}
            onChange={(e) => setConfirmDeletePassword(e.target.value)}
            placeholder="Your current password"
            className="w-full text-xs"
          />
        </div>

        <div className="pt-2">
          <button
            onClick={handleDeleteAccount}
            className="px-4 py-2 bg-[#A33F17] hover:bg-[#853211] text-[#FBFBF9] rounded text-xs font-medium transition-colors cursor-pointer"
          >
            Delete Account Permanently
          </button>
        </div>
      </section>
    </div>
  );
}
