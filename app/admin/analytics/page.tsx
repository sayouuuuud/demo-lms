import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth-guard'
import { ViewsKpiCards } from '@/components/analytics/views-kpi-cards'
import { TopLecturesTable } from '@/components/analytics/top-lectures-table'
import { RangeTabs } from '@/components/analytics/range-tabs'
import {
  DeadLecturesPanel,
  DeviceSplitPanel,
  PeakHoursPanel,
} from '@/components/analytics/analytics-side-panels'
import {
  getDailyViews,
  getDeadLectures,
  getDeviceSplit,
  getPeakHours,
  getTopLectures,
  getViewsKpis,
  type AnalyticsRange,
} from './queries'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'إحصائيات المشاهدة',
  robots: { index: false, follow: false },
}

function parseRange(raw?: string): AnalyticsRange {
  const n = Number(raw)
  return n === 7 || n === 90 ? n : 30
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>
}) {
  // حرس ثانٍ بعد الـ middleware — دفاع في العمق.
  if (!(await requireAdmin())) redirect('/admin/dashboard')

  const { days: rawDays } = await searchParams
  const days = parseRange(rawDays)

  const [kpis, topLectures, deadLectures, daily, devices, peakHours] =
    await Promise.all([
      getViewsKpis(days),
      getTopLectures(days),
      getDeadLectures(days),
      getDailyViews(days),
      getDeviceSplit(days),
      getPeakHours(days),
    ])

  const busiest = daily.reduce(
    (best, p) => (p.views > best.views ? p : best),
    { label: '—', views: 0, students: 0 },
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">إحصائيات المشاهدة</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            مشاهدات المحاضرات ونِسب الإكمال ونقاط هروب الطلاب.
          </p>
        </div>
        <RangeTabs active={days} />
      </div>

      <ViewsKpiCards kpis={kpis} />

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-bold text-foreground">أعلى يوم مشاهدة</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {busiest.views > 0
            ? `${busiest.label} بعدد ${busiest.views.toLocaleString('en-US')} مشاهدة`
            : 'لا توجد مشاهدات في هذه المدة.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TopLecturesTable rows={topLectures} />
        </div>
        <div className="flex flex-col gap-6">
          <DeviceSplitPanel rows={devices} />
          <DeadLecturesPanel rows={deadLectures} />
        </div>
      </div>

      <PeakHoursPanel rows={peakHours} />
    </div>
  )
}
