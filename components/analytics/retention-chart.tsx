'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { RetentionPoint } from '@/app/admin/analytics/queries'

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
        <div className="mt-4 h-64 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="at"
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                stroke="var(--border)"
                interval={3}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                stroke="var(--border)"
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.75rem',
                  fontSize: 12,
                }}
                labelFormatter={(l) => `عند ${l} من الفيديو`}
                formatter={(value, name) =>
                  name === 'percent'
                    ? [`${Number(value)}%`, 'نسبة البقاء']
                    : [Number(value), 'مشاهدون']
                }
              />
              <Area
                type="monotone"
                dataKey="percent"
                stroke="var(--primary)"
                fill="var(--primary)"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
