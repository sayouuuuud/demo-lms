'use client'

import Link from 'next/link'
import { PanelCard } from '@/components/dashboard/panel-card'
import { Clock, AlertCircle, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ScheduleItem } from '@/lib/student-types'

const statusConfig = {
  قريب: { color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertCircle },
  قادم: { color: 'text-primary', bg: 'bg-primary/10', icon: Clock },
}

export function UpcomingExams({ schedule = [] }: { schedule?: ScheduleItem[] }) {
  const exams = schedule.filter((item) => item.type === 'اختبار').slice(0, 4)

  if (exams.length === 0) {
    return (
      <PanelCard title="الاختبارات القادمة" action="عرض الكل" actionHref="/student/exams">
        <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-secondary">
            <ClipboardList className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">لا توجد اختبارات قادمة</p>
        </div>
      </PanelCard>
    )
  }

  return (
    <PanelCard title="الاختبارات القادمة" action="عرض الكل" actionHref="/student/exams">
      <ul className="space-y-0.5">
        {exams.map((exam) => {
          const cfg = statusConfig['قادم']
          const Icon = cfg.icon
          return (
            <li
              key={exam.id}
              className="flex items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-secondary/60"
            >
              <div className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg', cfg.bg)}>
                <Icon className={cn('size-4', cfg.color)} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{exam.title}</p>
                <p className="truncate text-xs text-muted-foreground">{exam.course}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className={cn('text-xs font-semibold', cfg.color)}>
                    {exam.day} · {exam.time}
                  </span>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </PanelCard>
  )
}
