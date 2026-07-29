'use client'

import { BookOpen, PlayCircle, Gift, Coins } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useLectures } from './lectures-context'

export function LecturesStats() {
  const { lectures } = useLectures()

  const totalLectures = lectures.length
  const totalLessons = lectures.reduce((sum, l) => sum + l.lessons.length, 0)
  const freeLessons = lectures.reduce(
    (sum, l) => sum + l.lessons.filter((s) => s.isFree).length,
    0,
  )
  const avgPrice =
    totalLectures > 0
      ? Math.round(lectures.reduce((sum, l) => sum + l.price, 0) / totalLectures)
      : 0

  const stats = [
    {
      label: 'إجمالي المحاضرات',
      value: totalLectures.toLocaleString('en-US'),
      icon: BookOpen,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'إجمالي الدروس',
      value: totalLessons.toLocaleString('en-US'),
      icon: PlayCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
    {
      label: 'دروس مجانية',
      value: freeLessons.toLocaleString('en-US'),
      icon: Gift,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
    },
    {
      label: 'متوسط سعر المحاضرة',
      value: `${avgPrice.toLocaleString('en-US')} ج`,
      icon: Coins,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
    },
  ]

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
