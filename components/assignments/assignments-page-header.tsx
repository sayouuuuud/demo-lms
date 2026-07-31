'use client'

import Link from 'next/link'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { exportToCsv } from '@/lib/export-csv'
import type { AdminAssignmentRow } from '@/app/admin/assignments/actions'

export function AssignmentsPageHeader({ rows }: { rows: AdminAssignmentRow[] }) {
  const handleExport = () => {
    if (rows.length === 0) {
      toast.error('لا توجد بيانات واجبات للتصدير')
      return
    }
    exportToCsv(
      'assignments.csv',
      rows.map((r) => ({
        'كود الواجب': r.code,
        'عنوان الواجب': r.title,
        النوع: r.type,
        'السنة': r.stageTitle,
        'الفرع': r.branchTitle,
        'الكورس': r.courseTitle,
        'المحاضرة': r.lectureTitle,
        'الدرجة الكلية': r.points,
        'آخر ميعاد': r.dueDateLabel,
        'المستحقّون': r.eligible,
        'سلّموا': r.submitted,
        'نسبة التسليم': `${r.submissionRate}%`,
        'متأخرين': r.late,
        'لم يسلّموا': r.missing,
        'محتاج تصحيح': r.submitted - r.graded,
        'متوسط الدرجات': r.avgScorePercent != null ? `${r.avgScorePercent}%` : '—',
      })),
    )
    toast.success('تم تصدير بيانات الواجبات')
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="text-right">
        <h2 className="text-2xl font-bold text-foreground">الواجبات</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          كل الواجبات والتسليمات مقسّمة على السنوات والكورسات.
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          الواجبات بتتضاف من داخل المحاضرة.{' '}
          <Link href="/admin/courses" className="text-primary underline-offset-4 hover:underline">
            الذهاب للكورسات
          </Link>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          className="border-border bg-card text-foreground hover:bg-secondary"
          onClick={handleExport}
        >
          <Download className="size-4" />
          تصدير البيانات
        </Button>
      </div>
    </div>
  )
}
