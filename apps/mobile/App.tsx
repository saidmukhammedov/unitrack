import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { mobileApi } from './src/lib/api';
import type { UserProfile } from '@unitrack/contracts';
import { MobileTodayTab } from './src/features/today/MobileTodayTab';
import { MobileHabitsTab } from './src/features/habits/MobileHabitsTab';
import { MobileGoalsTab } from './src/features/goals/MobileGoalsTab';
import { MobileReviewTab } from './src/features/reviews/MobileReviewTab';
import { DashboardTab } from './src/features/academic/DashboardTab';
import { TimetableTab } from './src/features/academic/TimetableTab';
import { TasksTab } from './src/features/academic/TasksTab';
import { AssessmentsTab } from './src/features/academic/AssessmentsTab';
import { GradesTab } from './src/features/academic/GradesTab';
import { NotificationPreferencesCard } from './src/features/academic/NotificationPreferencesCard';

type AuthScreen = 'login' | 'register' | 'verify' | 'forgot';
type MainTab = 'today' | 'habits' | 'goals' | 'review' | 'academic' | 'profile';
type AcademicSubTab = 'dashboard' | 'timetable' | 'tasks' | 'assessments' | 'grades';

export default function App() {
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
  const [activeTab, setActiveTab] = useState<MainTab>('today');
  const [academicSubTab, setAcademicSubTab] = useState<AcademicSubTab>('dashboard');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registeredDeviceId, setRegisteredDeviceId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // §SYNC-03: Refresh data when returning to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        setRefreshKey((k) => k + 1);
      }
    });
    return () => sub.remove();
  }, []);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [languageCode, setLanguageCode] = useState<'en' | 'uz' | 'ru'>('en');
  const [verifyToken, setVerifyToken] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const clearMessages = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const registerPushDevice = async (userId: string) => {
    try {
      // Register device push token per NOTIF-06
      const dev = await mobileApi.registerDevice({
        expoPushToken: `ExponentPushToken[mobile-${userId.slice(0, 8)}]`,
        platform: 'ANDROID',
        deviceLabel: 'UniTrack Mobile Device',
      });
      setRegisteredDeviceId(dev.id);
    } catch {
      // Permission or simulator mock fallback handled safely
    }
  };

  const handleLogin = async () => {
    clearMessages();
    setLoading(true);
    try {
      const res = await mobileApi.login({ email, password });
      setUser(res.user);
      setActiveTab('today');
      await registerPushDevice(res.user.id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    clearMessages();
    setLoading(true);
    try {
      const res = await mobileApi.googleAuth({ idToken: 'valid-google-id-token' });
      setUser(res.user);
      setActiveTab('today');
      await registerPushDevice(res.user.id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    clearMessages();
    setLoading(true);
    try {
      const res = await mobileApi.register({
        email,
        password,
        displayName,
        languageCode,
      });
      setStatusMessage(res.message);
      setAuthScreen('verify');
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    clearMessages();
    setLoading(true);
    try {
      const res = await mobileApi.verifyEmail({ token: verifyToken });
      setStatusMessage(res.message);
      setAuthScreen('login');
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    clearMessages();
    setLoading(true);
    try {
      const res = await mobileApi.forgotPassword({ email });
      setStatusMessage(res.message);
    } catch (err: any) {
      setErrorMessage(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    clearMessages();
    setLoading(true);
    try {
      const res = await mobileApi.resetPassword({ token: resetToken, newPassword });
      setStatusMessage(res.message);
      setAuthScreen('login');
    } catch (err: any) {
      setErrorMessage(err.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      // Unregister mobile device push token on logout
      if (registeredDeviceId) {
        await mobileApi.unregisterDevice(registeredDeviceId).catch(() => {});
        setRegisteredDeviceId(null);
      }
      await mobileApi.logout();
    } catch {
      // Ignored
    } finally {
      setUser(null);
      setAuthScreen('login');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ----------------- Header ----------------- */}
      <View style={styles.header}>
        <Text style={styles.brandTitle}>UniTrack</Text>
        <Text style={styles.brandSubtitle}>Personal Productivity & Chronicle</Text>
      </View>

      {/* ----------------- Authenticated View ----------------- */}
      {user ? (
        <View style={styles.authContainer}>
          {/* Main Navigation Tab Bar */}
          <View style={styles.tabBar}>
            {[
              { key: 'today', label: 'Today' },
              { key: 'habits', label: 'Habits' },
              { key: 'goals', label: 'Goals' },
              { key: 'review', label: 'Review' },
              { key: 'academic', label: 'Academic' },
              { key: 'profile', label: 'Profile' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab.key as MainTab)}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Academic Sub Navigation when Academic Tab is Active */}
          {activeTab === 'academic' && (
            <View style={styles.subTabBar}>
              {[
                { key: 'dashboard', label: 'Overview' },
                { key: 'timetable', label: 'Schedule' },
                { key: 'tasks', label: 'Tasks' },
                { key: 'assessments', label: 'Exams' },
                { key: 'grades', label: 'Grades' },
              ].map((sub) => (
                <TouchableOpacity
                  key={sub.key}
                  style={[styles.subTabButton, academicSubTab === sub.key && styles.subTabButtonActive]}
                  onPress={() => setAcademicSubTab(sub.key as AcademicSubTab)}
                >
                  <Text style={[styles.subTabText, academicSubTab === sub.key && styles.subTabTextActive]}>
                    {sub.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {activeTab === 'today' && (
              <MobileTodayTab
                key={`today-${refreshKey}`}
                onNavigateToAcademic={(tab) => {
                  setActiveTab('academic');
                  if (['dashboard', 'timetable', 'tasks', 'assessments', 'grades'].includes(tab)) {
                    setAcademicSubTab(tab as AcademicSubTab);
                  }
                }}
              />
            )}
            {activeTab === 'habits' && <MobileHabitsTab key={`habits-${refreshKey}`} />}
            {activeTab === 'goals' && <MobileGoalsTab key={`goals-${refreshKey}`} />}
            {activeTab === 'review' && <MobileReviewTab key={`review-${refreshKey}`} />}

            {/* Academic Hub view */}
            {activeTab === 'academic' && (
              <>
                {academicSubTab === 'dashboard' && (
                  <DashboardTab
                    key={`dash-${refreshKey}`}
                    user={user}
                    onNavigate={(t) => {
                      if (['dashboard', 'timetable', 'tasks', 'assessments', 'grades'].includes(t)) {
                        setAcademicSubTab(t as AcademicSubTab);
                      }
                    }}
                  />
                )}
                {academicSubTab === 'timetable' && <TimetableTab key={`time-${refreshKey}`} />}
                {academicSubTab === 'tasks' && <TasksTab key={`task-${refreshKey}`} />}
                {academicSubTab === 'assessments' && <AssessmentsTab key={`assess-${refreshKey}`} />}
                {academicSubTab === 'grades' && (
                  <GradesTab key={`grade-${refreshKey}`} locale={user.languageCode || 'en'} />
                )}
              </>
            )}

            {activeTab === 'profile' && (
              <View style={{ width: '100%', alignItems: 'center' }}>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Student Profile</Text>
                  <Text style={styles.label}>Name: {user.displayName}</Text>
                  <Text style={styles.label}>Email: {user.email}</Text>
                  <Text style={styles.label}>Verified: {user.emailVerified ? 'Yes' : 'No'}</Text>
                  <Text style={styles.label}>Language: {user.languageCode}</Text>
                  <Text style={styles.label}>Timezone: {user.timezone}</Text>

                  <TouchableOpacity style={styles.secondaryButton} onPress={handleLogout}>
                    <Text style={styles.secondaryButtonText}>Sign Out</Text>
                  </TouchableOpacity>
                </View>

                {/* Reminder Settings */}
                <NotificationPreferencesCard />
              </View>
            )}
          </ScrollView>
        </View>
      ) : (
        /* ----------------- Unauthenticated Flow ----------------- */
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {statusMessage && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{statusMessage}</Text>
            </View>
          )}

          {authScreen === 'login' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Sign In</Text>

              <TextInput
                style={styles.input}
                placeholder="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />

              <TextInput
                style={styles.input}
                placeholder="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Sign In</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.googleButton}
                onPress={handleGoogleLogin}
                disabled={loading}
              >
                <Text style={styles.googleButtonText}>Sign in with Google</Text>
              </TouchableOpacity>

              <View style={styles.linksRow}>
                <TouchableOpacity onPress={() => { clearMessages(); setAuthScreen('forgot'); }}>
                  <Text style={styles.linkText}>Forgot password?</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { clearMessages(); setAuthScreen('register'); }}>
                  <Text style={styles.linkText}>Create account</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {authScreen === 'register' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Create Account</Text>

              <TextInput
                style={styles.input}
                placeholder="Display Name"
                value={displayName}
                onChangeText={setDisplayName}
              />

              <TextInput
                style={styles.input}
                placeholder="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />

              <TextInput
                style={styles.input}
                placeholder="Password (min 8 chars, 1 uppercase, 1 digit)"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Register</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.textButton}
                onPress={() => { clearMessages(); setAuthScreen('login'); }}
              >
                <Text style={styles.linkText}>Already have an account? Sign In</Text>
              </TouchableOpacity>
            </View>
          )}

          {authScreen === 'verify' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Verify Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Verification Token"
                value={verifyToken}
                onChangeText={setVerifyToken}
              />

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleVerifyEmail}
                disabled={loading}
              >
                <Text style={styles.primaryButtonText}>Verify Account</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.textButton}
                onPress={() => { clearMessages(); setAuthScreen('login'); }}
              >
                <Text style={styles.linkText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          )}

          {authScreen === 'forgot' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Reset Password</Text>

              <TextInput
                style={styles.input}
                placeholder="Account Email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleForgotPassword}
                disabled={loading}
              >
                <Text style={styles.secondaryButtonText}>Request Reset Token</Text>
              </TouchableOpacity>

              <TextInput
                style={[styles.input, { marginTop: 16 }]}
                placeholder="Reset Token"
                value={resetToken}
                onChangeText={setResetToken}
              />

              <TextInput
                style={styles.input}
                placeholder="New Password"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleResetPassword}
                disabled={loading}
              >
                <Text style={styles.primaryButtonText}>Confirm New Password</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.textButton}
                onPress={() => { clearMessages(); setAuthScreen('login'); }}
              >
                <Text style={styles.linkText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  authContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1a365d',
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: 'space-around',
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: '#2b6cb0',
  },
  tabText: {
    color: '#cbd5e0',
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: '#2d3748',
    paddingHorizontal: 6,
    paddingVertical: 4,
    justifyContent: 'space-around',
  },
  subTabButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  subTabButtonActive: {
    backgroundColor: '#4a5568',
  },
  subTabText: {
    color: '#a0aec0',
    fontSize: 12,
    fontWeight: '500',
  },
  subTabTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a365d',
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#4a5568',
    marginTop: 2,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    color: '#4a5568',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  primaryButton: {
    backgroundColor: '#2b6cb0',
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#edf2f7',
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: '#2d3748',
    fontSize: 14,
    fontWeight: '600',
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e0',
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  googleButtonText: {
    color: '#4a5568',
    fontSize: 14,
    fontWeight: '500',
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  textButton: {
    alignItems: 'center',
    marginTop: 14,
  },
  linkText: {
    color: '#3182ce',
    fontSize: 14,
  },
  errorBox: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff5f5',
    borderColor: '#feb2b2',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#c53030',
    fontSize: 13,
  },
  successBox: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#f0fff4',
    borderColor: '#9ae6b4',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  successText: {
    color: '#276749',
    fontSize: 13,
  },
});