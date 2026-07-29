'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlarmClock,
  ArrowRight,
  Award,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileQuestion,
  Hourglass,
  ListChecks,
  Loader2,
  Paperclip,
  Send,
  XCircle,
} from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ImageUploadField } from '@/components/ui/image-upload-field'
import { cn } from '@/lib/utils'
import { submitExam, type StudentExam } from '@/app/student/exams/actions'

const OPTION_LABELS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و']

type Phase = 'intro' | 'taking' | 'result'

type LocalAnswer = {
  selectedOption?: string | null
  answerText?: string | null
  fileUrl?: string | null
}

function formatTime(total: number) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function ExamDetail({ exam }: { exam: StudentExam }) {
  const router = useRouter()
  const alreadySubmitted = exam.submission != null
  const [phase, setPhase] = useState<Phase>(alreadySubmitted ? 'result' : 'intro')
  const [answers, setAnswers] = useState<Record<string, LocalAnswer>>({})
  const [secondsLeft, setSecondsLeft] = useState(exam.durationMinutes * 60)
  const [submitting, setSubmitting] = useState(false)

  const questions = exam.questions

  // Countdown while taking; auto-submit on timeout.
  useEffect(() => {
    if (phase !== 'taking') return
    if (secondsLeft <= 0) {
      void handleSubmit()
      return
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, secondsLeft])

  const isAnswered = (qId: string) => {
    const a = answers[qId]
    if (!a) return false
    return (
      (a.selectedOption != null && a.selectedOption !== '') ||
      (a.answerText != null && a.answerText.trim() !== '') ||
      (a.fileUrl != null && a.fileUrl !== '')
    )
  }

  const answeredCount = questions.filter((q) => isAnswered(q.id)).length
  const allAnswered = answeredCount === questions.length && questions.length > 0
  const progress = questions.length
    ? Math.round((answeredCount / questions.length) * 100)
    : 0

  const setAnswer = (qId: string, patch: LocalAnswer) =>
    setAnswers((prev) => ({ ...prev, [qId]: { ...prev[qId], ...patch } }))

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)
    try {
      const payload = questions.map((q) => ({
        questionId: q.id,
        selectedOption: answers[q.id]?.selectedOption ?? null,
        answerText: answers[q.id]?.answerText ?? null,
        fileUrl: answers[q.id]?.fileUrl ?? null,
      }))
      const result = await submitExam(exam.code, payload)
      if (!result.success) {
        toast.error(result.error || 'تعذر تسليم الاختبار')
        return
      }
      toast.success(
        result.gradingStatus === 'pending'
          ? 'تم تسليم اختبارك، النتيجة قيد التصحيح'
          : 'تم تسليم اختبارك بنجاح',
      )
      setPhase('result')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  const meta = [
    { label: 'عدد الأسئلة', value: `${questions.length}`, icon: FileQuestion },
    { label: 'المدة', value: `${exam.durationMinutes} دقيقة`, icon: Clock },
    { label: 'الدرجة الكلية', value: `${exam.totalPoints} نقطة`, icon: Award },
    { label: 'حد النجاح', value: `${exam.passMark}%`, icon: ListChecks },
  ]

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/student/exams"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowRight className="size-4" />
        كل الاختبارات
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
                {exam.title}
              </h1>
              {exam.course && (
                <p className="mt-1 text-sm text-muted-foreground">{exam.course}</p>
              )}
            </div>
          </div>
          {phase === 'taking' && (
            <span className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-sm font-bold text-primary tabular-nums">
              <AlarmClock className="size-4" />
              {formatTime(secondsLeft)}
            </span>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {meta.map((m) => (
            <div
              key={m.label}
              className="flex items-center gap-3 rounded-xl border border-border p-3"
            >
              <m.icon className="size-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="text-sm font-semibold text-foreground">{m.value}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Intro */}
      {phase === 'intro' && (
        <Card className="p-6">
          <h2 className="mb-3 text-lg font-bold text-foreground">عن الاختبار</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {exam.description || 'اقرأ كل سؤال جيدًا وأجب قبل انتهاء الوقت المحدد.'}
          </p>

          <div className="mt-6 flex items-center gap-3 rounded-xl bg-amber-500/10 p-4 text-amber-600 dark:text-amber-400">
            <AlarmClock className="size-5 shrink-0" />
            <p className="text-sm">
              بمجرد بدء الاختبار سيبدأ العدّاد ({exam.durationMinutes} دقيقة). لا يمكنك
              التسليم أكثر من مرة.
            </p>
          </div>

          <Button
            className="mt-6 w-fit"
            onClick={() => setPhase('taking')}
            disabled={questions.length === 0}
          >
            <ClipboardList className="size-4" />
            بدء الاختبار الآن
          </Button>
          {questions.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              لا توجد أسئلة في هذا الاختبار بعد.
            </p>
          )}
        </Card>
      )}

      {/* Result banner */}
      {phase === 'result' && exam.submission && (
        <ResultBanner exam={exam} />
      )}

      {/* Progress while taking */}
      {phase === 'taking' && (
        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">تقدّمك في الإجابة</span>
            <span className="text-muted-foreground">
              {answeredCount}/{questions.length}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </Card>
      )}

      {/* Questions */}
      {(phase === 'taking' || phase === 'result') && (
        <Card className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">
              {phase === 'result' ? 'مراجعة الإجابات' : 'أسئلة الاختبار'}
            </h2>
            <span className="text-xs text-muted-foreground">
              {questions.length} أسئلة
            </span>
          </div>

          <ol className="flex flex-col gap-8">
            {questions.map((q, qi) => (
              <QuestionBlock
                key={q.id}
                index={qi}
                question={q}
                phase={phase}
                localAnswer={answers[q.id]}
                onChange={(patch) => setAnswer(q.id, patch)}
                review={
                  phase === 'result'
                    ? exam.submission?.answers.find((a) => a.questionId === q.id)
                    : undefined
                }
                pending={exam.submission?.gradingStatus === 'pending'}
              />
            ))}
          </ol>

          {phase === 'taking' && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button onClick={handleSubmit} disabled={!allAnswered || submitting}>
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                تسليم الاختبار
              </Button>
              {!allAnswered && (
                <p className="text-xs text-muted-foreground">
                  أجب عن كل الأسئلة لتتمكّن من التسليم ({answeredCount}/
                  {questions.length})
                </p>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

function ResultBanner({ exam }: { exam: StudentExam }) {
  const sub = exam.submission!
  const pending = sub.gradingStatus === 'pending'
  const percent =
    sub.total > 0 ? Math.round((sub.score / sub.total) * 100) : 0
  const passed = percent >= exam.passMark

  if (pending) {
    return (
      <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Hourglass className="size-7" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">إجابتك قيد التصحيح</p>
            <p className="text-sm text-muted-foreground">
              يحتوي هذا الاختبار على أسئلة تحتاج تصحيحًا يدويًا. ستظهر درجتك النهائية
              بعد أن يعتمدها المعلّم.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-2 text-sm font-bold text-amber-600 dark:text-amber-400">
          <Clock className="size-4" />
          بانتظار التصحيح
        </span>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'flex size-14 shrink-0 items-center justify-center rounded-2xl',
            passed
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-destructive/10 text-destructive',
          )}
        >
          {passed ? (
            <CheckCircle2 className="size-7" />
          ) : (
            <XCircle className="size-7" />
          )}
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">
            {passed ? 'مبروك، لقد اجتزت الاختبار!' : 'لم تجتز الاختبار'}
          </p>
          <p className="text-sm text-muted-foreground">
            حصلت على {sub.score} من {sub.total} · حد النجاح {exam.passMark}%
          </p>
        </div>
      </div>
      <div className="text-center">
        <p
          className={cn(
            'text-3xl font-bold tabular-nums',
            passed
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-destructive',
          )}
        >
          {percent}%
        </p>
        <p className="text-xs text-muted-foreground">
          {sub.score}/{sub.total} نقطة
        </p>
      </div>
    </Card>
  )
}

function QuestionBlock({
  index,
  question,
  phase,
  localAnswer,
  onChange,
  review,
  pending,
}: {
  index: number
  question: StudentExam['questions'][number]
  phase: Phase
  localAnswer?: LocalAnswer
  onChange: (patch: LocalAnswer) => void
  review?: StudentExam['submission'] extends null
    ? never
    : NonNullable<StudentExam['submission']>['answers'][number]
  pending?: boolean
}) {
  const reviewing = phase === 'result'

  return (
    <li className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <p className="flex gap-2 text-sm font-semibold text-foreground">
          <span className="text-primary">{index + 1}.</span>
          {question.text || (question.contentMode === 'image' ? 'انظر الصورة' : '')}
        </p>
        <span className="shrink-0 rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {question.points} نقطة
        </span>
      </div>

      {/* Question image */}
      {question.contentMode === 'image' && question.imageUrl && (
        <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-border">
          <Image
            src={question.imageUrl || '/placeholder.svg'}
            alt={`صورة السؤال ${index + 1}`}
            width={800}
            height={500}
            className="h-auto w-full object-contain"
          />
        </div>
      )}

      {/* MCQ */}
      {question.type === 'mcq' && (
        <div className="flex flex-col gap-2">
          {question.options.map((opt, oi) => {
            const selected = reviewing
              ? review?.selectedOption === opt
              : localAnswer?.selectedOption === opt
            const isCorrect = reviewing && review?.correctAnswer === opt
            const wrongSelected = reviewing && selected && !isCorrect
            return (
              <button
                key={oi}
                type="button"
                disabled={reviewing}
                onClick={() => onChange({ selectedOption: opt })}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3 text-right text-sm transition-colors',
                  !reviewing &&
                    (selected
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border text-foreground hover:bg-secondary/50'),
                  isCorrect &&
                    'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                  wrongSelected &&
                    'border-destructive/50 bg-destructive/10 text-destructive',
                  reviewing &&
                    !isCorrect &&
                    !selected &&
                    'border-border text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold',
                    selected ? 'border-current' : 'border-muted-foreground/40 text-muted-foreground',
                  )}
                >
                  {OPTION_LABELS[oi] ?? oi + 1}
                </span>
                <span className="flex-1">{opt}</span>
                {isCorrect && <CheckCircle2 className="size-4 shrink-0" />}
                {wrongSelected && <XCircle className="size-4 shrink-0" />}
              </button>
            )
          })}
        </div>
      )}

      {/* Essay */}
      {question.type === 'essay' &&
        (reviewing ? (
          <div className="rounded-xl border border-border bg-secondary/40 p-3 text-sm text-foreground">
            <p className="whitespace-pre-wrap leading-relaxed">
              {review?.answerText || 'لم تتم الإجابة'}
            </p>
          </div>
        ) : (
          <textarea
            value={localAnswer?.answerText ?? ''}
            onChange={(e) => onChange({ answerText: e.target.value })}
            placeholder="اكتب إجابتك هنا..."
            rows={4}
            className="w-full resize-none rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card"
          />
        ))}

      {/* File upload */}
      {question.type === 'file' &&
        (reviewing ? (
          <div className="rounded-xl border border-border bg-secondary/40 p-3 text-sm">
            {review?.fileUrl ? (
              <a
                href={review.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
              >
                <Paperclip className="size-4" />
                عرض الملف المرفوع
              </a>
            ) : (
              <span className="text-muted-foreground">لم يتم رفع ملف</span>
            )}
          </div>
        ) : (
          <ImageUploadField
            value={localAnswer?.fileUrl ?? ''}
            onChange={(url) => onChange({ fileUrl: url })}
            label="ارفع إجابتك (صورة/ملف)"
            hint="ارفع صورة تحتوي على حلّك"
          />
        ))}

      {/* Review feedback per question */}
      {reviewing && review && (
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {review.needsManual && pending ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1 font-semibold text-amber-600 dark:text-amber-400">
              <Hourglass className="size-3.5" />
              قيد التصحيح اليدوي
            </span>
          ) : (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold',
                review.awardedPoints > 0
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-destructive/10 text-destructive',
              )}
            >
              {review.awardedPoints}/{question.points} نقطة
            </span>
          )}
          {review.modelAnswer && !pending && (
            <span className="text-muted-foreground">
              الإجابة النموذجية: {review.modelAnswer}
            </span>
          )}
        </div>
      )}
    </li>
  )
}
