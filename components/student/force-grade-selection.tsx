'use client'

import { useState, useTransition } from 'react'
import { setStudentGrade } from '@/app/student/actions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ForceGradeSelection({ stages }: { stages: any[] }) {
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSave() {
    if (!selectedGrade) {
      toast.error('الرجاء اختيار السنة الدراسية')
      return
    }

    startTransition(async () => {
      const res = await setStudentGrade(selectedGrade)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('تم تحديد السنة الدراسية بنجاح')
        router.refresh()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl text-right" dir="rtl">
        <h2 className="mb-2 text-2xl font-bold text-foreground">اختيار السنة الدراسية</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          يرجى تحديد السنة الدراسية الخاصة بك للمتابعة وتخصيص المحتوى لك.
        </p>

        <div className="space-y-3 mb-6">
          {stages.map((stage) => (
            <label
              key={stage.id}
              className={`flex cursor-pointer items-center justify-start gap-3 rounded-xl border p-4 transition-colors ${
                selectedGrade === stage.slug || selectedGrade === stage.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:bg-muted'
              }`}
            >
              <input
                type="radio"
                name="grade"
                value={stage.slug || stage.id}
                checked={selectedGrade === stage.slug || selectedGrade === stage.id}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="size-4"
              />
              <span className="font-medium text-foreground">{stage.title}</span>
            </label>
          ))}
        </div>

        <Button onClick={handleSave} disabled={isPending || !selectedGrade} className="w-full">
          {isPending && <Loader2 className="ml-2 size-4 animate-spin" />}
          تأكيد وحفظ
        </Button>
      </div>
    </div>
  )
}
