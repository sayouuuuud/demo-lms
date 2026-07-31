'use client'

import { useState, useTransition } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { QuestionBankFilters } from './question-bank-filters'
import { QuestionBankTable } from './question-bank-table'
import { BulkActionsBar } from './bulk-actions-bar'
import { QuestionEditorModal } from './question-editor-modal'
import { BulkImportModal } from './bulk-import-modal'
import { QuestionBankHeader } from './question-bank-header'
import type { BankStats } from './question-bank-stats'
import { QuestionBankStats } from './question-bank-stats'
import type { TreeStage, BankListFilters } from '@/app/admin/question-bank/actions'
import {
  getBankQuestions,
  archiveBankQuestions,
  restoreBankQuestions,
  deleteBankQuestions,
} from '@/app/admin/question-bank/actions'
import type { BankQuestion } from '@/lib/question-bank'

const DEFAULT_FILTERS: BankListFilters = { page: 1, perPage: 20, archived: false }

interface QuestionBankBrowserProps {
  tree:        TreeStage[]
  topics:      { id: string; title: string; count: number }[]
  stats:       BankStats
  initialData: { items: BankQuestion[]; total: number; page: number; perPage: number }
}

export function QuestionBankBrowser({
  tree, topics, stats: initialStats, initialData,
}: QuestionBankBrowserProps) {
  const [filters, setFilters]     = useState<BankListFilters>(DEFAULT_FILTERS)
  const [data, setData]           = useState(initialData)
  const [stats, setStats]         = useState(initialStats)
  const [selected, setSelected]   = useState<Set<string>>(new Set())
  const [editing, setEditing]     = useState<BankQuestion | null | undefined>(undefined) // undefined=closed, null=new
  const [bulkOpen, setBulkOpen]   = useState(false)
  const [toDelete, setToDelete]   = useState<BankQuestion | null>(null)
  const [loading, start]          = useTransition()

  const activeTab = filters.archived ? 'archived' : 'active'

  const load = (patch: Partial<BankListFilters>) => {
    const next = { ...filters, ...patch }
    setFilters(next)
    setSelected(new Set())
    start(async () => {
      const res = await getBankQuestions(next)
      setData(res)
    })
  }

  const handleTabChange = (tab: string) => {
    load({ ...DEFAULT_FILTERS, archived: tab === 'archived' })
  }

  const handleFiltersChange = (patch: Partial<BankListFilters>) => {
    load({ ...patch, page: 1 })
  }

  const handleClearFilters = () => {
    load({ ...DEFAULT_FILTERS, archived: filters.archived })
  }

  const handleSelect = (id: string, checked: boolean) => {
    setSelected(prev => {
      const next = new Set(prev)
      checked ? next.add(id) : next.delete(id)
      return next
    })
  }

  const handleSelectAll = (checked: boolean) => {
    setSelected(checked ? new Set(data.items.map(q => q.id)) : new Set())
  }

  const handleArchive = (q: BankQuestion) =>
    start(async () => {
      const res = await archiveBankQuestions([q.id])
      if ('error' in res) { toast.error(res.error); return }
      toast.success('تم أرشفة السؤال')
      load({})
    })

  const handleRestore = (q: BankQuestion) =>
    start(async () => {
      const res = await restoreBankQuestions([q.id])
      if ('error' in res) { toast.error(res.error); return }
      toast.success('تم استرجاع السؤال')
      load({})
    })

  const handleDeleteConfirm = async () => {
    if (!toDelete) return
    const res = await deleteBankQuestions([toDelete.id])
    if ('error' in res) { toast.error(res.error); return }
    toast.success(res.message ?? 'تم الحذف')
    setToDelete(null)
    load({})
  }

  const totalPages = Math.max(1, Math.ceil(data.total / (filters.perPage ?? 20)))

  return (
    <div className="space-y-4">
      <QuestionBankHeader
        stats={stats}
        onNew={() => setEditing(null)}
        onBulkImport={() => setBulkOpen(true)}
      />
      <QuestionBankStats stats={stats} />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="active">النشطة ({stats.total - stats.archived})</TabsTrigger>
          <TabsTrigger value="archived">المؤرشفة ({stats.archived})</TabsTrigger>
        </TabsList>
      </Tabs>

      <QuestionBankFilters
        tree={tree}
        topics={topics}
        filters={filters}
        onChange={handleFiltersChange}
        onClear={handleClearFilters}
      />

      {selected.size > 0 && (
        <BulkActionsBar
          selected={selected}
          onDone={() => { setSelected(new Set()); load({}) }}
          tree={tree}
        />
      )}

      <div className={loading ? 'opacity-60 pointer-events-none' : ''}>
        <QuestionBankTable
          questions={data.items}
          selected={selected}
          onSelect={handleSelect}
          onSelectAll={handleSelectAll}
          onEdit={q => setEditing(q)}
          onArchive={handleArchive}
          onRestore={handleRestore}
          onDelete={q => setToDelete(q)}
          showArchived={filters.archived}
        />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!filters.page || filters.page <= 1}
            onClick={() => load({ page: (filters.page ?? 1) - 1 })}
          >
            <ChevronRight className="size-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {filters.page ?? 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={(filters.page ?? 1) >= totalPages}
            onClick={() => load({ page: (filters.page ?? 1) + 1 })}
          >
            <ChevronLeft className="size-4" />
          </Button>
        </div>
      )}

      {/* Editor modal */}
      <QuestionEditorModal
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        onSaved={() => load({})}
        initial={editing ?? null}
        tree={tree}
        topics={topics}
      />

      {/* Bulk import modal */}
      <BulkImportModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onImported={() => { setBulkOpen(false); load({}) }}
        tree={tree}
        topics={topics}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="حذف السؤال"
        description="الأسئلة المستخدمة في اختبارات هتتأرشف. الباقي هيتحذف نهائيًا."
        confirmLabel="حذف"
      />
    </div>
  )
}
