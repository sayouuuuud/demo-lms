import type { LucideIcon } from 'lucide-react'
import { Wallet, BookOpen, Users, ShoppingCart, TrendingUp, TrendingDown } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// Formats a signed percentage like "+12.5%" / "-3%".
function pct(n: number) {
  const sign = n > 0 ? '+' : ''
  return `${sign}${n}%`
}

type Stat = {
  label: string
  value: string
  unit?: string
  change: string
  up: boolean
  neutral?: boolean
  sub: string
  detail?: string
  icon: LucideIcon
  color: string
  bg: string
}

export function StatCards({ stats: inputStats }: { stats?: any }) {
  const changes = inputStats?.changes || {}
  const coursesThisMonth = changes.coursesThisMonth || 0

  const stats: Stat[] = [
    {
      label: 'إجمالي الإيرادات',
      value: (inputStats?.totalRevenue || 0).toLocaleString(),
      unit: 'ج.م',
      change: pct(changes.revenue ?? 0),
      up: (changes.revenue ?? 0) >= 0,
      sub: 'عن الشهر السابق',
      icon: Wallet,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
    {
      label: 'المبيعات اليوم',
      value: (inputStats?.salesToday || 0).toLocaleString(),
      unit: 'طلب',
      change: pct(changes.sales ?? 0),
      up: (changes.sales ?? 0) >= 0,
      sub: 'عن أمس',
      icon: ShoppingCart,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
    },
    {
      label: 'إجمالي الطلاب',
      value: (inputStats?.totalStudents || 0).toLocaleString(),
      change: pct(changes.students ?? 0),
      up: (changes.students ?? 0) >= 0,
      sub: 'عن الشهر السابق',
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      // المحاضرات والدروس والكورسات كانوا 3 كاردات منفصلة كل واحد بيقول
      // "إجمالي / حقيقي" ومفيش فيهم أي إشارة اتجاه. اتلموا في كارد واحد
      // والتفصيل بقى في السطر التحت.
      label: 'المحتوى',
      value: (inputStats?.totalCourses || 0).toLocaleString(),
      unit: 'محاضرة',
      change: coursesThisMonth > 0 ? `+${coursesThisMonth}` : 'مستقر',
      up: true,
      neutral: coursesThisMonth === 0,
      sub: coursesThisMonth > 0 ? 'هذا الشهر' : 'مفيش جديد الشهر ده',
      detail: `${(inputStats?.totalLessons || 0).toLocaleString()} درس · ${(inputStats?.totalMonthlyCourses || 0).toLocaleString()} كورس`,
      icon: BookOpen,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
    },
  ]

  return (
    <div className="ns-stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card
          key={stat.label}
          className="ns-card gap-0 p-5"
        >
          <div className="flex items-start justify-between">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <div
              className={cn(
                'ns-icon flex size-10 items-center justify-center rounded-xl',
                stat.bg,
              )}
            >
              <stat.icon className={cn('size-5', stat.color)} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground">{stat.value}</span>
            {stat.unit && (
              <span className="text-sm font-medium text-muted-foreground">
                {stat.unit}
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                'flex items-center gap-0.5 font-semibold',
                stat.neutral
                  ? 'text-muted-foreground'
                  : stat.up
                    ? 'text-emerald-600'
                    : 'text-rose-600',
              )}
            >
              {!stat.neutral &&
                (stat.up ? (
                  <TrendingUp className="size-3.5" />
                ) : (
                  <TrendingDown className="size-3.5" />
                ))}
              {stat.change}
            </span>
            <span className="text-muted-foreground">{stat.sub}</span>
          </div>
          {stat.detail && (
            <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
              {stat.detail}
            </p>
          )}
        </Card>
      ))}
    </div>
  )
}
