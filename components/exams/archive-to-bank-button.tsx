'use client'

import { useState, useTransition } from 'react'
import { Library } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { ScopePicker } from '@/components/question-bank/scope-picker'
import type { ScopeInput } from '@/components/question-bank/scope-picker'
import type { TreeStage } from '@/app/admin/question-bank/actions'
import { importQuestionsFromExam } from '@/app/admin/question-bank/actions'

interface ArchiveToBankButtonProps {
  examId: string
  tree:   TreeStage[]
}

export function ArchiveToBankButton({ examId, tree }: ArchiveToBankButtonProps) {
  const [open, setOpen]         = useState(false)
  const [scopes, setScopes]     = useState<ScopeInput[]>([])
  const [pending, start]        = useTransition()

  const handleImport = () =>
    start(async () => {
      const res = await importQuestionsFromExam(examId, scopes)
      if ('error' in res) { toast.error(res.error); return }
      toast.success(`اتضاف ${res.imported} سؤال للبنك${res.skipped ? ` (${res.skipped} متكرر واتّجاهل)` : ''}.`)
      setOpen(false)
    })

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Library className="size-4" />
        أرشفة أسئلة الاختبار في البنك
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="أرشفة أسئلة الاختبار في البنك" className="max-w-lg">
        <div className="space-y-4 text-right">
          <p className="text-sm text-muted-foreground">
            سيتم إضافة الأسئلة الجديدة (غير المستوردة مسبقًا) من هذا الاختبار إلى بنك الأسئلة.
          </p>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">نطاق (اختياري — يتطبّق على كل الأسئلة)</label>
            <ScopePicker mode="assign" tree={tree} value={scopes} onChange={setScopes} />
          </div>

          <div className="flex justify-start gap-2">
            <Button onClick={handleImport} disabled={pending}>
              {pending ? 'جاري الاستيراد...' : 'أرشفة في البنك'}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
