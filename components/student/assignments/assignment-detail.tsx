'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Award,
  CheckCircle2,
  ClipboardList,
  FileText,
  ListChecks,
  Loader2,
  Paperclip,
  Send,
  UploadCloud,
  XCircle,
  PenLine,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { submitAssignmentProgress } from '@/app/student/progress/actions'
import type {
  Assignment,
  AssignmentStatus,
  CourseDetail,
  QuizQuestion,
} from '@/lib/student-types'

const statusStyles: Record<AssignmentStatus, string> = {
  'لم يبدأ': 'bg-secondary text-muted-foreground',
  'قيد التنفيذ': 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  'تم التسليم': 'bg-primary/15 text-primary',
  'مصحّح': 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
}

// Per-question answer: index for mcq, text for essay, filename for file.
type AnswerMap = Record<string, { choice?: number; text?: string; file?: string }>

export function AssignmentDetail({
  assignment,
  course,
}: {
  assignment: Assignment
  course?: CourseDetail
}) {
  const questions = assignment.questions ?? []
  const hasQuestions = questions.length > 0

  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<AssignmentStatus>(assignment.status)
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [submitted, setSubmitted] = useState(
    assignment.status === 'مصحّح' || assignment.status === 'تم التسليم',
  )

  // Legacy free-form submission (assignments with no structured questions).
  const [text, setText] = useState('')
  const [files, setFiles] = useState<string[]>([])

  const mcqQuestions = questions.filter((q) => q.kind === 'mcq')
  const correctCount = mcqQuestions.filter(
    (q) => answers[q.id]?.choice === q.correctIndex,
  ).length
  const mcqScore =
    mcqQuestions.length > 0
      ? Math.round((correctCount / mcqQuestions.length) * assignment.points)
      : assignment.score ?? 0
  const mcqPercent =
    mcqQuestions.length > 0
      ? Math.round((correctCount / mcqQuestions.length) * 100)
      : 0

  const isAnswered = (q: QuizQuestion) => {
    const a = answers[q.id]
    if (!a) return false
    if (q.kind === 'mcq') return a.choice != null
    if (q.kind === 'essay') return !!a.text?.trim()
    return !!a.file
  }
  const allAnswered = questions.every(isAnswered)

  const displayScore =
    status === 'مصحّح'
      ? mcqQuestions.length > 0
        ? mcqScore
        : assignment.score
      : undefined

  const setChoice = (qid: string, choice: number) =>
    setAnswers((p) => ({ ...p, [qid]: { ...p[qid], choice } }))
  const setEssay = (qid: string, value: string) =>
    setAnswers((p) => ({ ...p, [qid]: { ...p[qid], text: value } }))
  const setFile = (qid: string, name: string | undefined) =>
    setAnswers((p) => ({ ...p, [qid]: { ...p[qid], file: name } }))

  const persist = (next: 'تم التسليم' | 'مصحّح', score?: number) => {
    startTransition(async () => {
      await submitAssignmentProgress(assignment.id, {
        status: next,
        score,
        courseSlug: course?.id,
      })
      // Refresh so the next item in the lecture unlocks.
      router.refresh()
    })
  }

  const handleSubmitQuestions = () => {
    if (!allAnswered) return
    setSubmitted(true)
    // إذا كانت كل الأسئلة اختيار من متعدد، نصحّح فوراً. غير ذلك ننتظر المدرّب.
    const allMcq = questions.every((q) => q.kind === 'mcq')
    const next: 'تم التسليم' | 'مصحّح' = allMcq ? 'مصحّح' : 'تم التسليم'
    setStatus(next)
    persist(next, allMcq ? mcqScore : undefined)
  }

  const handleSubmitFreeform = () => {
    if (!text.trim() && files.length === 0) return
    setSubmitted(true)
    setStatus('تم التسليم')
    persist('تم التسليم')
  }

  const handleFiles = (list: FileList | null) => {
    if (!list) return
    setFiles((prev) => [...prev, ...Array.from(list).map((f) => f.name)])
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <Link
        href={course ? `/student/courses/${course.id}` : '/student/courses'}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowRight className="size-4" />
        {course ? course.title : 'العودة'}
      </Link>

      {/* Header */}
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ClipboardList className="size-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground text-balance">
                {assignment.title}
              </h1>
              {course && (
                <p className="mt-1 text-sm text-muted-foreground">{course.title}</p>
              )}
            </div>
          </div>
          <span
            className={cn(
              'shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold',
              statusStyles[status],
            )}
          >
            {status}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border border-border p-3">
            <ListChecks className="size-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">عدد الأسئلة</p>
              <p className="text-sm font-semibold text-foreground">
                {questions.length} سؤال
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border p-3">
            <Award className="size-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">الدرجة</p>
              <p className="text-sm font-semibold text-foreground">
                {assignment.points} نقطة
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border p-3">
            <CheckCircle2 className="size-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">نتيجتك</p>
              <p className="text-sm font-semibold text-foreground">
                {displayScore != null ? `${displayScore}/${assignment.points}` : '—'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Description */}
      {(assignment.description || assignment.instructions.length > 0) && (
        <Card className="p-6">
          {assignment.description && (
            <>
              <h2 className="mb-3 text-lg font-bold text-foreground">وصف الواجب</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {assignment.description}
              </p>
            </>
          )}
          {assignment.instructions.length > 0 && (
            <>
              <h3 className="mb-3 mt-6 flex items-center gap-2 text-base font-bold text-foreground">
                <ListChecks className="size-5 text-primary" />
                المطلوب منك
              </h3>
              <ul className="flex flex-col gap-2.5">
                {assignment.instructions.map((ins, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    {ins}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      )}

      {/* Questions */}
      {hasQuestions ? (
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">أسئلة الواجب</h2>
            <span className="text-xs text-muted-foreground">
              {questions.length} سؤال
            </span>
          </div>

          {submitted && mcqQuestions.length > 0 && (
            <div
              className={cn(
                'mb-5 flex items-center gap-3 rounded-xl p-4',
                mcqPercent >= 60
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-destructive/10 text-destructive',
              )}
            >
              {mcqPercent >= 60 ? (
                <CheckCircle2 className="size-6 shrink-0" />
              ) : (
                <XCircle className="size-6 shrink-0" />
              )}
              <div>
                <p className="text-sm font-semibold">
                  {mcqPercent >= 60 ? 'أحسنت!' : 'راجع إجاباتك'}
                </p>
                <p className="text-xs">
                  أجبت {correctCount} من {mcqQuestions.length} من أسئلة الاختيار بشكل
                  صحيح ({mcqPercent}%)
                  {questions.some((q) => q.kind !== 'mcq') &&
                    ' • باقي الأسئلة بانتظار تصحيح المدرّب'}
                </p>
              </div>
            </div>
          )}

          <ol className="flex flex-col gap-6">
            {questions.map((q, qi) => (
              <li key={q.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="flex gap-2 text-sm font-semibold text-foreground">
                    <span className="text-primary">{qi + 1}.</span>
                    {q.question}
                  </p>
                  <QuestionKindTag kind={q.kind} />
                </div>

                {q.kind === 'mcq' && (
                  <div className="flex flex-col gap-2">
                    {q.options.map((opt, oi) => {
                      const selected = answers[q.id]?.choice === oi
                      const isCorrect = oi === q.correctIndex
                      const showState = submitted
                      return (
                        <button
                          key={oi}
                          type="button"
                          disabled={submitted}
                          onClick={() => setChoice(q.id, oi)}
                          className={cn(
                            'flex items-center gap-3 rounded-xl border p-3 text-right text-sm transition-colors',
                            !showState &&
                              (selected
                                ? 'border-primary bg-primary/5 text-foreground'
                                : 'border-border text-foreground hover:bg-secondary/50'),
                            showState &&
                              isCorrect &&
                              'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                            showState &&
                              selected &&
                              !isCorrect &&
                              'border-destructive/50 bg-destructive/10 text-destructive',
                            showState &&
                              !isCorrect &&
                              !selected &&
                              'border-border text-muted-foreground',
                          )}
                        >
                          <span
                            className={cn(
                              'flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold',
                              selected
                                ? 'border-current'
                                : 'border-muted-foreground/40 text-muted-foreground',
                            )}
                          >
                            {['أ', 'ب', 'ج', 'د', 'هـ', 'و'][oi] ?? oi + 1}
                          </span>
                          <span className="flex-1">{opt}</span>
                          {showState && isCorrect && (
                            <CheckCircle2 className="size-4 shrink-0" />
                          )}
                          {showState && selected && !isCorrect && (
                            <XCircle className="size-4 shrink-0" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                {q.kind === 'essay' && (
                  <textarea
                    value={answers[q.id]?.text ?? ''}
                    disabled={submitted}
                    onChange={(e) => setEssay(q.id, e.target.value)}
                    rows={4}
                    placeholder="اكتب إجابتك هنا..."
                    className="w-full resize-none rounded-xl border border-border bg-secondary/40 p-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card disabled:opacity-70"
                  />
                )}

                {q.kind === 'file' && (
                  <div>
                    {answers[q.id]?.file ? (
                      <div className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm text-foreground">
                        <Paperclip className="size-4 text-muted-foreground" />
                        <span className="flex-1 truncate">{answers[q.id]?.file}</span>
                        {!submitted && (
                          <button
                            type="button"
                            onClick={() => setFile(q.id, undefined)}
                            className="text-xs text-muted-foreground hover:text-destructive"
                          >
                            إزالة
                          </button>
                        )}
                      </div>
                    ) : (
                      <label
                        className={cn(
                          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/30 p-5 text-center transition-colors hover:bg-secondary/50',
                          submitted && 'pointer-events-none opacity-60',
                        )}
                      >
                        <UploadCloud className="size-6 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">
                          ارفع ملف الإجابة
                        </span>
                        <span className="text-xs text-muted-foreground">
                          PDF، صورة، أو مستند
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          disabled={submitted}
                          onChange={(e) =>
                            setFile(q.id, e.target.files?.[0]?.name)
                          }
                        />
                      </label>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>

          {!submitted && (
            <Button
              onClick={handleSubmitQuestions}
              disabled={!allAnswered || isPending}
              className="mt-6 w-fit"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              تسليم الواجب
            </Button>
          )}
        </Card>
      ) : (
        /* Freeform submission (no structured questions) */
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-bold text-foreground">تسليم الواجب</h2>
          {submitted ? (
            <div className="flex items-center gap-3 rounded-xl bg-primary/10 p-4 text-primary">
              <CheckCircle2 className="size-6 shrink-0" />
              <div>
                <p className="text-sm font-semibold">تم تس��يم الواجب بنجاح</p>
                <p className="text-xs">سيتم تصحيحه من قبل المدرّب قريباً.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="answer"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  إجابتك / ملاحظاتك
                </label>
                <textarea
                  id="answer"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={5}
                  placeholder="اكتب إجابتك أو رابط مشروعك هنا..."
                  className="w-full resize-none rounded-xl border border-border bg-secondary/40 p-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card"
                />
              </div>
              <div>
                <p className="mb-1.5 text-sm font-medium text-foreground">إرفاق ملفات</p>
                <label
                  htmlFor="files"
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/30 p-6 text-center transition-colors hover:bg-secondary/50"
                >
                  <UploadCloud className="size-7 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    اسحب الملفات هنا أو اضغط للرفع
                  </span>
                  <input
                    id="files"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                </label>
                {files.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-2">
                    {files.map((f, i) => (
                      <li
                        key={`${f}-${i}`}
                        className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                      >
                        <Paperclip className="size-4 text-muted-foreground" />
                        <span className="truncate">{f}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Button
                onClick={handleSubmitFreeform}
                disabled={(!text.trim() && files.length === 0) || isPending}
                className="w-fit"
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                تسليم الواجب
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

function QuestionKindTag({ kind }: { kind: QuizQuestion['kind'] }) {
  const meta = {
    mcq: { label: 'اختيار', icon: ListChecks },
    essay: { label: 'مقالي', icon: PenLine },
    file: { label: 'رفع ملف', icon: FileText },
  }[kind]
  const Icon = meta.icon
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      <Icon className="size-3" />
      {meta.label}
    </span>
  )
}
