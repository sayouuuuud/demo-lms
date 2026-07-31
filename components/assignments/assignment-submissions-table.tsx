'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Paperclip, Search } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { gradeAssignmentSubmission } from '@/app/admin/assignments/actions'
import { statusBadgeClass } from '@/lib/assignments-shared'

type Submission = {
  studentId: string
  studentCode: string
  studentName: string
  status: string
  score: number | null
  scorePercent: number | null
  attachmentUrl: string | null
  submittedAt: string | null
}

// ─── Grade input ──────────────────────────────────────────────────────────────

function GradeCell({
  sub,
  points,
  assignmentId,
}: {
  sub: Submission
  points: number
  assignmentId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [localScore, setLocalScore] = useState<string>(sub.score != null ? String(sub.score) : '')

  async function handleSave() {
    const parsed = parseFloat(localScore)
    if (!Number.isFinite(parsed)) {
      toast.error('الدرجة لازم تكون رقم')
      return
    }
    startTransition(async () => {
      const res = await gradeAssignmentSubmission({
        assignmentId,
        studentId: sub.studentId,
        score: parsed,
      })
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`تم حفظ درجة ${sub.studentName}`)
        router.refresh()
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        max={points}
        value={localScore}
        onChange={(e) => setLocalScore(e.target.value)}
        dir="ltr"
        placeholder="—"
        className="h-8 w-20 rounded-lg border border-border bg-secondary/50 px-2 text-center text-sm text-foreground outline-none focus:border-primary"
      />
      <span className="text-xs text-muted-foreground shrink-0">/{points}</span>
      <Button
        size="sm"
        variant="outline"
        onClick={handleSave}
        disabled={isPending}
        className="h-8 px-3 text-xs"
      >
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : 'حفظ'}
      </Button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AssignmentSubmissionsTable({
  assignmentId,
  points,
  submissions,
}: {
  assignmentId: string
  points: number
  submissions: Submission[]
}) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false
      if (query) {
        const q = query.toLowerCase()
        if (!s.studentName.toLowerCase().includes(q) && !s.studentCode.toLowerCase().includes(q))
          return false
      }
      return true
    })
  }, [submissions, query, statusFilter])

  const allStatuses = useMemo(() => {
    const set = new Set(submissions.map((s) => s.status))
    return Array.from(set)
  }, [submissions])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-sans text-base">تسليمات الطلاب</CardTitle>
        <div className="flex flex-wrap gap-3 mt-2">
          {/* Search */}
          <div className="relative flex-1 min-w-40">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="بحث بالاسم أو الكود..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pr-9 bg-secondary/50 h-9"
              dir="rtl"
            />
          </div>
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground outline-none focus:border-primary"
            aria-label="فلتر الحالة"
          >
            <option value="all">كل الحالات</option>
            {allStatuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/30">
                <TableHead className="text-right">الطالب</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right hidden md:table-cell">تسليم في</TableHead>
                <TableHead className="text-right hidden md:table-cell">مرفق</TableHead>
                <TableHead className="text-right">الدرجة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    لا توجد نتائج مطابقة.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((sub) => (
                  <TableRow key={sub.studentId} className="hover:bg-secondary/20">
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-foreground">{sub.studentName}</p>
                        <p className="text-xs text-muted-foreground">{sub.studentCode}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                          statusBadgeClass[sub.status as keyof typeof statusBadgeClass] ??
                            'bg-muted text-muted-foreground',
                        )}
                      >
                        {sub.status}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {sub.submittedAt
                        ? new Date(sub.submittedAt).toLocaleDateString('ar-EG', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {sub.attachmentUrl ? (
                        <a
                          href={sub.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline underline-offset-4"
                        >
                          <Paperclip className="size-3.5" />
                          عرض
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <GradeCell sub={sub} points={points} assignmentId={assignmentId} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
