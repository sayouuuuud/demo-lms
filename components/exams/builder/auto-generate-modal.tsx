'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { ScopePicker } from '@/components/question-bank/scope-picker'
import type { ScopeInput } from '@/components/question-bank/scope-picker'
import type { TreeStage } from '@/app/admin/question-bank/actions'
import { generateExamQuestions } from '@/app/admin/question-bank/actions'
import { bankQuestionToBuilderQuestion } from '@/lib/question-bank'
import type { Question } from '@/lib/exam-builder'
import { fieldCls } from '@/components/question-bank/field-styles'
import { cn } from '@/lib/utils'

interface AutoGenerateModalProps {
  open:       boolean
  onClose:    () => void
  onGenerate: (questions: Question[]) => void
  excludeIds: string[]
  tree:       TreeStage[]
  topics:     { id: string; title: string }[]
}

export function AutoGenerateModal({
  open, onClose, onGenerate, excludeIds, tree, topics,
}: AutoGenerateModalProps) {
  const [scope, setScope]       = useState<ScopeInput | null>(null)
  const [easy, setEasy]         = useState(0)
  const [medium, setMedium]     = useState(5)
  const [hard, setHard]         = useState(0)
  const [types, setTypes]       = useState<string[]>(['mcq', 'essay', 'file'])
  const [topicId, setTopicId]   = useState('')
  const [generating, start]     = useTransition()

  const total = easy + medium + hard

  const toggleType = (t: string) =>
    setTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  const handleGenerate = () =>
    start(async () => {
      if (!total) { toast.error('حدّد عدد أسئلة على الأقل'); return }
      const res = await generateExamQuestions({
        scope,
        counts: { easy, medium, hard },
        types: types as ('mcq' | 'essay' | 'file')[],
        topicIds: topicId ? [topicId] : [],
        excludeIds,
      })
      if (res.error) { toast.error(res.error); return }

      // Show shortage warnings
      const shortage = res.shortage ?? {}
      const shortageLabels: Record<string, string> = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' }
      const shortParts = Object.entries(shortage)
        .filter(([, n]) => (n as number) > 0)
        .map(([d, n]) => `ناقص ${n} ${shortageLabels[d] ?? d}`)
      if (shortParts.length) {
        toast.warning(`البنك مفيهوش عدد كفاية: ${shortParts.join('، ')}. اتضاف اللي متاح.`)
      }

      const picked = res.questions.map(bankQuestionToBuilderQuestion)
      onGenerate(picked)
      onClose()
    })

  return (
    <Modal open={open} onClose={onClose} title="توليد أسئلة تلقائي" className="max-w-lg">
      <div className="space-y-4 text-right">
        {/* Scope */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">النطاق (اختياري)</label>
          <ScopePicker mode="filter" tree={tree} value={scope} onChange={setScope} />
        </div>

        {/* Counts */}
        <div className="grid grid-cols-3 gap-3">
          {([['easy', 'سهل', easy, setEasy], ['medium', 'متوسط', medium, setMedium], ['hard', 'صعب', hard, setHard]] as const).map(([key, label, val, set]) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
              <input
                type="number"
                min={0}
                value={val}
                onChange={e => (set as (n: number) => void)(Math.max(0, Number(e.target.value)))}
                className={cn(fieldCls, 'py-2')}
                dir="ltr"
              />
            </div>
          ))}
        </div>

        {/* Types */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">أنواع الأسئلة</label>
          <div className="flex gap-2 flex-wrap">
            {([['mcq', 'اختيار متعدد'], ['essay', 'مقالي'], ['file', 'ملف']] as const).map(([t, label]) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleType(t)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                  types.includes(t)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-secondary/50 text-muted-foreground hover:bg-secondary',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Topic */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">موضوع (اختياري)</label>
          <select value={topicId} onChange={e => setTopicId(e.target.value)} className={cn(fieldCls, 'py-2')}>
            <option value="">كل المواضيع</option>
            {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>

        {/* Summary */}
        <p className="rounded-xl bg-primary/5 px-3 py-2 text-sm font-medium text-primary">
          هيتم توليد {total} سؤال
        </p>

        <div className="flex justify-start gap-2">
          <Button onClick={handleGenerate} disabled={generating || !total}>
            {generating ? 'جاري التوليد...' : `توليد ${total} سؤال`}
          </Button>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
        </div>
      </div>
    </Modal>
  )
}
