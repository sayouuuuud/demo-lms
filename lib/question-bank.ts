/**
 * lib/question-bank.ts
 * shared (client + server) — ممنوع أي import من prisma أو 'server-only' هنا.
 */

import type { QuestionType } from '@/lib/exam-builder'
import { createOption, createQuestion } from '@/lib/exam-builder'

// ─── الأنواع ───────────────────────────────────────────────────────────────────

export type Difficulty = 'easy' | 'medium' | 'hard'
export type ScopeType  = 'stage' | 'branch' | 'monthly_course' | 'lecture'

export type BankScope = {
  scopeType: ScopeType
  scopeId:   string
  label?:    string
}

export type BankQuestion = {
  id:            string
  type:          QuestionType
  contentMode:   'text' | 'image'
  text:          string
  imageUrl:      string
  options:       string[]           // مصفوفة نصوص — نفس شكل exam_questions.options
  correctAnswer: string | null
  modelAnswer:   string
  points:        number
  difficulty:    Difficulty
  autoDifficulty: Difficulty | null
  usageCount:    number
  lastUsedAt:    string | null
  answersCount:  number
  correctCount:  number
  successRate:   number | null      // correctCount / answersCount، null لو answersCount = 0
  notes:         string
  topics:        { id: string; title: string }[]
  scopes:        BankScope[]
  createdAt:     string
}

// ─── ثوابت العرض ──────────────────────────────────────────────────────────────

export const DIFFICULTY_META: Record<Difficulty, { label: string; badgeCls: string }> = {
  easy:   { label: 'سهل',   badgeCls: 'bg-primary/10 text-primary' },
  medium: { label: 'متوسط', badgeCls: 'bg-secondary text-foreground' },
  hard:   { label: 'صعب',   badgeCls: 'bg-destructive/10 text-destructive' },
}

export const SCOPE_TYPE_LABEL: Record<ScopeType, string> = {
  stage:          'سنة',
  branch:         'فرع',
  monthly_course: 'كورس',
  lecture:        'محاضرة',
}

export const DIFFICULTY_VALUES: Difficulty[] = ['easy', 'medium', 'hard']

// ─── تطبيع + تحقق ─────────────────────────────────────────────────────────────

const VALID_DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard']
const VALID_SCOPE_TYPES: readonly ScopeType[]   = ['stage', 'branch', 'monthly_course', 'lecture']
const VALID_QUESTION_TYPES: readonly QuestionType[] = ['mcq', 'essay', 'file']

export function normalizeDifficulty(v: unknown): Difficulty {
  if (v === 'easy' || v === 'hard') return v as Difficulty
  return 'medium'
}

export function normalizeScopeType(v: unknown): ScopeType | null {
  if (VALID_SCOPE_TYPES.includes(v as ScopeType)) return v as ScopeType
  return null
}

export function isValidQuestionType(v: unknown): v is QuestionType {
  return VALID_QUESTION_TYPES.includes(v as QuestionType)
}

// ─── تحليل الصعوبة التلقائي ────────────────────────────────────────────────────

/**
 * يحسب الصعوبة تلقائيًا بناءً على معدل الصحة.
 * لو البيانات أقل من 10 إجابة → null (غير كافية).
 */
export function computeAutoDifficulty(
  answersCount: number,
  correctCount:  number,
): Difficulty | null {
  if (answersCount < 10) return null
  const rate = correctCount / answersCount
  if (rate >= 0.75) return 'easy'
  if (rate >= 0.45) return 'medium'
  return 'hard'
}

// ─── المحوّل: بنك → builder ────────────────────────────────────────────────────

import type { Question } from '@/lib/exam-builder'

/**
 * يحوّل `BankQuestion` إلى `Question` جاهز للـ exam-builder.
 * لا يعيد استخدام `bq.id` كـ `Question.id` — id جديد لكل صف.
 */
export function bankQuestionToBuilderQuestion(bq: BankQuestion): Question {
  const q = createQuestion(bq.type)

  q.bankQuestionId = bq.id
  q.contentMode    = bq.contentMode
  q.text           = bq.text
  q.imageUrl       = bq.imageUrl
  q.points         = bq.points > 0 ? bq.points : 1
  q.modelAnswer    = bq.modelAnswer

  if (bq.type === 'mcq') {
    const options    = bq.options.map(text => createOption(text))
    q.options        = options

    const matchedOpt = options.find(o => o.text.trim() === (bq.correctAnswer ?? '').trim())
    q.correctOptionId = matchedOpt?.id ?? (options[0]?.id ?? null)
  } else {
    q.options        = []
    q.correctOptionId = null
  }

  return q
}
