'use client'

import { useState, useTransition } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { ScopePicker } from '@/components/question-bank/scope-picker'
import type { ScopeInput } from '@/components/question-bank/scope-picker'
import type { TreeStage } from '@/app/admin/question-bank/actions'
import { getBankQuestions } from '@/app/admin/question-bank/actions'
import { bankQuestionToBuilderQuestion, DIFFICULTY_META, type BankQuestion } from '@/lib/question-bank'
import type { Question } from '@/lib/exam-builder'
import { cn } from '@/lib/utils'

interface BankPickerModalProps {
  open:       boolean
  onClose:    () => void
  onPick:     (questions: Question[]) => void
  excludeIds: string[]
  tree:       TreeStage[]
  topics:     { id: string; title: string }[]
}

export function BankPickerModal({
  open, onClose, onPick, excludeIds, tree, topics,
}: BankPickerModalProps) {
  const [scope, setScope]         = useState<ScopeInput | null>(null)
  const [difficulty, setDiff]     = useState('')
  const [type, setType]           = useState('')
  const [search, setSearch]       = useState('')
  const [topicId, setTopicId]     = useState('')
  const [page, setPage]           = useState(1)
  const [results, setResults]     = useState<BankQuestion[]>([])
  const [total, setTotal]         = useState(0)
  const [checked, setChecked]     = useState<Set<string>>(new Set())
  const [loading, start]          = useTransition()

  const PER_PAGE = 10

  const doSearch = (overrides?: Record<string, unknown>) =>
    start(async () => {
      const p = (overrides?.page as number) ?? page
      const res = await getBankQuestions({
        page: p,
        perPage: PER_PAGE,
        search: search || undefined,
        difficulty: ((overrides?.difficulty as any) ?? difficulty) || undefined,
        type:       ((overrides?.type as any) ?? type)             || undefined,
        topicId:    ((overrides?.topicId as string) ?? topicId)   || undefined,
        scopeType:  scope?.scopeType,
        scopeId:    scope?.scopeId,
        archived:   false,
      })
      // Filter out already-added questions client-side
      const filtered = res.items.filter(q => !excludeIds.includes(q.id))
      setResults(filtered)
      setTotal(res.total)
    })

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  const toggleCheck = (id: string) =>
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const handlePick = () => {
    const picked = results.filter(q => checked.has(q.id)).map(bankQuestionToBuilderQuestion)
    onPick(picked)
    setChecked(new Set())
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="إضافة من بنك الأسئلة" className="max-w-3xl">
      <div className="space-y-4 text-right">
        {/* Filters */}
        <div className="space-y-2">
          <ScopePicker mode="filter" tree={tree} value={scope} onChange={setScope} />
          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث في نص السؤال..."
              className="flex-1 rounded-xl border border-border bg-secondary/50 px-3 py-2 text-sm outline-none focus:border-primary min-w-[160px]"
            />
            <select value={difficulty} onChange={e => setDiff(e.target.value)} className="rounded-xl border border-border bg-secondary/50 px-3 py-2 text-sm outline-none">
              <option value="">كل الصعوبات</option>
              <option value="easy">سهل</option>
              <option value="medium">متوسط</option>
              <option value="hard">صعب</option>
            </select>
            <select value={type} onChange={e => setType(e.target.value)} className="rounded-xl border border-border bg-secondary/50 px-3 py-2 text-sm outline-none">
              <option value="">كل الأنواع</option>
              <option value="mcq">اختيار متعدد</option>
              <option value="essay">مقالي</option>
            </select>
            <select value={topicId} onChange={e => setTopicId(e.target.value)} className="rounded-xl border border-border bg-secondary/50 px-3 py-2 text-sm outline-none">
              <option value="">كل المواضيع</option>
              {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            <Button size="sm" onClick={() => { setPage(1); doSearch({ page: 1 }) }} disabled={loading}>بحث</Button>
          </div>
        </div>

        {/* Results */}
        {results.length === 0 && !loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">اضغط "بحث" لعرض الأسئلة</p>
        ) : (
          <div className={cn('space-y-2', loading && 'opacity-60 pointer-events-none')}>
            {results.map(q => (
              <label key={q.id} className="flex items-start gap-3 cursor-pointer rounded-xl border border-border bg-card p-3 transition-colors hover:bg-secondary/30">
                <input
                  type="checkbox"
                  checked={checked.has(q.id)}
                  onChange={() => toggleCheck(q.id)}
                  className="mt-0.5 size-4 accent-primary"
                />
                <div className="flex-1 min-w-0">
                  <p className="line-clamp-2 text-sm text-foreground">{q.text || '(سؤال بصورة)'}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', DIFFICULTY_META[q.difficulty].badgeCls)}>
                      {DIFFICULTY_META[q.difficulty].label}
                    </span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                      {q.type === 'mcq' ? 'اختيار' : q.type === 'essay' ? 'مقالي' : 'ملف'}
                    </span>
                    <span className="text-xs text-muted-foreground">{q.points} درجة</span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => { setPage(p => p - 1); doSearch({ page: page - 1 }) }}>
              <ChevronRight className="size-4" />
            </Button>
            <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => { setPage(p => p + 1); doSearch({ page: page + 1 }) }}>
              <ChevronLeft className="size-4" />
            </Button>
          </div>
        )}

        <div className="flex justify-start gap-2 pt-2 border-t border-border">
          <Button onClick={handlePick} disabled={checked.size === 0}>
            أضف المحدد ({checked.size})
          </Button>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
        </div>
      </div>
    </Modal>
  )
}
