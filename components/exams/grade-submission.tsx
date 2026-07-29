'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Loader2,
  Paperclip,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  gradeSubmission,
  type GradingSubmission,
} from '@/app/admin/exams/[id]/actions'

export function GradeSubmission({
  examCode,
  submission,
}: {
  examCode: string
  submission: GradingSubmission
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  // Local manual grades keyed by answerId (only essay/file answers).
  const manualAnswers = submission.answers.filter((a) => a.needsManual)
  const [grades, setGrades] = useState<Record<string, number>>(() =>
    Object.fromEntries(manualAnswers.map((a) => [a.answerId, a.awardedPoints])),
  )

  const autoScore = useMemo(
    () =>
      submission.answers
        .filter((a) => !a.needsManual)
        .reduce((sum, a) => sum + a.awardedPoints, 0),
    [submission.answers],
  )

  const manualScore = useMemo(
    () => Object.values(grades).reduce((sum, v) => sum + (Number(v) || 0), 0),
    [grades],
  )

  const totalScore = autoScore + manualScore
  const percent =
    submission.total > 0 ? Math.round((totalScore / submission.total) * 100) : 0
  const passed = percent >= submission.passMark

  const setGrade = (answerId: string, value: number, max: number) => {
    const clamped = Math.max(0, Math.min(max, Math.round(value || 0)))
    setGrades((prev) => ({ ...prev, [answerId]: clamped }))
  }

  async function handleApprove() {
    setSaving(true)
    try {
      const result = await gradeSubmission(
        submission.id,
        manualAnswers.map((a) => ({
          answerId: a.answerId,
          awardedPoints: grades[a.answerId] ?? 0,
        })),
      )
      if (!result.success) {
        toast.error(result.error || 'تعذر اعتماد الدرجة')
        return
      }
      toast.success('تم اعتماد الدرجة بنجاح')
      router.push(`/admin/exams/${examCode}`)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 font-sans">
      <Link
        href={`/admin/exams/${examCode}`}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowRight className="size-4" />
        العودة للاختبار
      </Link>

      {/* Header */}
      <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ClipboardCheck className="size-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground text-balance">
              تصحيح إجابة: {submission.studentName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {submission.examTitle} · كود الطالب {submission.studentCode}
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
            {totalScore}/{submission.total}
          </p>
          <p className="text-xs text-muted-foreground">
            {percent}% · حد النجاح {submission.passMark}%
          </p>
        </div>
      </Card>

      {/* Score breakdown */}
      <div className="grid grid-cols-3 gap-4">
        <ScoreStat label="التصحيح التلقائي" value={autoScore} />
        <ScoreStat label="التصحيح اليدوي" value={manualScore} />
        <ScoreStat label="الدرجة النهائية" value={totalScore} highlight />
      </div>

      {/* Answers */}
      <Card className="p-6">
        <h2 className="mb-5 text-lg font-bold text-foreground">إجابات الطالب</h2>
        <ol className="flex flex-col gap-6">
          {submission.answers.map((a, i) => (
            <li
              key={a.answerId}
              className="rounded-xl border border-border p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="flex gap-2 text-sm font-semibold text-foreground">
                  <span className="text-primary">{i + 1}.</span>
                  {a.questionText}
                </p>
                <span className="shrink-0 rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {a.points} نقطة
                </span>
              </div>

              {/* MCQ (auto-graded) */}
              {a.questionType === 'mcq' && (
                <div className="mt-3 flex flex-col gap-2 text-sm">
                  <div
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2',
                      a.isCorrect
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-destructive/10 text-destructive',
                    )}
                  >
                    {a.isCorrect ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      <XCircle className="size-4" />
                    )}
                    <span>إجابة الطالب: {a.selectedOption || 'لم يجب'}</span>
                  </div>
                  {!a.isCorrect && (
                    <p className="px-3 text-xs text-muted-foreground">
                      الإجابة الصحيحة: {a.correctAnswer}
                    </p>
                  )}
                  <span className="px-3 text-xs font-semibold text-foreground">
                    درجة تلقائية: {a.awardedPoints}/{a.points}
                  </span>
                </div>
              )}

              {/* Essay (manual) */}
              {a.questionType === 'essay' && (
                <div className="mt-3 flex flex-col gap-3">
                  <div className="flex items-start gap-2 rounded-lg bg-secondary/40 p-3 text-sm text-foreground">
                    <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {a.answerText || 'لم تتم الإجابة'}
                    </p>
                  </div>
                  {a.modelAnswer && (
                    <p className="text-xs text-muted-foreground">
                      الإجابة النموذجية: {a.modelAnswer}
                    </p>
                  )}
                  <ManualGradeInput
                    value={grades[a.answerId] ?? 0}
                    max={a.points}
                    onChange={(v) => setGrade(a.answerId, v, a.points)}
                  />
                </div>
              )}

              {/* File (manual) */}
              {a.questionType === 'file' && (
                <div className="mt-3 flex flex-col gap-3">
                  <div className="rounded-lg bg-secondary/40 p-3 text-sm">
                    {a.fileUrl ? (
                      <a
                        href={a.fileUrl}
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
                  <ManualGradeInput
                    value={grades[a.answerId] ?? 0}
                    max={a.points}
                    onChange={(v) => setGrade(a.answerId, v, a.points)}
                  />
                </div>
              )}
            </li>
          ))}
        </ol>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
          <Button onClick={handleApprove} disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            اعتماد الدرجة
          </Button>
          {manualAnswers.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {manualAnswers.length} سؤال يحتاج تصحيحًا يدويًا
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}

function ScoreStat({
  label,
  value,
  highlight,
}: {
  label: string
  value: number
  highlight?: boolean
}) {
  return (
    <Card
      className={cn(
        'gap-1 p-4 text-center',
        highlight && 'border-primary/40 bg-primary/5',
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
    </Card>
  )
}

function ManualGradeInput({
  value,
  max,
  onChange,
}: {
  value: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <span className="font-medium text-foreground">الدرجة الممنوحة</span>
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        dir="ltr"
        className="h-10 w-24 rounded-lg border border-border bg-secondary/50 px-3 text-center text-sm text-foreground outline-none transition-colors focus:border-primary focus:bg-card"
      />
      <span className="text-muted-foreground">من {max}</span>
    </label>
  )
}
