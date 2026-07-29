'use client'

import { Check, GripVertical, ImageIcon, Plus, Trash2, Type, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImageUploadField } from '@/components/ui/image-upload-field'
import { cn } from '@/lib/utils'
import {
  createOption,
  fileTypeOptions,
  questionTypeMeta,
  type Question,
} from '@/lib/exam-builder'

interface QuestionCardProps {
  question: Question
  index: number
  onChange: (q: Question) => void
  onRemove: () => void
}

const fieldCls =
  'w-full rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card'

export function QuestionCard({ question, index, onChange, onRemove }: QuestionCardProps) {
  const meta = questionTypeMeta[question.type]
  const Icon = meta.icon

  const update = (patch: Partial<Question>) => onChange({ ...question, ...patch })

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="hidden text-muted-foreground sm:block">
            <GripVertical className="size-5" />
          </span>
          <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {index + 1}
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
            <Icon className="size-3.5" />
            {meta.label}
          </span>
        </div>
        <Button
          type="button"
          variant="destructive"
          size="icon-sm"
          onClick={onRemove}
          aria-label="حذف السؤال"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      {/* Question prompt: text or image */}
      <div className="mt-4 text-right">
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="text-sm font-medium text-foreground">صيغة السؤال</label>
          <div className="inline-flex rounded-lg border border-border bg-secondary/50 p-0.5">
            <button
              type="button"
              onClick={() => update({ contentMode: 'text' })}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-colors',
                question.contentMode === 'text'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Type className="size-3.5" />
              نص
            </button>
            <button
              type="button"
              onClick={() => update({ contentMode: 'image' })}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-colors',
                question.contentMode === 'image'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <ImageIcon className="size-3.5" />
              صورة
            </button>
          </div>
        </div>

        {question.contentMode === 'text' ? (
          <textarea
            value={question.text}
            onChange={(e) => update({ text: e.target.value })}
            placeholder="اكتب نص السؤال هنا..."
            rows={2}
            className={cn(fieldCls, 'resize-none leading-relaxed')}
          />
        ) : (
          <div className="space-y-3">
            <ImageUploadField
              value={question.imageUrl}
              onChange={(url) => update({ imageUrl: url })}
              label="صورة السؤال"
              hint="ارفع صورة تحتوي على نص السؤال (مثال: معادلة أو رسم)"
            />
            <textarea
              value={question.text}
              onChange={(e) => update({ text: e.target.value })}
              placeholder="نص توضيحي مختصر للسؤال (اختياري)"
              rows={2}
              className={cn(fieldCls, 'resize-none leading-relaxed')}
            />
          </div>
        )}
      </div>

      {/* Type specific */}
      {question.type === 'mcq' && (
        <McqEditor question={question} update={update} />
      )}
      {question.type === 'essay' && (
        <EssayEditor question={question} update={update} />
      )}
      {question.type === 'file' && (
        <FileEditor question={question} update={update} />
      )}

      {/* Footer settings */}
      <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-border pt-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-foreground">الدرجة</label>
          <input
            type="number"
            min={0}
            value={question.points}
            onChange={(e) => update({ points: Number(e.target.value) || 0 })}
            className="h-9 w-20 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground outline-none focus:border-primary"
            dir="ltr"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={question.required}
            onChange={(e) => update({ required: e.target.checked })}
            className="size-4 accent-primary"
          />
          سؤال إجباري
        </label>
      </div>
    </div>
  )
}

/* ---------- MCQ ---------- */
function McqEditor({
  question,
  update,
}: {
  question: Question
  update: (patch: Partial<Question>) => void
}) {
  const setOptionText = (id: string, text: string) =>
    update({
      options: question.options.map((o) => (o.id === id ? { ...o, text } : o)),
    })

  const removeOption = (id: string) => {
    const options = question.options.filter((o) => o.id !== id)
    update({
      options,
      correctOptionId:
        question.correctOptionId === id ? (options[0]?.id ?? null) : question.correctOptionId,
    })
  }

  const addOption = () => update({ options: [...question.options, createOption()] })

  return (
    <div className="mt-4 space-y-2 text-right">
      <span className="block text-sm font-medium text-foreground">
        الخيارات
        <span className="mr-2 text-xs font-normal text-muted-foreground">
          (اضغط على الدائرة لتحديد الإجابة الصحيحة)
        </span>
      </span>
      {question.options.map((opt, i) => {
        const isCorrect = question.correctOptionId === opt.id
        return (
          <div key={opt.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => update({ correctOptionId: opt.id })}
              aria-label="تحديد كإجابة صحيحة"
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors',
                isCorrect
                  ? 'border-green-600 bg-green-600 text-white'
                  : 'border-border bg-card text-transparent hover:border-green-600',
              )}
            >
              <Check className="size-4" />
            </button>
            <input
              value={opt.text}
              onChange={(e) => setOptionText(opt.id, e.target.value)}
              placeholder={`الخيار ${i + 1}`}
              className={cn(fieldCls, 'py-2')}
            />
            {question.options.length > 2 && (
              <button
                type="button"
                onClick={() => removeOption(opt.id)}
                aria-label="حذف الخيار"
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        )
      })}
      <Button type="button" variant="outline" size="sm" onClick={addOption} className="mt-1">
        <Plus className="size-3.5" />
        إضافة خيار
      </Button>
    </div>
  )
}

/* ---------- Essay ---------- */
function EssayEditor({
  question,
  update,
}: {
  question: Question
  update: (patch: Partial<Question>) => void
}) {
  return (
    <div className="mt-4 space-y-3 text-right">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          الإجابة النموذجية (اختياري)
        </label>
        <textarea
          value={question.modelAnswer}
          onChange={(e) => update({ modelAnswer: e.target.value })}
          placeholder="تساعد المصحح عند مراجعة إجابات الطلاب"
          rows={2}
          className={cn(fieldCls, 'resize-none leading-relaxed')}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-foreground">حد الكلمات (اختياري)</label>
        <input
          type="number"
          min={0}
          value={question.wordLimit ?? ''}
          onChange={(e) =>
            update({ wordLimit: e.target.value ? Number(e.target.value) : null })
          }
          placeholder="بدون حد"
          className="h-9 w-28 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground outline-none focus:border-primary"
          dir="ltr"
        />
      </div>
    </div>
  )
}

/* ---------- File ---------- */
function FileEditor({
  question,
  update,
}: {
  question: Question
  update: (patch: Partial<Question>) => void
}) {
  const toggleType = (value: string) => {
    const exists = question.allowedTypes.includes(value)
    const allowedTypes = exists
      ? question.allowedTypes.filter((t) => t !== value)
      : [...question.allowedTypes, value]
    update({ allowedTypes })
  }

  return (
    <div className="mt-4 space-y-3 text-right">
      <span className="block text-sm font-medium text-foreground">أنواع الملفات المسموحة</span>
      <div className="flex flex-wrap gap-2">
        {fileTypeOptions.map((ft) => {
          const active = question.allowedTypes.includes(ft.value)
          return (
            <button
              key={ft.value}
              type="button"
              onClick={() => toggleType(ft.value)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-secondary/50 text-muted-foreground hover:bg-secondary',
              )}
            >
              {ft.label}
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-foreground">الحد الأقصى للحجم (ميجابايت)</label>
        <input
          type="number"
          min={1}
          value={question.maxFileSizeMb}
          onChange={(e) => update({ maxFileSizeMb: Number(e.target.value) || 1 })}
          className="h-9 w-24 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground outline-none focus:border-primary"
          dir="ltr"
        />
      </div>
    </div>
  )
}
