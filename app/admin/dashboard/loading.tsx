import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">جاري تحميل لوحة التحكم</span>

      {/* PageHeader */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* StatCards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>

      {/* AnalyticsKpis */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>

      {/* ViewsChart */}
      <Skeleton className="h-72 w-full rounded-lg" />

      {/* Row 1 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <Skeleton className="h-80 w-full rounded-lg xl:col-span-2" />
        <Skeleton className="h-80 w-full rounded-lg xl:col-span-1" />
        <Skeleton className="h-80 w-full rounded-lg xl:col-span-1" />
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <Skeleton className="h-80 w-full rounded-lg xl:col-span-1" />
        <Skeleton className="h-80 w-full rounded-lg xl:col-span-1" />
        <Skeleton className="h-80 w-full rounded-lg xl:col-span-2" />
      </div>

      {/* Row 5 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Skeleton className="h-72 w-full rounded-lg" />
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    </div>
  )
}
