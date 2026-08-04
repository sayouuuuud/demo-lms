import { ShieldAlert } from 'lucide-react'

import { PageHeader } from './page-header'
import { StatCards } from './stat-cards'
import { ActionQueue } from './action-queue'
import { ViewsChart } from './views-chart'
import { ActivityChart } from './activity-chart'

import { LatestMessages } from './latest-messages'
import { LatestPayments } from './latest-payments'
import { LatestStudents } from './latest-students'
import { LatestLessons } from './latest-lessons'

export function DashboardShell({ data }: { data?: any }) {
  // `data` ممكن ترجع { success: false, error } من الأكشن لما الصلاحيات ناقصة.
  // الشرط القديم `if (!data)` كان بيفشل لأن الكائن نفسه truthy، فالداشبورد
  // كانت بترسم و data.stats تبقى undefined.
  if (!data || data.error || !data.stats) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card p-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-secondary">
            <ShieldAlert className="size-7 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
            {data?.error || 'مش قادرين نجيب بيانات لوحة التحكم دلوقتي. حاول تاني بعد شوية.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader />

      {/* أول حاجة الأدمن يشوفها: الشغل المستني منه، قبل أي رقم تاريخي. */}
      <ActionQueue queue={data.actionQueue} />

      <StatCards stats={data.stats} />

      {/* المشاهدات والزيارات — ويدجت بعرض كامل */}
      <ViewsChart
        data={data.viewsData}
        totalViews={data.totalViews}
        totalVisitors={data.totalVisitors}
      />

      {/*
        رسم الإيرادات الشهرية ونمو الطلاب اتنقلوا لـ /admin/reports، و"أكثر
        المحاضرات" مكرر هناك في CoursePerformanceTable. الداشبورد بقت feeds
        لحظية + نشاط، والتحليل التاريخي مكانه صفحة التقارير.
      */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ActivityChart data={data.activityData} />
        </div>
        <div className="xl:col-span-1">
          <LatestMessages messages={data.latestMessages} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <LatestPayments payments={data.latestPayments} />
        <LatestStudents students={data.latestStudents} />
        <LatestLessons lessons={data.latestLessons} />
      </div>
    </div>
  )
}
