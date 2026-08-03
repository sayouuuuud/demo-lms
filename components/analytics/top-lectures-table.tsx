import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { TopLecture } from '@/app/admin/analytics/queries'

export function TopLecturesTable({ rows }: { rows: TopLecture[] }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border p-5">
        <h2 className="font-bold text-foreground">أكثر المحاضرات مشاهدة</h2>
        <p className="mt-1 text-sm text-muted-foreground">مرتّبة حسب عدد المشاهدات</p>
      </div>

      {rows.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">
          لا توجد مشاهدات في هذه المدة.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r, i) => (
            <li key={r.lectureId}>
              <Link
                href={`/admin/courses/${r.lectureId}`}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground tabular-nums">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{r.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {r.uniqueStudents.toLocaleString('en-US')} طالب · متوسط إكمال{' '}
                    {r.avgCompletion}%
                  </p>
                </div>
                <span className="shrink-0 text-lg font-bold text-foreground tabular-nums">
                  {r.views.toLocaleString('en-US')}
                </span>
                <ArrowLeft className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
