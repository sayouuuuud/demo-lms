import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getLectureDetailAdmin } from '../actions'
import { getStreamingSettings } from '@/lib/video-actions'
import { AdminLectureDetail } from '@/components/courses/admin-lecture-detail'
import { LectureStatsSection } from '@/components/analytics/lecture-stats-section'
import { requireAdmin } from '@/lib/auth-guard'

export const dynamic = 'force-dynamic'

export default async function AdminLecturePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [data, settings, isAdmin] = await Promise.all([
    getLectureDetailAdmin(id),
    getStreamingSettings(),
    requireAdmin(),
  ])
  if (!data) notFound()

  return (
    <>
      <AdminLectureDetail
        lecture={data.lecture}
        content={data.content}
        streamingEnabled={settings?.enabled ?? false}
      />

      {/* الإحصائيات للأدمن الكامل فقط — المساعد لا يراها. */}
      {isAdmin && (
        <Suspense
          fallback={
            <p className="mt-8 text-sm text-muted-foreground">
              جاري تحميل الإحصائيات…
            </p>
          }
        >
          <LectureStatsSection lectureId={data.lecture.id} />
        </Suspense>
      )}
    </>
  )
}
