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
// ─── محلّل الإدخال المجمّع ─────────────────────────────────────────────────────

export type ParsedBulkQuestion = {
  text: string
  type: 'mcq' | 'essay'
  options: string[]
  correctAnswer: string | null
  points: number
  difficulty: Difficulty
  errors: string[]
}

export function parseBulkQuestions(raw: string): ParsedBulkQuestion[] {
  const blocks = raw.split(/\n\s*\n+/).filter(b => b.trim())
  const results: ParsedBulkQuestion[] = []

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trimEnd())
    if (!lines.length) continue

    let text    = ''
    let type: 'mcq' | 'essay' | null = null
    let points  = 1
    let difficulty: Difficulty = 'medium'
    const options: string[]    = []
    let correctAnswer: string | null = null
    const errors: string[]           = []
    let correctCount = 0

    // First line: question text + inline keys
    let firstLine = lines[0]
    // Strip question prefix
    firstLine = firstLine.replace(/^(س[:.]|سؤال:)\s*/, '')

    // Extract inline keys separated by |
    const parts = firstLine.split('|')
    let questionPart = parts[0].trim()

    for (const part of parts.slice(1)) {
      const p = part.trim()
      const diffMatch = p.match(/^صعوبة:\s*(سهل|متوسط|صعب)$/)
      if (diffMatch) {
        difficulty = diffMatch[1] === 'سهل' ? 'easy' : diffMatch[1] === 'صعب' ? 'hard' : 'medium'
        continue
      }
      const pointsMatch = p.match(/^درجة:\s*(\d+)$/)
      if (pointsMatch) {
        points = Math.max(1, parseInt(pointsMatch[1], 10))
        continue
      }
    }

    text = questionPart

    // Rest of lines
    for (const line of lines.slice(1)) {
      const trimmed = line.trim()
      if (!trimmed) continue

      // Essay marker
      if (/^نوع:\s*مقالي$/.test(trimmed)) { type = 'essay'; continue }

      // Difficulty inline
      const diffM = trimmed.match(/^صعوبة:\s*(سهل|متوسط|صعب)$/)
      if (diffM) {
        difficulty = diffM[1] === 'سهل' ? 'easy' : diffM[1] === 'صعب' ? 'hard' : 'medium'
        continue
      }

      // Points inline
      const ptM = trimmed.match(/^درجة:\s*(\d+)$/)
      if (ptM) { points = Math.max(1, parseInt(ptM[1], 10)); continue }

      // Option: starts with - or *
      if (/^[-*]/.test(trimmed)) {
        const isCorrect = trimmed.startsWith('*')
        const optText   = trimmed.replace(/^[-*]\s*/, '').trim()
        if (!optText) continue
        options.push(optText)
        if (isCorrect) {
          correctCount++
          if (correctCount === 1) correctAnswer = optText
          else if (correctCount > 1) errors.push('أكتر من إجابة صحيحة — اتاخد الأول')
        }
        continue
      }
    }

    // Infer type
    if (type === null) {
      type = options.length > 0 ? 'mcq' : 'essay'
    }

    if (!text.trim()) errors.push('نص السؤال فاضي')

    if (type === 'mcq') {
      if (options.length < 2) errors.push('لازم خيارين على الأقل')
      if (!correctAnswer)     errors.push('مفيش إجابة صحيحة محددة')
    }

    results.push({ text, type, options: type === 'essay' ? [] : options, correctAnswer, points, difficulty, errors })
  }

  return results
}

export function bankQuestionToBuilderQuestion(bq: BankQuestion): Question {
  const q = createQuestion(bq.type)

  q.bankQuestionId  = bq.id
  q.bankDifficulty  = bq.difficulty
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
