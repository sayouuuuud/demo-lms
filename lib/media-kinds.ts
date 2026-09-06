/**
 * lib/media-kinds.ts — تعريفات مشتركة لكل أنواع الميديا المرفوعة على Cloudflare R2
 * (يُستورد من الكلاينت والسيرفر — بدون أي كود يعتمد على node)
 */

export type MediaKind =
  | 'curriculum'   // صور المراحل / الفروع / المحاضرات
  | 'site'         // صور الموقع (اللوجو، الهيرو، ...)
  | 'instructor'   // صورة المحاضر
  | 'avatar'       // صورة حساب المستخدم
  | 'receipt'      // إيصالات التحويل
  | 'exam'         // صور إجابات الطالب داخل الاختبارات (أسئلة نوع "ملف")
  | 'video'        // فيديو درس بدون تحويل HLS

type MediaKindConfig = {
  /** مسار الـ prefix داخل الـ bucket (تحت media/) */
  folder: string
  /** أقصى حجم بالبايت */
  maxSize: number
  /** هل مسموح للطالب العادي يرفع في النوع ده؟ */
  studentAllowed: boolean
  /** أنواع MIME المسموحة (prefix match) */
  accept: string[]
  label: string
}

export const MEDIA_KINDS: Record<MediaKind, MediaKindConfig> = {
  curriculum: {
    folder: 'curriculum',
    maxSize: 8 * 1024 * 1024,
    studentAllowed: false,
    accept: ['image/'],
    label: 'صورة المنهج',
  },
  site: {
    folder: 'site',
    maxSize: 8 * 1024 * 1024,
    studentAllowed: false,
    accept: ['image/'],
    label: 'صورة الموقع',
  },
  instructor: {
    folder: 'instructor',
    maxSize: 16 * 1024 * 1024,
    studentAllowed: false,
    accept: ['image/'],
    label: 'صورة المحاضر',
  },
  avatar: {
    folder: 'avatars',
    maxSize: 4 * 1024 * 1024,
    studentAllowed: true,
    accept: ['image/'],
    label: 'صورة الحساب',
  },
  receipt: {
    folder: 'receipts',
    maxSize: 8 * 1024 * 1024,
    studentAllowed: true,
    accept: ['image/', 'application/pdf'],
    label: 'إيصال التحويل',
  },
  exam: {
    folder: 'exams',
    maxSize: 8 * 1024 * 1024,
    studentAllowed: true,
    accept: ['image/'],
    label: 'صورة إجابة الاختبار',
  },
  video: {
    folder: 'videos',
    maxSize: 512 * 1024 * 1024,
    studentAllowed: false,
    accept: ['video/'],
    label: 'فيديو الدرس',
  },
}

/** البادئة الموحّدة لكل مفاتيح الميديا داخل الـ bucket */
export const MEDIA_PREFIX = 'media/'

/** يحوّل مفتاح R2 إلى رابط عرض عبر الراوت الوسيط */
export function mediaKeyToUrl(key: string): string {
  const clean = key.startsWith(MEDIA_PREFIX) ? key.slice(MEDIA_PREFIX.length) : key
  return `/api/media/${clean}`
}

export function formatMaxSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${Math.round(bytes / 1024 / 1024 / 1024)} GB`
  return `${Math.round(bytes / 1024 / 1024)} MB`
}
