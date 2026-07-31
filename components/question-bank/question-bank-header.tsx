'use client'

import { useState, useTransition } from 'react'
import { Library, Plus, Upload, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { refreshBankQuestionStats, cleanupOrphanScopes } from '@/app/admin/question-bank/actions'
import type { BankStats } from './question-bank-stats'

interface QuestionBankHeaderProps {
  stats: BankStats
  onNew: () => void
  onBulkImport: () => void
}

export function QuestionBankHeader({ stats, onNew, onBulkImport }: QuestionBankHeaderProps) {
  const [refreshing, startRefresh]   = useTransition()
  const [cleaning, startClean]       = useTransition()

  const handleRefresh = () =>
    startRefresh(async () => {
      const res = await refreshBankQuestionStats()
      if ('error' in res) toast.error(res.error as string)
      else toast.success(`تم تحديث إحصائيات ${res.updated} سؤال`)
    })

  const handleCleanup = () =>
    startClean(async () => {
      const res = await cleanupOrphanScopes()
      if ('error' in res) toast.error(res.error as string)
      else toast.success('تم تنظيف الروابط المعطوبة')
    })

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Library className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">بنك الأسئلة</h1>
          <p className="text-sm text-muted-foreground">
            {stats.total} سؤال إجمالي — {stats.archived} مؤرشف
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleCleanup} disabled={cleaning}>
          <Trash2 className="size-4" />
          تنظيف الروابط
        </Button>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
          تحديث الإحصائيات
        </Button>
        <Button variant="outline" size="sm" onClick={onBulkImport}>
          <Upload className="size-4" />
          إدخال مجمّع
        </Button>
        <Button size="sm" onClick={onNew}>
          <Plus className="size-4" />
          سؤال جديد
        </Button>
      </div>
    </div>
  )
}
