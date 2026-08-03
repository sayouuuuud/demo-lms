'use client'

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import type { RetentionPoint } from '@/app/admin/analytics/queries'

const config = {
  percent: { label: 'نسبة البقاء', color: 'var(--primary)' },
} satisfies ChartConfig

/**
 * منحنى التسريب. المحور الأفقي = موضع الفيديو (0% إلى 100%)،
 * والرأسي = نسبة الطلاب الباقين. الانحدار الحاد = مكان هروب الطلاب.
 */
export function RetentionChart({
  data,
  title = 'منحنى المشاهدة',
}: {
  data: RetentionPoint[]
  title?: string
}) {
  const chartData = data.map((d) => ({
    at: `${d.segment * 5}%`,
    percent: d.percent,
    viewers: d.viewers,
  }))

  const hasData = data.some((d) => d.viewers > 0)

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-bold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        نسبة الطلاب الباقين عبر مدة الفيديو — الانحدار الحاد يعني نقطة هروب.
      </p>

      {!hasData ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          لا توجد بيانات مشاهدة لهذا الدرس بعد.
        </p>
      ) : (
        <div className="mt-4" dir="ltr">
          <ChartContainer config={config} className="h-64 min-h-[256px] w-full">
            <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="at"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={3}
              />
              <YAxis
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                width={44}
                tickFormatter={(v) => `${v}%`}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(l) => `عند ${l} من الفيديو`}
                    formatter={(value) => [`${Number(value)}%`, ' نسبة البقاء']}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="percent"
                stroke="var(--color-percent)"
                fill="var(--color-percent)"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </div>
      )}
    </div>
  )
}
