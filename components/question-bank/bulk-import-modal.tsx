'use client'

import { useMemo, useState, useTransition } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { ScopePicker } from './scope-picker'
import type { ScopeInput } from './scope-picker'
import { fieldCls } from './field-styles'
import { parseBulkQuestions } from '@/lib/question-bank'
import { bulkCreateBankQuestions } from '@/app/admin/question-bank/actions'
import type { TreeStage } from '@/app/admin/question-bank/actions'
import { cn } from '@/lib/utils'

const EXAMPLE = `س: ما هو ناتج 2 + 2؟ | صعوبة: سهل | درجة: 2
- 3
* 4
- 5
- 6

س: اشرح قانون نيوتن الأول.
نوع: مقالي`

interface BulkImportModalProps {
  open:       boolean
  onClose:    () => void
  onImported: () => void
  tree:       TreeStage[]
  topics:     { id: string; title: string }[]
}

export function BulkImportModal({ open, onClose, onImported, tree, topics }: BulkImportModalProps) {
  const [raw, setRaw]               = useState('')
  const [scopes, setScopes]         = useState<ScopeInput[]>([])
  const [topicInput, setTopicInput] = useState('')
  const [selectedTopics, setTopics] = useState<string[]>([])
  const [saving, start]             = useTransition()

  const parsed = useMemo(() => parseBulkQuestions(raw), [raw])
  const valid  = parsed.filter(q => q.errors.length === 0)
  const errored = parsed.filter(q => q.errors.length > 0)

  const addTopic = () => {
    const t = topicInput.trim()
    if (t && !selectedTopics.includes(t)) setTopics(ts => [...ts, t])
    setTopicInput('')
  }

  const handleImport = () =>
    start(async () => {
      if (!valid.length) { toast.error('مفيش أسئلة صالحة للاستيراد'); return }
      const res = await bulkCreateBankQuestions({
        questions: valid,
        scopes,
        topics: selectedTopics,
      })
      if (res.error) { toast.error(res.error); return }
      toast.success(`تم استيراد ${res.created} سؤال${res.failed ? `. فشل ${res.failed}.` : ''}`)
      onImported()
    })

  return (
    <Modal open={open} onClose={onClose} title="إدخال مجمّع" className="max-w-2xl">
      <div className="space-y-4 text-right">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">الصيغة المدعومة</label>
          <pre className={cn('rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed font-mono border border-border')}>
            {EXAMPLE}
          </pre>
          <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground list-disc list-inside">
            <li>كل سؤال يبدأ بـ <code className="rounded bg-secondary px-1">س:</code> أو <code className="rounded bg-secondary px-1">س.</code> أو <code className="rounded bg-secondary px-1">سؤال:</code></li>
            <li>الخيارات: <code className="rounded bg-secondary px-1">-</code> للخيار، <code className="rounded bg-secondary px-1">*</code> للإجابة الصحيحة</li>
            <li>افصل بين الأسئلة بسطر فاضي</li>
            <li>الصعوبة الافتراضية: متوسط — الدرجة الافتراضية: 1</li>
          </ul>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">الأسئلة</label>
          <textarea
            value={raw}
            onChange={e => setRaw(e.target.value)}
            rows={14}
            dir="rtl"
            placeholder="الصق الأسئلة هنا..."
            className={cn(fieldCls, 'resize-y leading-relaxed font-mono')}
          />
        </div>

        {/* Live preview */}
        {parsed.length > 0 && (
          <div className="rounded-xl border border-border bg-secondary/30 p-3 text-xs space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" />
              <span className="font-semibold text-foreground">{valid.length} سؤال صالح</span>
              {errored.length > 0 && (
                <span className="text-destructive font-semibold mr-2">{errored.length} بهم أخطاء</span>
              )}
            </div>
            {errored.slice(0, 10).map((q, i) => (
              <div key={i} className="flex items-start gap-1.5 text-destructive">
                <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
                <span>بلوك {parsed.indexOf(q) + 1}: {q.errors.join(' — ')}</span>
              </div>
            ))}
          </div>
        )}

        {/* Scopes */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">النطاق (يتطبق على كل الأسئلة)</label>
          <ScopePicker mode="assign" tree={tree} value={scopes} onChange={setScopes} />
        </div>

        {/* Topics */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">المواضيع (تتطبق على كل الأسئلة)</label>
          <div className="flex gap-2">
            <input
              value={topicInput}
              onChange={e => setTopicInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTopic() } }}
              placeholder="موضوع ثم Enter..."
              className={cn(fieldCls, 'py-2')}
              list="bulk-topic-suggestions"
            />
            <datalist id="bulk-topic-suggestions">
              {topics.map(t => <option key={t.id} value={t.title} />)}
            </datalist>
            <Button type="button" variant="outline" size="sm" onClick={addTopic}>إضافة</Button>
          </div>
          {selectedTopics.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedTopics.map((t, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs">
                  {t}
                  <button type="button" onClick={() => setTopics(ts => ts.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-start gap-2 pt-2">
          <Button onClick={handleImport} disabled={saving || valid.length === 0}>
            {saving ? 'جاري الاستيراد...' : `استيراد ${valid.length} سؤال`}
          </Button>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
        </div>
      </div>
    </Modal>
  )
}
