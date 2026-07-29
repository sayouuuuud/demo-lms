import type { ScheduleEventType, ScheduleEvent } from './student-types'

// الأنواع مُعرَّفة في lib/student-types.ts — re-export للتوافق مع الاستيرادات الموجودة
export type { ScheduleEventType, ScheduleEvent } from './student-types'

export const scheduleEventTypes: ScheduleEventType[] = [
  'محاضرة',
  'اختبار',
  'واجب',
  'مراجعة',
  'مباشر',
]

/** ألوان كل نوع حدث (متوافقة مع الوضع الفاتح والداكن) */
export const scheduleTypeStyles: Record<
  ScheduleEventType,
  { chip: string; bar: string; dot: string }
> = {
  محاضرة: {
    chip: 'bg-primary/10 text-primary',
    bar: 'border-r-primary',
    dot: 'bg-primary',
  },
  اختبار: {
    chip: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
    bar: 'border-r-rose-500',
    dot: 'bg-rose-500',
  },
  واجب: {
    chip: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    bar: 'border-r-amber-500',
    dot: 'bg-amber-500',
  },
  مراجعة: {
    chip: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    bar: 'border-r-emerald-500',
    dot: 'bg-emerald-500',
  },
  مباشر: {
    chip: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
    bar: 'border-r-blue-500',
    dot: 'bg-blue-500',
  },
}

// Neutral fallback for unknown event types coming from the database.
export const scheduleTypeStyleFallback = {
  chip: 'bg-secondary text-muted-foreground',
  bar: 'border-r-border',
  dot: 'bg-muted-foreground',
}

/** Safe lookup: never returns undefined for an unexpected event type. */
export function getScheduleTypeStyle(type: string | null | undefined) {
  return scheduleTypeStyles[type as ScheduleEventType] ?? scheduleTypeStyleFallback
}

/** أسماء أيام الأسبوع (يبدأ من السبت) */
export const weekDays = [
  'السبت',
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
]

export const monthNames = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
]

/** يحوّل تاريخ إلى صيغة yyyy-mm-dd بدون مشاكل التوقيت */
function toKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** يبني تاريخًا نسبيًا للشهر الحالي حتى تظهر الأحداث دائمًا */
function relativeDate(dayOffset: number) {
  const d = new Date()
  d.setDate(d.getDate() + dayOffset)
  return toKey(d)
}

/** @deprecated use getStudentFullSchedule() server action */
export const scheduleEvents: ScheduleEvent[] = []
