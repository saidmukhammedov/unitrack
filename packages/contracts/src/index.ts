import { z } from 'zod';

/**
 * Health check response schema
 */
export const HealthCheckResponseSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string(),
  version: z.string(),
  environment: z.string(),
});
export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;

/**
 * Standard API error response schema
 */
export const ApiErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

/**
 * Common Enums
 */
export const InstitutionTypeSchema = z.enum(['SCHOOL', 'UNIVERSITY', 'OTHER']);
export type InstitutionType = z.infer<typeof InstitutionTypeSchema>;

export const AcademicPeriodTypeSchema = z.enum([
  'SCHOOL_YEAR',
  'SEMESTER',
  'TRIMESTER',
  'QUARTER',
  'CUSTOM',
]);
export type AcademicPeriodType = z.infer<typeof AcademicPeriodTypeSchema>;

export const TaskTypeSchema = z.enum([
  'HOMEWORK',
  'READING',
  'PROJECT',
  'LAB',
  'PRESENTATION',
  'OTHER',
]);
export type TaskType = z.infer<typeof TaskTypeSchema>;

export const AssessmentTypeSchema = z.enum([
  'EXAM',
  'QUIZ',
  'MIDTERM',
  'FINAL',
  'LAB',
  'PRESENTATION',
  'ASSIGNMENT',
  'OTHER',
]);
export type AssessmentType = z.infer<typeof AssessmentTypeSchema>;

export const AssessmentStatusSchema = z.enum(['SCHEDULED', 'COMPLETED', 'EXCUSED']);
export type AssessmentStatus = z.infer<typeof AssessmentStatusSchema>;

export const GradingSchemeTypeSchema = z.enum([
  'PERCENTAGE',
  'WEIGHTED_AVERAGE',
  'SCHOOL_BAND',
  'UNIVERSITY_GPA',
]);
export type GradingSchemeType = z.infer<typeof GradingSchemeTypeSchema>;

export const SupportedLanguageSchema = z.enum(['en', 'uz', 'ru']);
export type SupportedLanguage = z.infer<typeof SupportedLanguageSchema>;

export const DevicePlatformSchema = z.enum(['IOS', 'ANDROID']);
export type DevicePlatform = z.infer<typeof DevicePlatformSchema>;

export const NotificationCategorySchema = z.enum(['TASK_REMINDER', 'ASSESSMENT_REMINDER']);
export type NotificationCategory = z.infer<typeof NotificationCategorySchema>;

export const NotificationReferenceTypeSchema = z.enum(['TASK', 'ASSESSMENT']);
export type NotificationReferenceType = z.infer<typeof NotificationReferenceTypeSchema>;

export const NotificationStatusSchema = z.enum(['PENDING', 'SENT', 'FAILED', 'SKIPPED']);
export type NotificationStatus = z.infer<typeof NotificationStatusSchema>;

// -----------------------------------------------------------------------------
// Authentication Schemas (Phase 3)
// -----------------------------------------------------------------------------

export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit');

export const RegisterInputSchema = z.object({
  email: z.string().email('Invalid email address').max(320).toLowerCase(),
  password: PasswordSchema,
  displayName: z.string().min(1, 'Display name is required').max(100),
  languageCode: SupportedLanguageSchema.default('en'),
});
export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const RegisterResponseSchema = z.object({
  message: z.string(),
});
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;

export const VerifyEmailInputSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});
export type VerifyEmailInput = z.infer<typeof VerifyEmailInputSchema>;

export const VerifyEmailResponseSchema = z.object({
  message: z.string(),
});
export type VerifyEmailResponse = z.infer<typeof VerifyEmailResponseSchema>;

export const LoginInputSchema = z.object({
  email: z.string().email('Invalid email address').max(320).toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
  avatarUrl: z.string().nullable().optional(),
  emailVerified: z.boolean(),
  languageCode: SupportedLanguageSchema,
  timezone: z.string(),
  institutionType: InstitutionTypeSchema,
  createdAt: z.string().optional(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  user: UserProfileSchema,
  refreshToken: z.string().optional(),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const GoogleAuthInputSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
});
export type GoogleAuthInput = z.infer<typeof GoogleAuthInputSchema>;

export const RefreshTokenInputSchema = z.object({
  refreshToken: z.string().optional(),
});
export type RefreshTokenInput = z.infer<typeof RefreshTokenInputSchema>;

export const RefreshTokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
});
export type RefreshTokenResponse = z.infer<typeof RefreshTokenResponseSchema>;

export const ForgotPasswordInputSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordInputSchema>;

export const ForgotPasswordResponseSchema = z.object({
  message: z.string(),
});
export type ForgotPasswordResponse = z.infer<typeof ForgotPasswordResponseSchema>;

export const ResetPasswordInputSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: PasswordSchema,
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordInputSchema>;

export const ResetPasswordResponseSchema = z.object({
  message: z.string(),
});
export type ResetPasswordResponse = z.infer<typeof ResetPasswordResponseSchema>;

export const SessionItemSchema = z.object({
  id: z.string().uuid(),
  deviceInfo: z.string().nullable(),
  ipAddress: z.string().nullable(),
  createdAt: z.string(),
  isCurrent: z.boolean(),
});
export type SessionItem = z.infer<typeof SessionItemSchema>;

export const SessionListResponseSchema = z.object({
  data: z.array(SessionItemSchema),
});
export type SessionListResponse = z.infer<typeof SessionListResponseSchema>;

export const UpdateUserMeInputSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  languageCode: SupportedLanguageSchema.optional(),
  timezone: z.string().min(1).max(64).optional(),
  institutionType: InstitutionTypeSchema.optional(),
});
export type UpdateUserMeInput = z.infer<typeof UpdateUserMeInputSchema>;

export const DeleteUserMeInputSchema = z.object({
  confirmPassword: z.string().optional(),
});
export type DeleteUserMeInput = z.infer<typeof DeleteUserMeInputSchema>;

export const ChangePasswordInputSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: PasswordSchema,
});
export type ChangePasswordInput = z.infer<typeof ChangePasswordInputSchema>;

// -----------------------------------------------------------------------------
// Academic Core Schemas (Phase 4)
// -----------------------------------------------------------------------------

// 1. Academic Periods
export const AcademicPeriodSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  type: AcademicPeriodTypeSchema,
  startDate: z.string(), // ISO Date YYYY-MM-DD
  endDate: z.string(), // ISO Date YYYY-MM-DD
  isArchived: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});
export type AcademicPeriod = z.infer<typeof AcademicPeriodSchema>;

export const CreateAcademicPeriodInputSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100),
    type: AcademicPeriodTypeSchema,
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });
export type CreateAcademicPeriodInput = z.infer<typeof CreateAcademicPeriodInputSchema>;

export const UpdateAcademicPeriodInputSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    type: AcademicPeriodTypeSchema.optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    isArchived: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: 'End date must be on or after start date',
      path: ['endDate'],
    }
  );
export type UpdateAcademicPeriodInput = z.infer<typeof UpdateAcademicPeriodInputSchema>;

// 2. Subjects
export const SubjectSchema = z.object({
  id: z.string().uuid(),
  periodId: z.string().uuid(),
  name: z.string().min(1).max(150),
  colorHex: z.string().nullable().optional(),
  teacherName: z.string().nullable().optional(),
  creditHours: z.number().nullable().optional(),
  isArchived: z.boolean(),
  gradingSchemeId: z.string().uuid().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});
export type Subject = z.infer<typeof SubjectSchema>;

export const CreateSubjectInputSchema = z.object({
  name: z.string().min(1, 'Subject name is required').max(150),
  colorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be 6-character hex like #4A90D9')
    .optional(),
  teacherName: z.string().max(100).optional(),
  creditHours: z.number().positive('Credit hours must be greater than 0').max(99.9).optional(),
  gradingSchemeId: z.string().uuid().optional(),
});
export type CreateSubjectInput = z.infer<typeof CreateSubjectInputSchema>;

export const UpdateSubjectInputSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  colorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable()
    .optional(),
  teacherName: z.string().max(100).nullable().optional(),
  creditHours: z.number().positive().max(99.9).nullable().optional(),
  isArchived: z.boolean().optional(),
  gradingSchemeId: z.string().uuid().nullable().optional(),
});
export type UpdateSubjectInput = z.infer<typeof UpdateSubjectInputSchema>;

// 3. Class Sessions (Timetable)
export const ClassSessionSchema = z.object({
  id: z.string().uuid(),
  subjectId: z.string().uuid(),
  subjectName: z.string().optional(),
  subjectColor: z.string().nullable().optional(),
  periodId: z.string().uuid(),
  weekday: z.number().int().min(0).max(6), // 0=Sunday .. 6=Saturday
  startTime: z.string(), // HH:MM
  endTime: z.string(), // HH:MM
  location: z.string().nullable().optional(),
  effectiveFrom: z.string(), // YYYY-MM-DD
  effectiveTo: z.string().nullable().optional(), // YYYY-MM-DD
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});
export type ClassSession = z.infer<typeof ClassSessionSchema>;

export const CreateClassSessionInputSchema = z
  .object({
    subjectId: z.string().uuid('Subject ID is required'),
    weekday: z.number().int().min(0, '0 is Sunday').max(6, '6 is Saturday'),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format must be HH:MM (24-hour)'),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format must be HH:MM (24-hour)'),
    location: z.string().max(150).optional(),
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD'),
    effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  });
export type CreateClassSessionInput = z.infer<typeof CreateClassSessionInputSchema>;

export const UpdateClassSessionInputSchema = z
  .object({
    subjectId: z.string().uuid().optional(),
    periodId: z.never({ message: 'periodId is immutable on timetable entries' }).optional(),
    weekday: z.number().int().min(0).max(6).optional(),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    location: z.string().max(150).nullable().optional(),
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return data.endTime > data.startTime;
      }
      return true;
    },
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    }
  );
export type UpdateClassSessionInput = z.infer<typeof UpdateClassSessionInputSchema>;

// 4. Tasks
export const TaskStatusSchema = z.enum(['PENDING', 'COMPLETED', 'POSTPONED', 'CANCELLED']);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  taskType: TaskTypeSchema,
  status: TaskStatusSchema.default('PENDING'),
  priority: TaskPrioritySchema.default('MEDIUM'),
  contextId: z.string().uuid().nullable().optional(),
  contextName: z.string().nullable().optional(),
  contextColor: z.string().nullable().optional(),
  subjectId: z.string().uuid().nullable().optional(),
  subjectName: z.string().nullable().optional(),
  subjectColor: z.string().nullable().optional(),
  periodId: z.string().uuid().nullable().optional(),
  dueAt: z.string().nullable().optional(), // ISO datetime
  completedAt: z.string().nullable().optional(),
  isCompleted: z.boolean(),
  postponedCount: z.number().int().default(0),
  estimatedMinutes: z.number().int().positive().nullable().optional(),
  goalId: z.string().uuid().nullable().optional(),
  goalTitle: z.string().nullable().optional(),
  version: z.number().int().default(1),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});
export type Task = z.infer<typeof TaskSchema>;

export const CreateTaskInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  taskType: TaskTypeSchema.default('OTHER'),
  priority: TaskPrioritySchema.default('MEDIUM').optional(),
  contextId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
  periodId: z.string().uuid().optional(),
  goalId: z.string().uuid().optional(),
  dueAt: z.string().datetime().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
});
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;

export const UpdateTaskInputSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  taskType: TaskTypeSchema.optional(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  contextId: z.string().uuid().nullable().optional(),
  subjectId: z.string().uuid().nullable().optional(),
  periodId: z.string().uuid().nullable().optional(),
  goalId: z.string().uuid().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
  estimatedMinutes: z.number().int().positive().nullable().optional(),
  version: z.number().int().optional(),
});
export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>;

export const TaskListResponseSchema = z.object({
  data: z.array(TaskSchema),
  nextCursor: z.string().nullable().optional(),
});
export type TaskListResponse = z.infer<typeof TaskListResponseSchema>;

// 5. Assessments
export const AssessmentSchema = z.object({
  id: z.string().uuid(),
  subjectId: z.string().uuid(),
  subjectName: z.string().optional(),
  subjectColor: z.string().nullable().optional(),
  periodId: z.string().uuid(),
  title: z.string().min(1).max(255),
  assessmentType: AssessmentTypeSchema,
  scheduledAt: z.string(), // ISO datetime
  status: AssessmentStatusSchema,
  rawScore: z.number().nullable().optional(),
  maxScore: z.number().nullable().optional(),
  weight: z.number(),
  notes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  warning: z.string().optional(),
});
export type Assessment = z.infer<typeof AssessmentSchema>;

export const CreateAssessmentInputSchema = z.object({
  subjectId: z.string().uuid('Subject ID is required'),
  title: z.string().min(1, 'Title is required').max(255),
  assessmentType: AssessmentTypeSchema,
  scheduledAt: z.string().datetime(),
  weight: z.number().min(0, 'Weight must be non-negative').default(1.0),
  notes: z.string().optional(),
});
export type CreateAssessmentInput = z.infer<typeof CreateAssessmentInputSchema>;

export const UpdateAssessmentInputSchema = z
  .object({
    subjectId: z.string().uuid().optional(),
    periodId: z.never({ message: 'periodId is immutable' }).optional(),
    title: z.string().min(1).max(255).optional(),
    assessmentType: AssessmentTypeSchema.optional(),
    scheduledAt: z.string().datetime().optional(),
    status: AssessmentStatusSchema.optional(),
    rawScore: z.number().min(0, 'Raw score must be non-negative').nullable().optional(),
    maxScore: z.number().positive('Max score must be greater than 0').nullable().optional(),
    weight: z.number().min(0).optional(),
    notes: z.string().nullable().optional(),
  })
  .refine(
    (data) => {
      // D-01 / A-01: COMPLETED transition requires rawScore and maxScore
      if (data.status === 'COMPLETED') {
        if (data.rawScore === null || data.maxScore === null) {
          return false;
        }
      }
      return true;
    },
    {
      message: 'Status COMPLETED requires non-null rawScore and maxScore',
      path: ['status'],
    }
  );
export type UpdateAssessmentInput = z.infer<typeof UpdateAssessmentInputSchema>;

export const AssessmentListResponseSchema = z.object({
  data: z.array(AssessmentSchema),
  nextCursor: z.string().nullable().optional(),
});
export type AssessmentListResponse = z.infer<typeof AssessmentListResponseSchema>;

// 6. Dashboard
export const DashboardClassItemSchema = z.object({
  sessionId: z.string().uuid(),
  subjectId: z.string().uuid(),
  subjectName: z.string(),
  subjectColor: z.string().nullable(),
  startTime: z.string(),
  endTime: z.string(),
  location: z.string().nullable(),
});
export type DashboardClassItem = z.infer<typeof DashboardClassItemSchema>;

export const DashboardResponseSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  todaysClasses: z.array(DashboardClassItemSchema),
  upcomingTasks: z.array(TaskSchema),
  overdueTasks: z.array(TaskSchema),
  upcomingAssessments: z.array(AssessmentSchema),
});
export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;

// -----------------------------------------------------------------------------
// Grading Schemes, Course Grades & GPA Schemas (Phase 5)
// -----------------------------------------------------------------------------

// 7. Grading Schemes & Grade Scales
export const GradeScaleEntryInputSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().min(1, 'Label is required').max(20),
  minPercentage: z.number().min(0).max(100),
  maxPercentage: z.number().min(0).max(100),
  gradePoints: z.number().min(0).max(10).nullable().optional(),
  sortOrder: z.number().int().optional(),
});
export type GradeScaleEntryInput = z.infer<typeof GradeScaleEntryInputSchema>;

export const GradeScaleEntrySchema = z.object({
  id: z.string().uuid(),
  schemeId: z.string().uuid(),
  label: z.string().max(20),
  minPercentage: z.number(),
  maxPercentage: z.number(),
  gradePoints: z.number().nullable().optional(),
  sortOrder: z.number(),
});
export type GradeScaleEntry = z.infer<typeof GradeScaleEntrySchema>;

export const CreateGradingSchemeInputSchema = z.object({
  name: z.string().min(1, 'Scheme name is required').max(100),
  schemeType: GradingSchemeTypeSchema,
  isDefault: z.boolean().default(false),
  entries: z.array(GradeScaleEntryInputSchema).optional(),
});
export type CreateGradingSchemeInput = z.infer<typeof CreateGradingSchemeInputSchema>;

export const UpdateGradingSchemeInputSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  schemeType: GradingSchemeTypeSchema.optional(),
  isDefault: z.boolean().optional(),
  entries: z.array(GradeScaleEntryInputSchema).optional(),
});
export type UpdateGradingSchemeInput = z.infer<typeof UpdateGradingSchemeInputSchema>;

export const GradingSchemeSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  schemeType: GradingSchemeTypeSchema,
  version: z.number(),
  isDefault: z.boolean(),
  entries: z.array(GradeScaleEntrySchema),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});
export type GradingScheme = z.infer<typeof GradingSchemeSchema>;

export const GradingSchemeListResponseSchema = z.object({
  data: z.array(GradingSchemeSchema),
});
export type GradingSchemeListResponse = z.infer<typeof GradingSchemeListResponseSchema>;

// 8. Computed Course Grade & Historical Snapshots
export const CourseGradeSchema = z.object({
  id: z.string().uuid(),
  subjectId: z.string().uuid(),
  computedPercentage: z.number().nullable(),
  computedBand: z.string().nullable().optional(),
  computedGradePoints: z.number().nullable().optional(),
  assessmentsIncluded: z.number(),
  assessmentsExcluded: z.number(),
  totalWeight: z.number().nullable(),
  schemeId: z.string().uuid().nullable().optional(),
  schemeVersion: z.number(),
  calculatedAt: z.string(),
});
export type CourseGrade = z.infer<typeof CourseGradeSchema>;

export const SubjectGradeResponseSchema = z.object({
  subjectId: z.string().uuid(),
  computedPercentage: z.number().nullable(),
  computedBand: z.string().nullable().optional(),
  computedGradePoints: z.number().nullable().optional(),
  assessmentsIncluded: z.number(),
  assessmentsExcluded: z.number(),
  totalWeight: z.number().nullable(),
  schemeId: z.string().uuid().nullable().optional(),
  schemeVersion: z.number(),
  calculatedAt: z.string(),
});
export type SubjectGradeResponse = z.infer<typeof SubjectGradeResponseSchema>;

// 9. Period GPA Calculation
export const SubjectGpaSummarySchema = z.object({
  subjectId: z.string().uuid(),
  subjectName: z.string(),
  creditHours: z.number(),
  gradePoints: z.number(),
  computedPercentage: z.number(),
  computedBand: z.string(),
});
export type SubjectGpaSummary = z.infer<typeof SubjectGpaSummarySchema>;

export const ExcludedSubjectGpaSchema = z.object({
  subjectId: z.string().uuid(),
  subjectName: z.string().optional(),
  reason: z.string(),
});
export type ExcludedSubjectGpa = z.infer<typeof ExcludedSubjectGpaSchema>;

export const PeriodGpaResponseSchema = z.object({
  periodId: z.string().uuid(),
  gpa: z.number().nullable(),
  totalCredits: z.number(),
  subjectSummaries: z.array(SubjectGpaSummarySchema),
  excludedSubjects: z.array(ExcludedSubjectGpaSchema),
  reason: z.string().optional(),
});
export type PeriodGpaResponse = z.infer<typeof PeriodGpaResponseSchema>;

// -----------------------------------------------------------------------------
// Devices & Push Notifications Schemas (Phase 6)
// -----------------------------------------------------------------------------

// 10. Device Registration
export const RegisterDeviceInputSchema = z.object({
  expoPushToken: z.string().min(1, 'Expo push token is required'),
  platform: DevicePlatformSchema,
  deviceLabel: z.string().max(100).optional(),
});
export type RegisterDeviceInput = z.infer<typeof RegisterDeviceInputSchema>;

export const DeviceSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  expoPushToken: z.string(),
  platform: DevicePlatformSchema,
  deviceLabel: z.string().nullable().optional(),
  lastSeenAt: z.string(),
  createdAt: z.string(),
});
export type Device = z.infer<typeof DeviceSchema>;

export const DeviceListResponseSchema = z.object({
  data: z.array(DeviceSchema),
});
export type DeviceListResponse = z.infer<typeof DeviceListResponseSchema>;

// 11. Notification Preferences
export const NotificationPreferenceSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  category: NotificationCategorySchema,
  isEnabled: z.boolean(),
  leadTimeMinutes: z.number().int().positive(),
  updatedAt: z.string(),
});
export type NotificationPreference = z.infer<typeof NotificationPreferenceSchema>;

export const UpdateNotificationPreferenceInputSchema = z.object({
  isEnabled: z.boolean().optional(),
  leadTimeMinutes: z.number().int().positive('Lead time must be positive minutes').optional(),
});
export type UpdateNotificationPreferenceInput = z.infer<typeof UpdateNotificationPreferenceInputSchema>;

export const NotificationPreferenceListResponseSchema = z.object({
  data: z.array(NotificationPreferenceSchema),
});
export type NotificationPreferenceListResponse = z.infer<typeof NotificationPreferenceListResponseSchema>;

// 12. Notification Deliveries & Audit
export const NotificationDeliverySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  deviceId: z.string().uuid().nullable().optional(),
  referenceType: NotificationReferenceTypeSchema,
  referenceId: z.string().uuid(),
  scheduledFor: z.string(),
  status: NotificationStatusSchema,
  errorMessage: z.string().nullable().optional(),
  sentAt: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type NotificationDelivery = z.infer<typeof NotificationDeliverySchema>;

export const NotificationDeliveryListResponseSchema = z.object({
  data: z.array(NotificationDeliverySchema),
});
export type NotificationDeliveryListResponse = z.infer<typeof NotificationDeliveryListResponseSchema>;

// -----------------------------------------------------------------------------
// 13. Life Contexts (Universal Productivity)
// -----------------------------------------------------------------------------

export const ContextSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Name is required').max(50),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be 6-digit hex'),
  icon: z.string().max(30).nullable().optional(),
  sortOrder: z.number().int().default(0),
  isArchived: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});
export type Context = z.infer<typeof ContextSchema>;

export const CreateContextInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be 6-digit hex'),
  icon: z.string().max(30).optional(),
});
export type CreateContextInput = z.infer<typeof CreateContextInputSchema>;

export const UpdateContextInputSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(30).nullable().optional(),
  sortOrder: z.number().int().optional(),
  isArchived: z.boolean().optional(),
});
export type UpdateContextInput = z.infer<typeof UpdateContextInputSchema>;

export const ContextListResponseSchema = z.object({
  data: z.array(ContextSchema),
});
export type ContextListResponse = z.infer<typeof ContextListResponseSchema>;

// -----------------------------------------------------------------------------
// 14. Universal Schedule Commitments & Exceptions
// -----------------------------------------------------------------------------

export const CommitmentStatusSchema = z.enum(['ATTENDED', 'MISSED', 'CANCELLED', 'RESCHEDULED']);
export type CommitmentStatus = z.infer<typeof CommitmentStatusSchema>;

export const ScheduleCommitmentSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  contextId: z.string().uuid().nullable().optional(),
  contextName: z.string().nullable().optional(),
  contextColor: z.string().nullable().optional(),
  location: z.string().max(150).nullable().optional(),
  isRecurring: z.boolean(),
  specificDate: z.string().nullable().optional(), // YYYY-MM-DD
  weekday: z.number().int().min(0).max(6).nullable().optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'HH:MM format'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'HH:MM format'),
  isOvernight: z.boolean().default(false),
  effectiveFrom: z.string(), // YYYY-MM-DD
  effectiveTo: z.string().nullable().optional(), // YYYY-MM-DD
  isArchived: z.boolean().default(false),
  version: z.number().int().default(1),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});
export type ScheduleCommitment = z.infer<typeof ScheduleCommitmentSchema>;

export const CreateScheduleCommitmentInputSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200),
    contextId: z.string().uuid().optional(),
    location: z.string().max(150).optional(),
    isRecurring: z.boolean().default(false),
    specificDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD').optional(),
    weekday: z.number().int().min(0).max(6).optional(),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .refine(
    (data) => {
      if (data.isRecurring) {
        return typeof data.weekday === 'number' && !!data.effectiveFrom;
      }
      return !!data.specificDate;
    },
    {
      message: 'Recurring commitments require weekday and effectiveFrom; one-off commitments require specificDate',
      path: ['isRecurring'],
    }
  );
export type CreateScheduleCommitmentInput = z.infer<typeof CreateScheduleCommitmentInputSchema>;

export const UpdateScheduleCommitmentInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  contextId: z.string().uuid().nullable().optional(),
  location: z.string().max(150).nullable().optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  isArchived: z.boolean().optional(),
  version: z.number().int().optional(),
});
export type UpdateScheduleCommitmentInput = z.infer<typeof UpdateScheduleCommitmentInputSchema>;

export const CommitmentLogSchema = z.object({
  id: z.string().uuid(),
  commitmentId: z.string().uuid(),
  date: z.string(), // YYYY-MM-DD
  status: CommitmentStatusSchema,
  rescheduledStartTime: z.string().nullable().optional(),
  rescheduledEndTime: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});
export type CommitmentLog = z.infer<typeof CommitmentLogSchema>;

export const LogCommitmentOccurrenceInputSchema = z.object({
  status: CommitmentStatusSchema,
  rescheduledStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  rescheduledEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  notes: z.string().optional(),
});
export type LogCommitmentOccurrenceInput = z.infer<typeof LogCommitmentOccurrenceInputSchema>;

// -----------------------------------------------------------------------------
// 15. Habits & Routines
// -----------------------------------------------------------------------------

export const HabitFrequencyTypeSchema = z.enum(['DAILY', 'SELECTED_WEEKDAYS', 'WEEKLY_TARGET']);
export type HabitFrequencyType = z.infer<typeof HabitFrequencyTypeSchema>;

export const HabitLogStatusSchema = z.enum(['COMPLETED', 'SKIPPED', 'MISSED']);
export type HabitLogStatus = z.infer<typeof HabitLogStatusSchema>;

export const HabitSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(150),
  contextId: z.string().uuid().nullable().optional(),
  contextName: z.string().nullable().optional(),
  contextColor: z.string().nullable().optional(),
  goalId: z.string().uuid().nullable().optional(),
  goalTitle: z.string().nullable().optional(),
  frequencyType: HabitFrequencyTypeSchema,
  selectedWeekdays: z.array(z.number().int().min(0).max(6)).default([]),
  targetPerWeek: z.number().int().min(1).max(7).nullable().optional(),
  targetUnits: z.number().int().min(1).default(1),
  unitLabel: z.string().max(30).nullable().optional(),
  currentStreak: z.number().int().default(0),
  longestStreak: z.number().int().default(0),
  isArchived: z.boolean().default(false),
  version: z.number().int().default(1),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});
export type Habit = z.infer<typeof HabitSchema>;

export const CreateHabitInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(150),
  contextId: z.string().uuid().optional(),
  goalId: z.string().uuid().optional(),
  frequencyType: HabitFrequencyTypeSchema.default('DAILY'),
  selectedWeekdays: z.array(z.number().int().min(0).max(6)).optional(),
  targetPerWeek: z.number().int().min(1).max(7).optional(),
  targetUnits: z.number().int().min(1).default(1),
  unitLabel: z.string().max(30).optional(),
});
export type CreateHabitInput = z.infer<typeof CreateHabitInputSchema>;

export const UpdateHabitInputSchema = z.object({
  title: z.string().min(1).max(150).optional(),
  contextId: z.string().uuid().nullable().optional(),
  goalId: z.string().uuid().nullable().optional(),
  frequencyType: HabitFrequencyTypeSchema.optional(),
  selectedWeekdays: z.array(z.number().int().min(0).max(6)).optional(),
  targetPerWeek: z.number().int().min(1).max(7).nullable().optional(),
  targetUnits: z.number().int().min(1).optional(),
  unitLabel: z.string().max(30).nullable().optional(),
  isArchived: z.boolean().optional(),
  version: z.number().int().optional(),
});
export type UpdateHabitInput = z.infer<typeof UpdateHabitInputSchema>;

export const HabitLogSchema = z.object({
  id: z.string().uuid(),
  habitId: z.string().uuid(),
  date: z.string(), // YYYY-MM-DD
  status: HabitLogStatusSchema,
  completedUnits: z.number().int().min(0),
  notes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});
export type HabitLog = z.infer<typeof HabitLogSchema>;

export const LogHabitOccurrenceInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  status: HabitLogStatusSchema.default('COMPLETED'),
  completedUnits: z.number().int().min(0).default(1),
  notes: z.string().optional(),
});
export type LogHabitOccurrenceInput = z.infer<typeof LogHabitOccurrenceInputSchema>;

export const HabitListResponseSchema = z.object({
  data: z.array(HabitSchema),
});
export type HabitListResponse = z.infer<typeof HabitListResponseSchema>;

// -----------------------------------------------------------------------------
// 16. Today Stream (The Chronicle Core)
// -----------------------------------------------------------------------------

export const TodayCommitmentItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  location: z.string().nullable().optional(),
  contextId: z.string().uuid().nullable().optional(),
  contextName: z.string().nullable().optional(),
  contextColor: z.string().nullable().optional(),
  startTime: z.string(), // HH:MM
  endTime: z.string(), // HH:MM
  isOvernight: z.boolean().default(false),
  status: z.enum(['SCHEDULED', 'ATTENDED', 'MISSED', 'CANCELLED', 'RESCHEDULED']),
  source: z.enum(['UNIVERSAL', 'ACADEMIC']),
  notes: z.string().nullable().optional(),
});
export type TodayCommitmentItem = z.infer<typeof TodayCommitmentItemSchema>;

export const TodayHabitItemSchema = z.object({
  habit: HabitSchema,
  todayLog: HabitLogSchema.nullable(),
  isDueToday: z.boolean(),
  status: z.enum(['COMPLETED', 'SKIPPED', 'MISSED', 'PENDING']),
});
export type TodayHabitItem = z.infer<typeof TodayHabitItemSchema>;

export const TodayResponseSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  timezone: z.string(),
  contexts: z.array(ContextSchema),
  commitments: z.array(TodayCommitmentItemSchema),
  tasks: z.array(TaskSchema),
  habits: z.array(TodayHabitItemSchema),
  topIntentions: z.array(z.string()).default([]),
});
export type TodayResponse = z.infer<typeof TodayResponseSchema>;

// -----------------------------------------------------------------------------
// 17. Goals & Milestones
// -----------------------------------------------------------------------------

export const GoalStatusSchema = z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'PAUSED', 'ARCHIVED']);
export type GoalStatus = z.infer<typeof GoalStatusSchema>;

export const MilestoneSchema = z.object({
  id: z.string().uuid(),
  goalId: z.string().uuid(),
  title: z.string().min(1).max(200),
  targetDate: z.string().nullable().optional(), // YYYY-MM-DD
  isCompleted: z.boolean().default(false),
  completedAt: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});
export type Milestone = z.infer<typeof MilestoneSchema>;

export const CreateMilestoneInputSchema = z.object({
  title: z.string().min(1, 'Milestone title is required').max(200),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD').optional(),
  sortOrder: z.number().int().optional(),
});
export type CreateMilestoneInput = z.infer<typeof CreateMilestoneInputSchema>;

export const UpdateMilestoneInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  isCompleted: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});
export type UpdateMilestoneInput = z.infer<typeof UpdateMilestoneInputSchema>;

export const GoalSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  contextId: z.string().uuid().nullable().optional(),
  contextName: z.string().nullable().optional(),
  contextColor: z.string().nullable().optional(),
  status: GoalStatusSchema.default('IN_PROGRESS'),
  targetDate: z.string().nullable().optional(), // YYYY-MM-DD
  progressPercentage: z.number().min(0).max(100).default(0),
  milestones: z.array(MilestoneSchema).default([]),
  version: z.number().int().default(1),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});
export type Goal = z.infer<typeof GoalSchema>;

export const CreateGoalInputSchema = z.object({
  title: z.string().min(1, 'Goal title is required').max(200),
  description: z.string().optional(),
  contextId: z.string().uuid().optional(),
  status: GoalStatusSchema.default('IN_PROGRESS').optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD').optional(),
  initialMilestones: z.array(CreateMilestoneInputSchema).optional(),
});
export type CreateGoalInput = z.infer<typeof CreateGoalInputSchema>;

export const UpdateGoalInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  contextId: z.string().uuid().nullable().optional(),
  status: GoalStatusSchema.optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  progressPercentage: z.number().min(0).max(100).optional(),
  version: z.number().int().optional(),
});
export type UpdateGoalInput = z.infer<typeof UpdateGoalInputSchema>;

export const GoalListResponseSchema = z.object({
  data: z.array(GoalSchema),
});
export type GoalListResponse = z.infer<typeof GoalListResponseSchema>;

// -----------------------------------------------------------------------------
// 18. Weekly Planning & Reviews
// -----------------------------------------------------------------------------

export const WeeklyReviewReflectionsSchema = z.object({
  whatWentWell: z.string().default(''),
  whatToImprove: z.string().default(''),
  keyTakeaways: z.string().default(''),
});
export type WeeklyReviewReflections = z.infer<typeof WeeklyReviewReflectionsSchema>;

export const WeeklyReviewMetricsSchema = z.object({
  commitmentsAttended: z.number().int().default(0),
  tasksCompleted: z.number().int().default(0),
  habitCompletions: z.number().int().default(0),
});
export type WeeklyReviewMetrics = z.infer<typeof WeeklyReviewMetricsSchema>;

export const WeeklyReviewSchema = z.object({
  id: z.string().uuid(),
  weekStart: z.string(), // YYYY-MM-DD (Monday)
  weekEnd: z.string(), // YYYY-MM-DD (Sunday)
  weekNumber: z.number().int(),
  year: z.number().int(),
  reflections: WeeklyReviewReflectionsSchema,
  intentions: z.array(z.string()).default([]),
  metrics: WeeklyReviewMetricsSchema,
  version: z.number().int().default(1),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});
export type WeeklyReview = z.infer<typeof WeeklyReviewSchema>;

export const SaveWeeklyReviewInputSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD format (Monday)'),
  reflections: WeeklyReviewReflectionsSchema.optional(),
  intentions: z.array(z.string().min(1).max(200)).optional(),
});
export type SaveWeeklyReviewInput = z.infer<typeof SaveWeeklyReviewInputSchema>;

export const WeeklyReviewListResponseSchema = z.object({
  data: z.array(WeeklyReviewSchema),
});
export type WeeklyReviewListResponse = z.infer<typeof WeeklyReviewListResponseSchema>;

// -----------------------------------------------------------------------------
// 19. Offline Sync & Conflict Resolution
// -----------------------------------------------------------------------------

export const SyncMutationSchema = z.object({
  clientMutationId: z.string(),
  entityType: z.enum([
    'TASK',
    'COMMITMENT',
    'COMMITMENT_LOG',
    'HABIT',
    'HABIT_LOG',
    'GOAL',
    'MILESTONE',
    'WEEKLY_REVIEW',
  ]),
  action: z.enum(['CREATE', 'UPDATE', 'DELETE']),
  entityId: z.string(),
  payload: z.record(z.string(), z.any()),
  clientTimestamp: z.string(),
  version: z.number().int().optional(),
});
export type SyncMutation = z.infer<typeof SyncMutationSchema>;

export const BatchSyncRequestSchema = z.object({
  lastSyncTimestamp: z.string().optional(),
  mutations: z.array(SyncMutationSchema).default([]),
});
export type BatchSyncRequest = z.infer<typeof BatchSyncRequestSchema>;

export const SyncConflictSchema = z.object({
  clientMutationId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  error: z.string(),
  currentServerEntity: z.any().optional(),
});
export type SyncConflict = z.infer<typeof SyncConflictSchema>;

export const BatchSyncResponseSchema = z.object({
  serverTimestamp: z.string(),
  processedMutationIds: z.array(z.string()),
  conflicts: z.array(SyncConflictSchema),
  changes: z.object({
    tasks: z.array(TaskSchema).default([]),
    commitments: z.array(ScheduleCommitmentSchema).default([]),
    habits: z.array(HabitSchema).default([]),
    goals: z.array(GoalSchema).default([]),
    weeklyReviews: z.array(WeeklyReviewSchema).default([]),
  }),
});
export type BatchSyncResponse = z.infer<typeof BatchSyncResponseSchema>;


