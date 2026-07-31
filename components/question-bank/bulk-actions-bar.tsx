'use client'

import { useState, useTransition } from 'react'
import { Archive, Trash2, Tag, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ScopePicker } from './scope-picker'
import type { ScopeInput } from './scope-picker'
import type { TreeStage } from '@/app/admin/question-bank/actions'
import {
  archiveBankQuestions,
  deleteBankQuestions,
  bulkUpdateBankQuestions,
} from '@/app/admin/question-bank/actions'
import type { Difficulty } from '@/lib/question-bank'

interface BulkActionsBarProps {
  selected: Set<string>
  onDone:   () => void
  tree:     TreeStage[]
}

export function BulkActionsBar({ selected, onDone, tree }: BulkActionsBarProps) {
  const ids = [...selected]
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [showScopePicker, setShowScopePicker] = useState(false)
  const [scopes, setScopes] = useState<ScopeInput[]>([])
  const [pending, start]    = useTransition()

  const handleArchive = () =>
    start(async () => {
      const res = await archiveBankQuestions(ids)
      if ('error' in res) { toast.error(res.error); return }
      toast.success(`تم أرشفة ${ids.length} سؤال`)
      onDone()
    })

  const handleDelete = () =>
    start(async () => {
      const res = await deleteBankQuestions(ids)
      if ('error' in res) { toast.error(res.error); return }
      toast.success(res.message ?? 'تم الحذف')
      onDone()
    })

  const handleLinkScope = () => {
    if (!scopes.length) { toast.error('اختر نطاقًا أولًا'); return }
    start(async () => {
      const res = await bulkUpdateBankQuestions({ ids, addScopes: scopes })
      if ('error' in res) { toast.error(res.error); return }
      toast.success(`تم ربط ${res.updated} سؤال بالنطاق`)
      setScopes([])
      setShowScopePicker(false)
      onDone()
    })
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-primary">{ids.length} سؤال محدد</span>

        <div className="flex flex-wrap items-center gap-2 mr-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowScopePicker(v => !v)}
            disabled={pending}
          >
            <Link2 className="size-4" />
            ربط بنطاق
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmArchive(true)}
            disabled={pending}
          >
            <Archive className="size-4" />
            أرشفة
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmDelete(true)}
            disabled={pending}
          >
            <Trash2 className="size-4" />
            حذف
          </Button>
        </div>
      </div>

      {showScopePicker && (
        <div className="mt-3 space-y-2 border-t border-primary/20 pt-3">
          <p className="text-xs text-muted-foreground">اختر النطاق وأضفه، ثم اضغط "ربط" لتطبيقه على كل الأسئلة المحددة.</p>
          <ScopePicker mode="assign" tree={tree} value={scopes} onChange={setScopes} />
          <Button size="sm" onClick={handleLinkScope} disabled={pending || !scopes.length}>
            <Link2 className="size-4" />
            ربط الآن
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        onConfirm={handleArchive}
        title="أرشفة الأسئلة المحددة"
        description={`هتتأرشف ${ids.length} سؤال ولن تظهر في التوليد التلقائي. ممكن تسترجعها لاحقًا.`}
        confirmLabel="أرشفة"
      />
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="حذف الأسئلة المحددة"
        description={`الأسئلة المستخدمة في اختبارات هتتأرشف. الباقي هيتحذف نهائيًا.`}
        confirmLabel="حذف"
      />
    </div>
  )
}
