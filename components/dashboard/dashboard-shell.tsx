import { ShieldAlert } from 'lucide-react'

import { PageHeader } from './page-header'
import { StatCards } from './stat-cards'
import { AnalyticsKpis } from './analytics-kpis'
import { RevenueChart } from './revenue-chart'
import { StudentsChart } from './students-chart'
import { ViewsChart } from './views-chart'
import { TopCourses } from './top-courses'
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

      <StatCards stats={data.stats} />

      {/* KPIs: امتحانات + مدفوعات */}
      <AnalyticsKpis stats={data.examStats} />

      {/* المشاهدات والزيارات — ويدجت بعرض كامل تحت الكاردات */}
      <ViewsChart
        data={data.viewsData}
        totalViews={data.totalViews}
        totalVisitors={data.totalVisitors}
      />

      {/* Row 1: الإيرادات الشهرية (wide) + أكثر المحاضرات + نشاط المنصة */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className="xl:col-span-2">
          <RevenueChart data={data.revenueData} />
        </div>
        <div className="xl:col-span-1">
          <TopCourses courses={data.topCourses} />
        </div>
        <div className="xl:col-span-1">
          <ActivityChart data={data.activityData} />
        </div>
      </div>

      {/* Row 2: آخر الرسائل + آخر الطلاب المسجلين + نمو الطلاب (wide) */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className="xl:col-span-1">
          <LatestMessages messages={data.latestMessages} />
        </div>
        <div className="xl:col-span-1">
          <LatestStudents students={data.latestStudents} />
        </div>
        <div className="xl:col-span-2">
          <StudentsChart data={data.studentsData} />
        </div>
      </div>



      {/* Row 5: آخر المدفوعات + آخر المحاضرات */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <LatestPayments payments={data.latestPayments} />
        <LatestLessons lessons={data.latestLessons} />
      </div>
    </div>
  )
}
