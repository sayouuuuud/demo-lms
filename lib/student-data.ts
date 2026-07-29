import type {
  CourseProgress,
  ScheduleItem,
  GradeItem,
  Certificate,
  Announcement,
} from './student-types'

// الأنواع مُعرَّفة في lib/student-types.ts — re-export للتوافق مع الاستيرادات الموجودة
export type {
  CourseProgress,
  ScheduleItem,
  GradeItem,
  Certificate,
  Announcement,
} from './student-types'

/** @deprecated use getStudentProfile() server action instead */
export const studentProfile = null

/** @deprecated use getStudentEnrolledCourses() server action */
export const enrolledCourses: CourseProgress[] = []

/** @deprecated use getStudentRecentGrades() server action */
export const recentGrades: GradeItem[] = []

/** @deprecated use getStudentAnnouncements() server action */
export const announcements: Announcement[] = []

/** @deprecated use getStudentLearningActivity() server action */
export const learningActivity: import('./student-types').ActivityDay[] = []
