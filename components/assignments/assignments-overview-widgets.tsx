'use client'

import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { DonutChart } from '@/components/ui/donut-chart'
import { cn } from '@/lib/utils'
import {
  FileText, Send, TrendingUp, CheckCircle2, AlertCircle, Target,
} from 'lucide-react'
import type { AssignmentsOverview } from '@/app/admin/assignments/actions'
import { statusBadgeClass } from '@/lib/assignments-shared'

// ─── KPI data ────────────────────────────────────────────────────────────────

function buildKpis(o: AssignmentsOverview) {
  return [
    {
      label: 'إجمالي الواجبات',
      value: o.totalAssignments.toString(),
      icon: FileText,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'إجمالي التسليمات',
      value: o.totalSubmissions.toLocaleString('ar-EG'),
      icon: Send,
      color: 'text-chart-2',
      bg: 'bg-chart-2/10',
    },
    {
      label: 'نسبة التسليم العامة',
      value: `${o.overallRate}%`,
      icon: TrendingUp,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'محتاج تصحيح',
      value: o.needsGrading.toLocaleString('ar-EG'),
      icon: CheckCircle2,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
    {
      label: 'متأخر / لم يسلّم',
      value: o.overdueMissing.toLocaleString('ar-EG'),
      icon: AlertCircle,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
    {
      label: 'متوسط الدرجات',
      value: `${o.avgScorePercent}%`,
      icon: Target,
      color: 'text-chart-4',
      bg: 'bg-chart-4/10',
    },
  ]
}

// ─── Donut colors ─────────────────────────────────────────────────────────────

const DONUT_COLORS: Record<string, string> = {
  'مصحّح': 'var(--primary)',
  'تم التسليم': 'var(--chart-2)',
  'متأخر': 'var(--destructive)',
  'لم يسلّم': 'var(--muted-foreground)',
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-background p-3 shadow-sm font-sans text-sm">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-muted-foreground">{payload[0].value}% تسليم</p>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AssignmentsOverviewWidgets({ overview }: { overview: AssignmentsOverview | null }) {
  const [hoveredStage, setHoveredStage] = useState<string | null>(null)

  if (!overview || overview.totalAssignments === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        مفيش بيانات واجبات لسه.
      </Card>
    )
  }

  const kpis = buildKpis(overview)

  const donutData = overview.statusBreakdown
    .filter((s) => s.value > 0)
    .map((s) => ({
      label: s.label,
      value: s.value,
      color: DONUT_COLORS[s.label] ?? 'hsl(var(--muted-foreground))',
    }))

  const totalDonut = donutData.reduce((a, s) => a + s.value, 0)

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        {kpis.map((k) => (
          <Card key={k.label} className="gap-0 p-5 transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <div className={cn('flex size-9 items-center justify-center rounded-xl', k.bg)}>
                <k.icon className={cn('size-4', k.color)} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">{k.value}</p>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Bar chart: نسبة التسليم لكل سنة */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-sans text-base">نسبة التسليم لكل سنة</CardTitle>
            <CardDescription>متوسط نسبة تسليم الواجبات لكل سنة دراسية</CardDescription>
          </CardHeader>
          <CardContent>
            {overview.byStage.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات.</p>
            ) : (
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={overview.byStage}
                    margin={{ top: 4, right: 12, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                    <XAxis
                      dataKey="stageTitle"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontFamily: 'inherit' }}
                      dy={8}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontFamily: 'inherit' }}
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                      orientation="right"
                    />
                    <Tooltip content={<BarTooltip />} cursor={{ fill: 'var(--secondary)', opacity: 0.4 }} />
                    <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={48}>
                      {overview.byStage.map((entry, i) => (
                        <Cell
                          key={entry.stageId}
                          fill={
                            hoveredStage === entry.stageId ? 'var(--primary)' : 'var(--chart-2)'
                          }
                          onMouseEnter={() => setHoveredStage(entry.stageId)}
                          onMouseLeave={() => setHoveredStage(null)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Donut: توزيع الحالات */}
        <Card>
          <CardHeader>
            <CardTitle className="font-sans text-base">توزيع الحالات</CardTitle>
            <CardDescription>توزيع تسليمات الطلاب على الحالات</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {donutData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8">لا توجد تسليمات بعد.</p>
            ) : (
              <>
                <DonutChart
                  data={donutData}
                  size={160}
                  strokeWidth={18}
                  centerContent={
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">{totalDonut}</p>
                      <p className="text-[10px] text-muted-foreground">إجمالي</p>
                    </div>
                  }
                />
                <div className="flex flex-col gap-1.5 w-full">
                  {donutData.map((seg) => (
                    <div key={seg.label} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: seg.color }}
                        />
                        <span className="text-muted-foreground">{seg.label}</span>
                      </div>
                      <span className="font-semibold text-foreground tabular-nums">{seg.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent submissions */}
      {overview.recent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-sans text-base">آخر التسليمات</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {overview.recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="size-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{r.studentName}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.assignmentTitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                        statusBadgeClass[r.status as keyof typeof statusBadgeClass] ??
                          'bg-muted text-muted-foreground',
                      )}
                    >
                      {r.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
