'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fieldCls } from './field-styles'
import { ScopePicker } from './scope-picker'
import type { ScopeInput } from './scope-picker'
import type { TreeStage } from '@/app/admin/question-bank/actions'
import type { BankListFilters } from '@/app/admin/question-bank/actions'

interface QuestionBankFiltersProps {
  tree:    TreeStage[]
  topics:  { id: string; title: string; count: number }[]
  filters: BankListFilters
  onChange: (patch: Partial<BankListFilters>) => void
  onClear: () => void
}

export function QuestionBankFilters({
  tree, topics, filters, onChange, onClear,
}: QuestionBankFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search ?? '')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced search
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      onChange({ search: searchInput || undefined })
    }, 350)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const handleScopeChange = (val: ScopeInput | null) => {
    onChange({ scopeType: val?.scopeType ?? undefined, scopeId: val?.scopeId ?? undefined })
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="ابحث في نص السؤال..."
          className={cn(fieldCls, 'pr-9')}
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => { setSearchInput(''); onChange({ search: undefined }) }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Row 2: difficulty + type + topic */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filters.difficulty ?? 'all'}
          onChange={e => onChange({ difficulty: e.target.value as BankListFilters['difficulty'] })}
          className={cn(fieldCls, 'w-auto min-w-[120px] py-2')}
        >
          <option value="all">كل الصعوبات</option>
          <option value="easy">سهل</option>
          <option value="medium">متوسط</option>
          <option value="hard">صعب</option>
        </select>

        <select
          value={filters.type ?? 'all'}
          onChange={e => onChange({ type: e.target.value as BankListFilters['type'] })}
          className={cn(fieldCls, 'w-auto min-w-[120px] py-2')}
        >
          <option value="all">كل الأنواع</option>
          <option value="mcq">اختيار متعدد</option>
          <option value="essay">مقالي</option>
          <option value="file">ملف</option>
        </select>

        <select
          value={filters.topicId ?? ''}
          onChange={e => onChange({ topicId: e.target.value || undefined })}
          className={cn(fieldCls, 'w-auto min-w-[130px] py-2')}
        >
          <option value="">كل المواضيع</option>
          {topics.map(t => (
            <option key={t.id} value={t.id}>{t.title} ({t.count})</option>
          ))}
        </select>

        <button
          type="button"
          onClick={onClear}
          className="rounded-xl border border-border bg-secondary/50 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          مسح الفلاتر
        </button>
      </div>

      {/* Scope picker */}
      <ScopePicker
        mode="filter"
        tree={tree}
        value={filters.scopeId ? { scopeType: (filters.scopeType as any) ?? 'stage', scopeId: filters.scopeId } : null}
        onChange={handleScopeChange}
      />
    </div>
  )
}
