import type {
  HealthCheckResponse,
  RegisterInput,
  RegisterResponse,
  LoginInput,
  LoginResponse,
  GoogleAuthInput,
  VerifyEmailInput,
  VerifyEmailResponse,
  RefreshTokenResponse,
  ForgotPasswordInput,
  ForgotPasswordResponse,
  ResetPasswordInput,
  ResetPasswordResponse,
  SessionListResponse,
  UserProfile,
  UpdateUserMeInput,
  ChangePasswordInput,
  DeleteUserMeInput,
  ApiErrorResponse,
  AcademicPeriod,
  CreateAcademicPeriodInput,
  UpdateAcademicPeriodInput,
  Subject,
  CreateSubjectInput,
  UpdateSubjectInput,
  ClassSession,
  CreateClassSessionInput,
  UpdateClassSessionInput,
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskListResponse,
  Assessment,
  CreateAssessmentInput,
  UpdateAssessmentInput,
  AssessmentListResponse,
  DashboardResponse,
  GradingScheme,
  CreateGradingSchemeInput,
  UpdateGradingSchemeInput,
  GradingSchemeListResponse,
  SubjectGradeResponse,
  PeriodGpaResponse,
  RegisterDeviceInput,
  Device,
  DeviceListResponse,
  NotificationPreference,
  NotificationPreferenceListResponse,
  UpdateNotificationPreferenceInput,
  NotificationCategory,
  Context,
  CreateContextInput,
  UpdateContextInput,
  ContextListResponse,
  ScheduleCommitment,
  CreateScheduleCommitmentInput,
  UpdateScheduleCommitmentInput,
  CommitmentLog,
  LogCommitmentOccurrenceInput,
  Habit,
  CreateHabitInput,
  UpdateHabitInput,
  HabitLog,
  LogHabitOccurrenceInput,
  HabitListResponse,
  TodayResponse,
  Goal,
  CreateGoalInput,
  UpdateGoalInput,
  GoalListResponse,
  Milestone,
  CreateMilestoneInput,
  UpdateMilestoneInput,
  WeeklyReview,
  SaveWeeklyReviewInput,
  WeeklyReviewListResponse,
  BatchSyncRequest,
  BatchSyncResponse,
} from '@unitrack/contracts';

/**
 * Platform-agnostic token storage adapter interface
 * Implemented via SecureStore on mobile and memory/cookies on web
 */
export interface TokenStorageAdapter {
  getAccessToken(): Promise<string | null>;
  setAccessToken(token: string | null): Promise<void>;
  getRefreshToken?(): Promise<string | null>;
  setRefreshToken?(token: string | null): Promise<void>;
}

export interface ApiClientConfig {
  baseUrl: string;
  clientType?: 'web' | 'mobile';
  storageAdapter?: TokenStorageAdapter;
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * UniTrack API Client
 */
export class UniTrackApiClient {
  private baseUrl: string;
  private clientType: 'web' | 'mobile';
  private storageAdapter?: TokenStorageAdapter;
  private memoryAccessToken: string | null = null;
  private isRefreshing = false;
  private refreshSubscribers: Array<{
    resolve: (token: string) => void;
    reject: (err: unknown) => void;
  }> = [];

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl ? config.baseUrl.replace(/\/$/, '') : '';
    this.clientType = config.clientType || 'web';
    this.storageAdapter = config.storageAdapter;
  }

  async getAccessToken(): Promise<string | null> {
    if (this.storageAdapter) {
      return this.storageAdapter.getAccessToken();
    }
    return this.memoryAccessToken;
  }

  async setAccessToken(token: string | null): Promise<void> {
    if (this.storageAdapter) {
      await this.storageAdapter.setAccessToken(token);
    }
    this.memoryAccessToken = token;
  }

  async getRefreshToken(): Promise<string | null> {
    if (this.storageAdapter?.getRefreshToken) {
      return this.storageAdapter.getRefreshToken();
    }
    return null;
  }

  async setRefreshToken(token: string | null): Promise<void> {
    if (this.storageAdapter?.setRefreshToken) {
      await this.storageAdapter.setRefreshToken(token);
    }
  }

  /**
   * Internal HTTP request handler with automatic token refresh on 401
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth = false
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = new Headers(options.headers || {});

    if (this.clientType === 'mobile') {
      headers.set('X-Client-Type', 'mobile');
    }

    if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
      headers.set('Content-Type', 'application/json');
    }

    if (requireAuth) {
      const token = await this.getAccessToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    let abortTimeout: ReturnType<typeof setTimeout> | undefined;
    let signal = options.signal;
    if (!signal && typeof AbortController !== 'undefined') {
      const controller = new AbortController();
      signal = controller.signal;
      // 60-second timeout allows sufficient time for sleeping cloud instances (Render free-tier) to warm up
      abortTimeout = setTimeout(() => {
        controller.abort();
      }, 60000);
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal,
        credentials: options.credentials || 'include',
      });

      if (response.status === 401 && requireAuth && !endpoint.includes('/auth/refresh')) {
        // Trigger silent token refresh
        try {
          const refreshedToken = await this.performSilentRefresh();
          if (refreshedToken) {
            headers.set('Authorization', `Bearer ${refreshedToken}`);
            const retryResponse = await fetch(url, {
              ...options,
              headers,
              signal,
              credentials: options.credentials || 'include',
            });
            return this.handleResponse<T>(retryResponse);
          }
        } catch {
          await this.setAccessToken(null);
          await this.setRefreshToken(null);
        }
      }

      return this.handleResponse<T>(response);
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
        throw new ApiError(
          408,
          'REQUEST_TIMEOUT',
          'The server is taking longer than usual to respond. It may be waking up from sleep. Please try again.'
        );
      }
      throw err;
    } finally {
      if (abortTimeout) {
        clearTimeout(abortTimeout);
      }
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 204) {
      return undefined as unknown as T;
    }

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const body = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      if (isJson && (body as ApiErrorResponse).error) {
        const err = (body as ApiErrorResponse).error;
        throw new ApiError(response.status, err.code, err.message, err.details);
      }
      throw new ApiError(response.status, 'HTTP_ERROR', `Request failed with status ${response.status}`);
    }

    return body as T;
  }

  private async performSilentRefresh(): Promise<string | null> {
    if (this.isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        this.refreshSubscribers.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;

    try {
      const refreshToken = await this.getRefreshToken();
      const body = refreshToken ? JSON.stringify({ refreshToken }) : undefined;

      const res = await this.request<RefreshTokenResponse>('/api/v1/auth/refresh', {
        method: 'POST',
        body,
      });

      await this.setAccessToken(res.accessToken);
      if (res.refreshToken) {
        await this.setRefreshToken(res.refreshToken);
      }

      this.refreshSubscribers.forEach((subscriber) => subscriber.resolve(res.accessToken));
      this.refreshSubscribers = [];
      return res.accessToken;
    } catch (err) {
      this.refreshSubscribers.forEach((subscriber) => subscriber.reject(err));
      this.refreshSubscribers = [];
      throw err;
    } finally {
      this.isRefreshing = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Public Endpoints
  // ---------------------------------------------------------------------------

  async getHealth(): Promise<HealthCheckResponse> {
    return this.request<HealthCheckResponse>('/api/v1/health');
  }

  async register(input: RegisterInput): Promise<RegisterResponse> {
    return this.request<RegisterResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async verifyEmail(input: VerifyEmailInput): Promise<VerifyEmailResponse> {
    return this.request<VerifyEmailResponse>('/api/v1/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async login(input: LoginInput): Promise<LoginResponse> {
    const res = await this.request<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    await this.setAccessToken(res.accessToken);
    if (res.refreshToken) {
      await this.setRefreshToken(res.refreshToken);
    }
    return res;
  }

  async googleAuth(input: GoogleAuthInput): Promise<LoginResponse> {
    const res = await this.request<LoginResponse>('/api/v1/auth/google', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    await this.setAccessToken(res.accessToken);
    if (res.refreshToken) {
      await this.setRefreshToken(res.refreshToken);
    }
    return res;
  }

  async refresh(refreshToken?: string): Promise<RefreshTokenResponse> {
    const body = refreshToken ? JSON.stringify({ refreshToken }) : undefined;
    const res = await this.request<RefreshTokenResponse>('/api/v1/auth/refresh', {
      method: 'POST',
      body,
    });

    await this.setAccessToken(res.accessToken);
    if (res.refreshToken) {
      await this.setRefreshToken(res.refreshToken);
    }
    return res;
  }

  async logout(): Promise<void> {
    const refreshToken = await this.getRefreshToken();
    const body = refreshToken ? JSON.stringify({ refreshToken }) : undefined;

    await this.request<void>('/api/v1/auth/logout', {
      method: 'POST',
      body,
    });

    await this.setAccessToken(null);
    await this.setRefreshToken(null);
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<ForgotPasswordResponse> {
    return this.request<ForgotPasswordResponse>('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async resetPassword(input: ResetPasswordInput): Promise<ResetPasswordResponse> {
    return this.request<ResetPasswordResponse>('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // ---------------------------------------------------------------------------
  // Authenticated User & Session Endpoints
  // ---------------------------------------------------------------------------

  async getSessions(): Promise<SessionListResponse> {
    return this.request<SessionListResponse>('/api/v1/auth/sessions', { method: 'GET' }, true);
  }

  async deleteSession(sessionId: string): Promise<void> {
    return this.request<void>(`/api/v1/auth/sessions/${sessionId}`, { method: 'DELETE' }, true);
  }

  async getMe(): Promise<UserProfile> {
    return this.request<UserProfile>('/api/v1/users/me', { method: 'GET' }, true);
  }

  async updateMe(input: UpdateUserMeInput): Promise<UserProfile> {
    return this.request<UserProfile>(
      '/api/v1/users/me',
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
      true
    );
  }

  async changePassword(input: ChangePasswordInput): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      '/api/v1/users/me/change-password',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      true
    );
  }

  async deleteMe(input: DeleteUserMeInput): Promise<void> {
    return this.request<void>(
      '/api/v1/users/me',
      {
        method: 'DELETE',
        body: JSON.stringify(input),
      },
      true
    );
  }

  // ---------------------------------------------------------------------------
  // Academic Periods
  // ---------------------------------------------------------------------------

  async getPeriods(archived?: 'false' | 'true' | 'all'): Promise<{ data: AcademicPeriod[] }> {
    const query = archived ? `?archived=${archived}` : '';
    return this.request<{ data: AcademicPeriod[] }>(`/api/v1/periods${query}`, { method: 'GET' }, true);
  }

  async createPeriod(input: CreateAcademicPeriodInput): Promise<AcademicPeriod> {
    return this.request<AcademicPeriod>(
      '/api/v1/periods',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      true
    );
  }

  async getPeriodById(periodId: string): Promise<AcademicPeriod> {
    return this.request<AcademicPeriod>(`/api/v1/periods/${periodId}`, { method: 'GET' }, true);
  }

  async updatePeriod(periodId: string, input: UpdateAcademicPeriodInput): Promise<AcademicPeriod> {
    return this.request<AcademicPeriod>(
      `/api/v1/periods/${periodId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
      true
    );
  }

  async deletePeriod(periodId: string): Promise<void> {
    return this.request<void>(`/api/v1/periods/${periodId}`, { method: 'DELETE' }, true);
  }

  // ---------------------------------------------------------------------------
  // Subjects
  // ---------------------------------------------------------------------------

  async getSubjectsByPeriod(periodId: string, archived?: 'false' | 'true' | 'all'): Promise<{ data: Subject[] }> {
    const query = archived ? `?archived=${archived}` : '';
    return this.request<{ data: Subject[] }>(
      `/api/v1/periods/${periodId}/subjects${query}`,
      { method: 'GET' },
      true
    );
  }

  async createSubject(periodId: string, input: CreateSubjectInput): Promise<Subject> {
    return this.request<Subject>(
      `/api/v1/periods/${periodId}/subjects`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      true
    );
  }

  async getSubjectById(subjectId: string): Promise<Subject> {
    return this.request<Subject>(`/api/v1/subjects/${subjectId}`, { method: 'GET' }, true);
  }

  async updateSubject(subjectId: string, input: UpdateSubjectInput): Promise<Subject> {
    return this.request<Subject>(
      `/api/v1/subjects/${subjectId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
      true
    );
  }

  async deleteSubject(subjectId: string): Promise<void> {
    return this.request<void>(`/api/v1/subjects/${subjectId}`, { method: 'DELETE' }, true);
  }

  // ---------------------------------------------------------------------------
  // Timetable
  // ---------------------------------------------------------------------------

  async getTimetable(filters?: { periodId?: string; subjectId?: string; weekday?: number }): Promise<{ data: ClassSession[] }> {
    const params = new URLSearchParams();
    if (filters?.periodId) params.append('periodId', filters.periodId);
    if (filters?.subjectId) params.append('subjectId', filters.subjectId);
    if (filters?.weekday !== undefined) params.append('weekday', filters.weekday.toString());
    const query = params.toString() ? `?${params.toString()}` : '';

    return this.request<{ data: ClassSession[] }>(`/api/v1/timetable${query}`, { method: 'GET' }, true);
  }

  async createClassSession(input: CreateClassSessionInput): Promise<ClassSession> {
    return this.request<ClassSession>(
      '/api/v1/timetable',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      true
    );
  }

  async updateClassSession(sessionId: string, input: UpdateClassSessionInput): Promise<ClassSession> {
    return this.request<ClassSession>(
      `/api/v1/timetable/${sessionId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
      true
    );
  }

  async deleteClassSession(sessionId: string): Promise<void> {
    return this.request<void>(`/api/v1/timetable/${sessionId}`, { method: 'DELETE' }, true);
  }

  // ---------------------------------------------------------------------------
  // Tasks
  // ---------------------------------------------------------------------------

  async getTasks(query?: {
    periodId?: string;
    subjectId?: string;
    completed?: 'false' | 'true' | 'all';
    dueBefore?: string;
    limit?: number;
    cursor?: string;
  }): Promise<TaskListResponse> {
    const params = new URLSearchParams();
    if (query?.periodId) params.append('periodId', query.periodId);
    if (query?.subjectId) params.append('subjectId', query.subjectId);
    if (query?.completed) params.append('completed', query.completed);
    if (query?.dueBefore) params.append('dueBefore', query.dueBefore);
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.cursor) params.append('cursor', query.cursor);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    return this.request<TaskListResponse>(`/api/v1/tasks${queryString}`, { method: 'GET' }, true);
  }

  async createTask(input: CreateTaskInput, idempotencyKey?: string): Promise<Task> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    return this.request<Task>(
      '/api/v1/tasks',
      {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      },
      true
    );
  }

  async getTaskById(taskId: string): Promise<Task> {
    return this.request<Task>(`/api/v1/tasks/${taskId}`, { method: 'GET' }, true);
  }

  async updateTask(taskId: string, input: UpdateTaskInput): Promise<Task> {
    return this.request<Task>(
      `/api/v1/tasks/${taskId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
      true
    );
  }

  async deleteTask(taskId: string): Promise<void> {
    return this.request<void>(`/api/v1/tasks/${taskId}`, { method: 'DELETE' }, true);
  }

  // ---------------------------------------------------------------------------
  // Assessments
  // ---------------------------------------------------------------------------

  async getAssessments(query?: {
    periodId?: string;
    subjectId?: string;
    status?: string;
    scheduledAfter?: string;
    scheduledBefore?: string;
    limit?: number;
    cursor?: string;
  }): Promise<AssessmentListResponse> {
    const params = new URLSearchParams();
    if (query?.periodId) params.append('periodId', query.periodId);
    if (query?.subjectId) params.append('subjectId', query.subjectId);
    if (query?.status) params.append('status', query.status);
    if (query?.scheduledAfter) params.append('scheduledAfter', query.scheduledAfter);
    if (query?.scheduledBefore) params.append('scheduledBefore', query.scheduledBefore);
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.cursor) params.append('cursor', query.cursor);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    return this.request<AssessmentListResponse>(`/api/v1/assessments${queryString}`, { method: 'GET' }, true);
  }

  async createAssessment(input: CreateAssessmentInput, idempotencyKey?: string): Promise<Assessment> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    return this.request<Assessment>(
      '/api/v1/assessments',
      {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      },
      true
    );
  }

  async getAssessmentById(assessmentId: string): Promise<Assessment> {
    return this.request<Assessment>(`/api/v1/assessments/${assessmentId}`, { method: 'GET' }, true);
  }

  async updateAssessment(assessmentId: string, input: UpdateAssessmentInput): Promise<Assessment> {
    return this.request<Assessment>(
      `/api/v1/assessments/${assessmentId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
      true
    );
  }

  async deleteAssessment(assessmentId: string): Promise<void> {
    return this.request<void>(`/api/v1/assessments/${assessmentId}`, { method: 'DELETE' }, true);
  }

  // ---------------------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------------------

  async getDashboard(date?: string): Promise<DashboardResponse> {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    return this.request<DashboardResponse>(`/api/v1/dashboard${query}`, { method: 'GET' }, true);
  }

  // ---------------------------------------------------------------------------
  // Grading Schemes (Phase 5)
  // ---------------------------------------------------------------------------

  async getGradingSchemes(): Promise<GradingSchemeListResponse> {
    return this.request<GradingSchemeListResponse>('/api/v1/grading-schemes', { method: 'GET' }, true);
  }

  async getGradingSchemeById(schemeId: string): Promise<GradingScheme> {
    return this.request<GradingScheme>(`/api/v1/grading-schemes/${schemeId}`, { method: 'GET' }, true);
  }

  async createGradingScheme(input: CreateGradingSchemeInput): Promise<GradingScheme> {
    return this.request<GradingScheme>(
      '/api/v1/grading-schemes',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      true
    );
  }

  async updateGradingScheme(schemeId: string, input: UpdateGradingSchemeInput): Promise<GradingScheme> {
    return this.request<GradingScheme>(
      `/api/v1/grading-schemes/${schemeId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
      true
    );
  }

  async deleteGradingScheme(schemeId: string): Promise<void> {
    return this.request<void>(`/api/v1/grading-schemes/${schemeId}`, { method: 'DELETE' }, true);
  }

  // ---------------------------------------------------------------------------
  // Grades & GPA Calculations (Phase 5)
  // ---------------------------------------------------------------------------

  async getSubjectGrade(subjectId: string): Promise<SubjectGradeResponse> {
    return this.request<SubjectGradeResponse>(`/api/v1/subjects/${subjectId}/grade`, { method: 'GET' }, true);
  }

  async getPeriodGpa(periodId: string): Promise<PeriodGpaResponse> {
    return this.request<PeriodGpaResponse>(`/api/v1/periods/${periodId}/gpa`, { method: 'GET' }, true);
  }

  // ---------------------------------------------------------------------------
  // Devices & Push Notifications (Phase 6)
  // ---------------------------------------------------------------------------

  async registerDevice(input: RegisterDeviceInput, idempotencyKey?: string): Promise<Device> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    return this.request<Device>(
      '/api/v1/devices',
      {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      },
      true
    );
  }

  async getDevices(): Promise<DeviceListResponse> {
    return this.request<DeviceListResponse>('/api/v1/devices', { method: 'GET' }, true);
  }

  async unregisterDevice(deviceId: string): Promise<void> {
    return this.request<void>(`/api/v1/devices/${deviceId}`, { method: 'DELETE' }, true);
  }

  async getNotificationPreferences(): Promise<NotificationPreferenceListResponse> {
    return this.request<NotificationPreferenceListResponse>('/api/v1/notification-preferences', { method: 'GET' }, true);
  }

  async updateNotificationPreference(
    category: NotificationCategory,
    input: UpdateNotificationPreferenceInput
  ): Promise<NotificationPreference> {
    return this.request<NotificationPreference>(
      `/api/v1/notification-preferences/${category}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
      true
    );
  }

  async triggerNotificationDispatch(): Promise<{
    scheduled: number;
    sent: number;
    failed: number;
    skippedDuplicates: number;
    cleanedDevices: number;
  }> {
    return this.request('/api/v1/notifications/dispatch', { method: 'POST' }, true);
  }

  // ---------------------------------------------------------------------------
  // Universal Productivity (The Chronicle)
  // ---------------------------------------------------------------------------

  async getContexts(): Promise<ContextListResponse> {
    return this.request<ContextListResponse>('/api/v1/contexts', { method: 'GET' }, true);
  }

  async createContext(input: CreateContextInput, idempotencyKey?: string): Promise<Context> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    return this.request<Context>(
      '/api/v1/contexts',
      {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      },
      true
    );
  }

  async updateContext(id: string, input: UpdateContextInput): Promise<Context> {
    return this.request<Context>(
      `/api/v1/contexts/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
      true
    );
  }

  async deleteContext(id: string): Promise<void> {
    return this.request<void>(`/api/v1/contexts/${id}`, { method: 'DELETE' }, true);
  }

  async getCommitments(): Promise<{ data: ScheduleCommitment[] }> {
    return this.request<{ data: ScheduleCommitment[] }>('/api/v1/commitments', { method: 'GET' }, true);
  }

  async createCommitment(
    input: CreateScheduleCommitmentInput,
    idempotencyKey?: string
  ): Promise<ScheduleCommitment> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    return this.request<ScheduleCommitment>(
      '/api/v1/commitments',
      {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      },
      true
    );
  }

  async updateCommitment(
    id: string,
    input: UpdateScheduleCommitmentInput
  ): Promise<ScheduleCommitment> {
    return this.request<ScheduleCommitment>(
      `/api/v1/commitments/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
      true
    );
  }

  async deleteCommitment(id: string): Promise<void> {
    return this.request<void>(`/api/v1/commitments/${id}`, { method: 'DELETE' }, true);
  }

  async logCommitmentOccurrence(
    id: string,
    date: string,
    input: LogCommitmentOccurrenceInput
  ): Promise<CommitmentLog> {
    return this.request<CommitmentLog>(
      `/api/v1/commitments/${id}/occurrences/${date}`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      true
    );
  }

  async getHabits(): Promise<HabitListResponse> {
    return this.request<HabitListResponse>('/api/v1/habits', { method: 'GET' }, true);
  }

  async createHabit(input: CreateHabitInput, idempotencyKey?: string): Promise<Habit> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    return this.request<Habit>(
      '/api/v1/habits',
      {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      },
      true
    );
  }

  async updateHabit(id: string, input: UpdateHabitInput): Promise<Habit> {
    return this.request<Habit>(
      `/api/v1/habits/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
      true
    );
  }

  async deleteHabit(id: string): Promise<void> {
    return this.request<void>(`/api/v1/habits/${id}`, { method: 'DELETE' }, true);
  }

  async logHabitOccurrence(
    id: string,
    input: LogHabitOccurrenceInput
  ): Promise<HabitLog> {
    return this.request<HabitLog>(
      `/api/v1/habits/${id}/logs`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      true
    );
  }

  async getToday(query?: { date?: string; timezone?: string }): Promise<TodayResponse> {
    const params = new URLSearchParams();
    if (query?.date) params.append('date', query.date);
    if (query?.timezone) params.append('timezone', query.timezone);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<TodayResponse>(`/api/v1/today${qs}`, { method: 'GET' }, true);
  }

  // ---------------------------------------------------------------------------
  // Goals & Milestones
  // ---------------------------------------------------------------------------

  async getGoals(): Promise<GoalListResponse> {
    return this.request<GoalListResponse>('/api/v1/goals', { method: 'GET' }, true);
  }

  async getGoalById(id: string): Promise<Goal> {
    return this.request<Goal>(`/api/v1/goals/${id}`, { method: 'GET' }, true);
  }

  async createGoal(input: CreateGoalInput, idempotencyKey?: string): Promise<Goal> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    return this.request<Goal>(
      '/api/v1/goals',
      {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      },
      true
    );
  }

  async updateGoal(id: string, input: UpdateGoalInput): Promise<Goal> {
    return this.request<Goal>(
      `/api/v1/goals/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
      true
    );
  }

  async deleteGoal(id: string): Promise<void> {
    return this.request<void>(`/api/v1/goals/${id}`, { method: 'DELETE' }, true);
  }

  async createMilestone(goalId: string, input: CreateMilestoneInput): Promise<Milestone> {
    return this.request<Milestone>(
      `/api/v1/goals/${goalId}/milestones`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      true
    );
  }

  async updateMilestone(
    goalId: string,
    milestoneId: string,
    input: UpdateMilestoneInput
  ): Promise<Milestone> {
    return this.request<Milestone>(
      `/api/v1/goals/${goalId}/milestones/${milestoneId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
      true
    );
  }

  async deleteMilestone(goalId: string, milestoneId: string): Promise<void> {
    return this.request<void>(
      `/api/v1/goals/${goalId}/milestones/${milestoneId}`,
      { method: 'DELETE' },
      true
    );
  }

  // ---------------------------------------------------------------------------
  // Weekly Planning & Reviews
  // ---------------------------------------------------------------------------

  async getWeeklyReviews(): Promise<WeeklyReviewListResponse> {
    return this.request<WeeklyReviewListResponse>('/api/v1/reviews', { method: 'GET' }, true);
  }

  async getReviewForWeek(weekStart: string): Promise<WeeklyReview> {
    return this.request<WeeklyReview>(`/api/v1/reviews/${weekStart}`, { method: 'GET' }, true);
  }

  async saveWeeklyReview(
    input: SaveWeeklyReviewInput,
    idempotencyKey?: string
  ): Promise<WeeklyReview> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    return this.request<WeeklyReview>(
      '/api/v1/reviews',
      {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      },
      true
    );
  }

  // ---------------------------------------------------------------------------
  // Offline Sync
  // ---------------------------------------------------------------------------

  async batchSync(request: BatchSyncRequest): Promise<BatchSyncResponse> {
    return this.request<BatchSyncResponse>(
      '/api/v1/sync',
      {
        method: 'POST',
        body: JSON.stringify(request),
      },
      true
    );
  }
}

export * from './offline-sync';

