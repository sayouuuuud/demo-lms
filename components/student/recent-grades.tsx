import Link from 'next/link'
import { PanelCard } from '@/components/dashboard/panel-card'
import { cn } from '@/lib/utils'
import { Award } from 'lucide-react'
import type { GradeItem } from '@/lib/student-types'

function gradeColor(percent: number) {
  if (percent >= 90) return 'text-emerald-600'
  if (percent >= 75) return 'text-blue-600'
  if (percent >= 60) return 'text-amber-600'
  return 'text-rose-600'
}

export function RecentGrades({ grades = [] }: { grades?: GradeItem[] }) {
  if (grades.length === 0) {
    return (
      <PanelCard title="أحدث الدرجات" action="عرض الكل" actionHref="/student/grades">
        <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-secondary">
            <Award className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">لا توجد درجات مصحّحة بعد</p>
        </div>
      </PanelCard>
    )
  }

  return (
    <PanelCard title="أحدث الدرجات" action="عرض الكل" actionHref="/student/grades">
      <ul className="space-y-0.5">
        {grades.map((grade) => {
          const percent = grade.total > 0 ? Math.round((grade.score / grade.total) * 100) : 0
          return (
            <li
              key={grade.id}
              className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-secondary/60"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {grade.title}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {grade.course} · {grade.date}
                </p>
              </div>
              <div className="shrink-0 text-left">
                <p className={cn('text-sm font-bold', gradeColor(percent))}>
                  {grade.score}/{grade.total}
                </p>
                <p className="text-[11px] text-muted-foreground">{percent}%</p>
              </div>
            </li>
          )
        })}
      </ul>
    </PanelCard>
  )
}
