'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Download, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ReportItem } from '@/app/admin/reports/actions'
import { cn } from '@/lib/utils'

const statusStyles: Record<string, string> = {
  'جاهز': 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400',
  'قيد التجهيز': 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400',
  'فشل': 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400',
}

export function ReportsHistoryTable({ reports }: { reports: ReportItem[] }) {
  return (
    <Card className="p-0 overflow-hidden mt-6">
      <div className="p-5 border-b border-border">
        <h3 className="text-lg font-bold">أرشيف التقارير المصدرة</h3>
        <p className="text-sm text-muted-foreground mt-1">التقارير التي تم إنشاؤها مسبقاً</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground bg-secondary/30">
              <th className="px-5 py-3 font-medium">رقم التقرير</th>
              <th className="px-5 py-3 font-medium">العنوان</th>
              <th className="px-5 py-3 font-medium">النوع</th>
              <th className="px-5 py-3 font-medium">بواسطة</th>
              <th className="px-5 py-3 font-medium">التاريخ</th>
              <th className="px-5 py-3 font-medium">الحالة</th>
              <th className="px-5 py-3 font-medium">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {reports.map((report) => (
              <tr key={report.id} className="transition-colors hover:bg-secondary/40">
                <td className="px-5 py-4 font-mono text-xs">{report.code}</td>
                <td className="px-5 py-4 font-medium text-foreground">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-muted-foreground" />
                    {report.title}
                  </div>
                </td>
                <td className="px-5 py-4">{report.type}</td>
                <td className="px-5 py-4 text-muted-foreground">{report.createdBy}</td>
                <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">{report.createdAt}</td>
                <td className="px-5 py-4">
                  <Badge variant="outline" className={cn('font-medium', statusStyles[report.status])}>
                    {report.status}
                  </Badge>
                </td>
                <td className="px-5 py-4">
                  <Button variant="ghost" size="sm" disabled={report.status !== 'جاهز'}>
                    {report.status === 'جاهز' ? <Download className="size-4" /> : <Clock className="size-4 animate-pulse text-amber-500" />}
                    <span className="sr-only">تحميل</span>
                  </Button>
                </td>
              </tr>
            ))}
            {reports.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">
                  لا توجد تقارير حالياً
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
