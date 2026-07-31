'use client'

import { Archive, Edit2, RotateCcw, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { DIFFICULTY_META, SCOPE_TYPE_LABEL, type BankQuestion } from '@/lib/question-bank'

interface QuestionBankTableProps {
  questions:   BankQuestion[]
  selected:    Set<string>
  onSelect:    (id: string, checked: boolean) => void
  onSelectAll: (checked: boolean) => void
  onEdit:      (q: BankQuestion) => void
  onArchive:   (q: BankQuestion) => void
  onRestore?:  (q: BankQuestion) => void
  onDelete:    (q: BankQuestion) => void
  showArchived?: boolean
}

export function QuestionBankTable({
  questions, selected, onSelect, onSelectAll,
  onEdit, onArchive, onRestore, onDelete, showArchived,
}: QuestionBankTableProps) {
  const allSelected = questions.length > 0 && questions.every(q => selected.has(q.id))

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
        <p className="font-semibold text-foreground">مفيش أسئلة بالمواصفات دي</p>
        <p className="text-sm text-muted-foreground">جرّب تغيّر الفلاتر أو امسحها</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="border-b border-border bg-secondary/30">
            <tr>
              <th className="p-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={e => onSelectAll(e.target.checked)}
                  className="size-4 accent-primary"
                />
              </th>
              <th className="px-4 py-3 font-semibold text-foreground">السؤال</th>
              <th className="px-4 py-3 font-semibold text-foreground w-24">النوع</th>
              <th className="px-4 py-3 font-semibold text-foreground w-24">الصعوبة</th>
              <th className="px-4 py-3 font-semibold text-foreground">النطاقات</th>
              <th className="px-4 py-3 font-semibold text-foreground w-20">الاستخدام</th>
              <th className="px-4 py-3 font-semibold text-foreground w-20">النجاح%</th>
              <th className="px-4 py-3 font-semibold text-foreground w-28">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {questions.map(q => (
              <tr key={q.id} className={cn('transition-colors hover:bg-secondary/20', selected.has(q.id) && 'bg-primary/5')}>
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selected.has(q.id)}
                    onChange={e => onSelect(q.id, e.target.checked)}
                    className="size-4 accent-primary"
                  />
                </td>

                <td className="px-4 py-3 max-w-xs">
                  <p className="line-clamp-2 text-foreground">{q.text || '(سؤال بصورة)'}</p>
                  {q.topics.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {q.topics.slice(0, 3).map(t => (
                        <span key={t.id} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                          {t.title}
                        </span>
                      ))}
                      {q.topics.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{q.topics.length - 3}</span>
                      )}
                    </div>
                  )}
                </td>

                <td className="px-4 py-3">
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                    {q.type === 'mcq' ? 'اختيار' : q.type === 'essay' ? 'مقالي' : 'ملف'}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <span className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-medium',
                    DIFFICULTY_META[q.difficulty].badgeCls,
                  )}>
                    {DIFFICULTY_META[q.difficulty].label}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {q.scopes.slice(0, 4).map((s, i) => (
                      <span key={i} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        {SCOPE_TYPE_LABEL[s.scopeType]}: {s.label ?? s.scopeId.slice(0,6)}
                      </span>
                    ))}
                    {q.scopes.length > 4 && (
                      <span className="text-xs text-muted-foreground">+{q.scopes.length - 4}</span>
                    )}
                    {q.scopes.length === 0 && (
                      <span className="text-xs text-yellow-500">بدون نطاق</span>
                    )}
                  </div>
                </td>

                <td className="px-4 py-3 text-center text-muted-foreground">
                  {q.usageCount}
                </td>

                <td className="px-4 py-3 text-center">
                  {q.successRate !== null
                    ? <span className={cn('font-semibold', q.successRate >= 0.75 ? 'text-primary' : q.successRate >= 0.45 ? 'text-yellow-500' : 'text-destructive')}>
                        {Math.round(q.successRate * 100)}%
                      </span>
                    : <span className="text-muted-foreground">—</span>
                  }
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => onEdit(q)} title="تعديل">
                      <Edit2 className="size-3.5" />
                    </Button>
                    {showArchived ? (
                      <Button variant="ghost" size="icon-sm" onClick={() => onRestore?.(q)} title="استرجاع">
                        <RotateCcw className="size-3.5" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon-sm" onClick={() => onArchive(q)} title="أرشفة">
                        <Archive className="size-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon-sm" onClick={() => onDelete(q)} title="حذف" className="text-destructive hover:text-destructive">
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
