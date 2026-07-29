import type {
  NotificationType,
  Notification as StudentNotification,
} from './student-types'

// re-export للتوافق مع الاستيرادات الموجودة
export type { NotificationType, Notification } from './student-types'

// نوع محلي لتجنّب التعارض مع global Notification
type Notification = StudentNotification

/** @deprecated use getStudentNotifications() server action */
export const notifications: Notification[] = []
