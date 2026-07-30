export type AssignmentType = 'تسليم' | 'اختبار'

/** الحالات المخزّنة في assignment_submissions.status */
export type StoredSubmissionStatus = 'لم يبدأ' | 'قيد التنفيذ' | 'تم التسليم' | 'مصحّح'

/** الحالة المعروضة في لوحة الإدارة (فيها حالات مشتقّة) */
export type DerivedSubmissionStatus = StoredSubmissionStatus | 'متأخر' | 'لم يسلّم'

/** يطبّع أي قيمة قديمة/إنجليزية لحالة معيارية. */
export function normalizeStatus(raw: string | null | undefined): StoredSubmissionStatus {
  const v = (raw ?? '').trim()
  if (v === 'مصحّح' || v === 'مصحح' || v === 'graded') return 'مصحّح'
  if (v === 'تم التسليم' || v === 'submitted') return 'تم التسليم'
  if (v === 'قيد التنفيذ' || v === 'pending' || v === 'in_progress') return 'قيد التنفيذ'
  return 'لم يبدأ'
}

/** يحسب الحالة المعروضة من الحالة المخزّنة + التواريخ. */
export function deriveStatus(input: {
  stored: StoredSubmissionStatus | null
  submittedAt: Date | null
  dueDate: Date | null
}): DerivedSubmissionStatus {
  const { stored, submittedAt, dueDate } = input
  const past = !!dueDate && dueDate.getTime() < Date.now()
  if (!stored || stored === 'لم يبدأ') return past ? 'لم يسلّم' : 'لم يبدأ'
  if (stored === 'قيد التنفيذ') return past ? 'لم يسلّم' : 'قيد التنفيذ'
  if (submittedAt && dueDate && submittedAt.getTime() > dueDate.getTime()) return 'متأخر'
  return stored
}

/** كلاسات الشارة لكل حالة — توكنز فقط. */
export const statusBadgeClass: Record<DerivedSubmissionStatus, string> = {
  'مصحّح': 'bg-primary/10 text-primary',
  'تم التسليم': 'bg-secondary text-secondary-foreground',
  'متأخر': 'bg-destructive/10 text-destructive',
  'قيد التنفيذ': 'bg-muted text-muted-foreground',
  'لم يبدأ': 'bg-muted text-muted-foreground',
  'لم يسلّم': 'bg-destructive/10 text-destructive',
}

export const SUBMITTED_STATUSES: StoredSubmissionStatus[] = ['تم التسليم', 'مصحّح']
