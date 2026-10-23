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
export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  taskType: TaskTypeSchema,
  subjectId: z.string().uuid().nullable().optional(),
  subjectName: z.string().nullable().optional(),
  subjectColor: z.string().nullable().optional(),
  periodId: z.string().uuid().nullable().optional(),
  dueAt: z.string().nullable().optional(), // ISO datetime
  completedAt: z.string().nullable().optional(),
  isCompleted: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});
export type Task = z.infer<typeof TaskSchema>;

export const CreateTaskInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  taskType: TaskTypeSchema.default('OTHER'),
  subjectId: z.string().uuid().optional(),
  periodId: z.string().uuid().optional(),
  dueAt: z.string().datetime().optional(),
});
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;

export const UpdateTaskInputSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  taskType: TaskTypeSchema.optional(),
  subjectId: z.string().uuid().nullable().optional(),
  periodId: z.string().uuid().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
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

