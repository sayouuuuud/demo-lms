import { Eye, Users, Clock, TrendingUp } from 'lucide-react'
import type { ViewsKpis } from '@/app/admin/analytics/queries'

const fmt = (v: number) => v.toLocaleString('en-US')

export function ViewsKpiCards({ kpis }: { kpis: ViewsKpis }) {
  const cards = [
    { label: 'إجمالي المشاهدات', value: fmt(kpis.totalViews), icon: Eye },
    { label: 'طلاب فريدون', value: fmt(kpis.uniqueStudents), icon: Users },
    { label: 'ساعات المشاهدة', value: fmt(kpis.watchHours), icon: Clock },
    { label: 'متوسط الإكمال', value: `${kpis.avgCompletion}%`, icon: TrendingUp },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="flex items-center gap-4 rounded-xl border border-border bg-card p-5"
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <c.icon className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm text-muted-foreground">{c.label}</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{c.value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
