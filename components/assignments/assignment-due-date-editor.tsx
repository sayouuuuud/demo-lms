'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, Loader2, Pencil, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { updateAssignmentDueDate } from '@/app/admin/assignments/actions'

/** ياخد ISO ويرجّع YYYY-MM-DD لحقل input[type=date] */
function toDateInput(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function AssignmentDueDateEditor({
  assignmentId,
  dueDate,
  dueDateLabel,
}: {
  assignmentId: string
  dueDate: string | null
  dueDateLabel: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(() => toDateInput(dueDate))

  function handleSave() {
    startTransition(async () => {
      const res = await updateAssignmentDueDate(assignmentId, value || null)
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success('تم تعديل آخر ميعاد')
      setEditing(false)
      router.refresh()
    })
  }

  return (
    <div>
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <CalendarDays className="size-3.5" />
        آخر ميعاد
      </p>

      {editing ? (
        <div className="mt-1 flex items-center gap-1.5">
          <input
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            dir="ltr"
            className="h-8 rounded-lg border border-border bg-secondary/50 px-2 text-sm text-foreground outline-none focus:border-primary"
          />
          <Button size="sm" onClick={handleSave} disabled={isPending} className="h-8 px-3 text-xs">
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : 'حفظ'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setValue(toDateInput(dueDate))
              setEditing(false)
            }}
            disabled={isPending}
            className="h-8 px-2"
            aria-label="إلغاء"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="group mt-0.5 flex items-center gap-1.5 font-bold text-foreground transition-colors hover:text-primary"
        >
          {dueDateLabel}
          <Pencil className="size-3 text-muted-foreground transition-colors group-hover:text-primary" />
        </button>
      )}
    </div>
  )
}
