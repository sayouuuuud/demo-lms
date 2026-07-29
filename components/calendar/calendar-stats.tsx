'use client'

import { useMemo } from 'react'
import { CalendarDays, GraduationCap, ClipboardList, Star } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useCalendar } from './calendar-context'

export function CalendarStats() {
  const { events, current } = useCalendar()

  const stats = useMemo(() => {
    const y = current.getFullYear()
    const m = current.getMonth()
    const inMonth = events.filter((e) => {
      const [ey, em] = e.date.split('-').map(Number)
      return ey === y && em === m + 1
    })
    return [
      {
        label: 'أحداث هذا الشهر',
        value: inMonth.length,
        icon: CalendarDays,
        color: 'text-primary',
        bg: 'bg-primary/10',
      },
      {
        label: 'المحاضرات',
        value: inMonth.filter((e) => e.type === 'محاضرة').length,
        icon: GraduationCap,
        color: 'text-blue-600',
        bg: 'bg-blue-50 dark:bg-blue-500/10',
      },
      {
        label: 'الاختبارات',
        value: inMonth.filter((e) => e.type === 'اختبار').length,
        icon: ClipboardList,
        color: 'text-rose-600',
        bg: 'bg-rose-50 dark:bg-rose-500/10',
      },
      {
        label: 'أحداث مخصصة',
        value: inMonth.filter((e) => e.type === 'حدث مخصص').length,
        icon: Star,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      },
    ]
  }, [events, current])

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="gap-0 p-5 transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <div
              className={cn(
                'flex size-10 items-center justify-center rounded-xl',
                stat.bg,
              )}
            >
              <stat.icon className={cn('size-5', stat.color)} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground">{stat.value}</span>
          </div>
        </Card>
      ))}
    </div>
  )
}
