'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, ListChecks, FileText, Upload, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal, Field } from '@/components/ui/modal'
import { cn } from '@/lib/utils'
import {
  type AdminAssignment,
  type AdminAssignmentQuestion,
  type AssignmentInput,
  type QuestionKind,
  createAssignment,
  updateAssignment,
} from '@/app/admin/courses/actions'

const textareaClass =
  'w-full resize-none rounded-xl border border-border bg-secondary/60 px-4 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card'

const KIND_META: Record<
  QuestionKind,
  { label: string; icon: typeof ListChecks; hint: string }
> = {
  mcq: {
    label: 'اختيار من متعدد',
    icon: ListChecks,
    hint: 'يختار الطالب إجابة واحدة من الخيارات.',
  },
  essay: {
    label: 'سؤال مقالي',
    icon: FileText,
    hint: 'يكتب الطالب إجابته كنص.',
  },
  file: {
    label: 'رفع ملف',
    icon: Upload,
    hint: 'يرفع الطالب ملفاً للإجابة على السؤال.',
  },
}

function newQuestion(kind: QuestionKind = 'mcq'): AdminAssignmentQuestion {
  return {
    kind,
    question: '',
    options: kind === 'mcq' ? ['', ''] : [],
    correctIndex: 0,
  }
}

export function AssignmentEditorModal({
  open,
  onClose,
  lectureId,
  assignment,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  lectureId: string
  /** عند التعديل: الواجب الحالي. عند الإضافة: null */
  assignment: AdminAssignment | null
  onSaved: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'تسليم' | 'اختبار'>('تسليم')
  const [points, setPoints] = useState('10')
  const [dueDate, setDueDate] = useState('')
  const [questions, setQuestions] = useState<AdminAssignmentQuestion[]>([])
  const [saving, setSaving] = useState(false)

  // Sync state whenever the modal opens with a (different) assignment.
  const [syncedFor, setSyncedFor] = useState<string | null>(null)
  const syncKey = open ? (assignment?.id ?? 'new') : null
  if (syncKey !== syncedFor) {
    setSyncedFor(syncKey)
    setTitle(assignment?.title ?? '')
    setDescription(assignment?.description ?? '')
    setType(assignment?.type ?? 'تسليم')
    setPoints(String(assignment?.points ?? 10))
    setDueDate(assignment?.dueDate ?? '')
    setQuestions(
      assignment && assignment.questions.length > 0
        ? assignment.questions.map((q) => ({ ...q, options: [...q.options] }))
        : [newQuestion('mcq')],
    )
  }

  const updateQuestion = (i: number, patch: Partial<AdminAssignmentQuestion>) => {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)),
    )
  }

  const changeKind = (i: number, kind: QuestionKind) => {
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== i) return q
        return {
          ...q,
          kind,
          options: kind === 'mcq' ? (q.options.length ? q.options : ['', '']) : [],
          correctIndex: 0,
        }
      }),
    )
  }

  const setOption = (qi: number, oi: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === qi
          ? { ...q, options: q.options.map((o, j) => (j === oi ? value : o)) }
          : q,
      ),
    )
  }

  const addOption = (qi: number) =>
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === qi ? { ...q, options: [...q.options, ''] } : q,
      ),
    )

  const removeOption = (qi: number, oi: number) =>
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qi) return q
        const options = q.options.filter((_, j) => j !== oi)
        const correctIndex =
          q.correctIndex === oi ? 0 : q.correctIndex > oi ? q.correctIndex - 1 : q.correctIndex
        return { ...q, options, correctIndex }
      }),
    )

  const addQuestion = () => setQuestions((prev) => [...prev, newQuestion('mcq')])
  const removeQuestion = (i: number) =>
    setQuestions((prev) => prev.filter((_, idx) => idx !== i))

  const validate = (): string | null => {
    if (!title.trim()) return 'أدخل عنوان الواجب.'
    if (questions.length === 0) return 'أضف سؤالاً واحداً على الأقل.'
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.question.trim()) return `السؤال رقم ${i + 1} بدون نص.`
      if (q.kind === 'mcq') {
        const filled = q.options.filter((o) => o.trim())
        if (filled.length < 2)
          return `السؤال رقم ${i + 1} يحتاج خيارين على الأقل.`
        if (!q.options[q.correctIndex]?.trim())
          return `حدّد الإجابة الصحيحة للسؤال رقم ${i + 1}.`
      }
    }
    return null
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) return toast.error(err)

    setSaving(true)
    const input: AssignmentInput = {
      title: title.trim(),
      description: description.trim(),
      type,
      points: Number(points) || 0,
      dueDate: dueDate || null,
      questions: questions.map((q) => ({
        ...q,
        question: q.question.trim(),
        options: q.kind === 'mcq' ? q.options.map((o) => o.trim()).filter(Boolean) : [],
      })),
    }
    const res = assignment
      ? await updateAssignment(assignment.id, input)
      : await createAssignment(lectureId, input)
    setSaving(false)

    if (res.error) return toast.error(res.error)
    toast.success(assignment ? 'تم تحديث الواجب' : 'تمت إضافة الواجب')
    onSaved()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={assignment ? 'تعديل الواجب' : 'إضافة واجب جديد'}
      description="الواجب عبارة عن مجموعة أسئلة يجيب عنها الطالب"
      className="max-w-2xl"
    >
      <form onSubmit={handleSave} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Field label="عنوان الواجب">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: واجب على الأعداد المركّبة"
                autoFocus
              />
            </Field>
          </div>
          <Field label="الدرجة">
            <Input
              type="number"
              min={0}
              value={points}
              onChange={(e) => setPoints(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="النوع">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className="w-full rounded-xl border border-border bg-secondary/60 px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:bg-card"
            >
              <option value="تسليم">تسليم</option>
              <option value="اختبار">اختبار</option>
            </select>
          </Field>
          <Field label="تاريخ التسليم (اختياري)">
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              dir="ltr"
            />
          </Field>
        </div>

        <Field label="وصف الواجب (اختياري)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="تعليمات أو نبذة عن الواجب"
            className={textareaClass}
          />
        </Field>

        {/* Questions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">
              الأسئلة ({questions.length})
            </h3>
            <Button type="button" size="sm" variant="outline" onClick={addQuestion}>
              <Plus className="size-4" />
              سؤال
            </Button>
          </div>

          {questions.map((q, qi) => {
            const Icon = KIND_META[q.kind].icon
            return (
              <div
                key={qi}
                className="space-y-3 rounded-xl border border-border bg-secondary/30 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                    {qi + 1}
                  </span>
                  <div className="flex-1">
                    {/* Kind selector */}
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.keys(KIND_META) as QuestionKind[]).map((k) => {
                        const KIcon = KIND_META[k].icon
                        const active = q.kind === k
                        return (
                          <button
                            key={k}
                            type="button"
                            onClick={() => changeKind(qi, k)}
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
                              active
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-card text-muted-foreground hover:text-foreground',
                            )}
                          >
                            <KIcon className="size-3.5" />
                            {KIND_META[k].label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                    onClick={() => removeQuestion(qi)}
                  >
                    <Trash2 className="size-4" />
                    <span className="sr-only">حذف السؤال</span>
                  </Button>
                </div>

                <textarea
                  value={q.question}
                  onChange={(e) => updateQuestion(qi, { question: e.target.value })}
                  rows={2}
                  placeholder="اكتب نص السؤال هنا"
                  className={textareaClass}
                />

                {/* MCQ options */}
                {q.kind === 'mcq' && (
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => {
                      const correct = q.correctIndex === oi
                      return (
                        <div key={oi} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateQuestion(qi, { correctIndex: oi })}
                            title="تحديد كإجابة صحيحة"
                            className={cn(
                              'grid size-7 shrink-0 place-items-center rounded-full border transition-colors',
                              correct
                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                : 'border-border bg-card text-transparent hover:border-emerald-400',
                            )}
                          >
                            <Check className="size-4" />
                          </button>
                          <Input
                            value={opt}
                            onChange={(e) => setOption(qi, oi, e.target.value)}
                            placeholder={`الخيار ${oi + 1}`}
                            className="flex-1"
                          />
                          {q.options.length > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-rose-600"
                              onClick={() => removeOption(qi, oi)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      )
                    })}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-primary"
                      onClick={() => addOption(qi)}
                    >
                      <Plus className="size-3.5" />
                      إضافة خيار
                    </Button>
                  </div>
                )}

                {/* Non-MCQ hint */}
                {q.kind !== 'mcq' && (
                  <p className="flex items-center gap-1.5 rounded-lg bg-card px-3 py-2 text-xs text-muted-foreground">
                    <Icon className="size-3.5" />
                    {KIND_META[q.kind].hint}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex justify-start gap-2 border-t border-border pt-4">
          <Button type="submit" disabled={saving}>
            {saving ? 'جارٍ الحفظ...' : assignment ? 'حفظ التغييرات' : 'إضافة الواجب'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            إلغاء
          </Button>
        </div>
      </form>
    </Modal>
  )
}
