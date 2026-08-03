import {
  getLectureLessonStats,
  getLectureStudents,
  getLessonRetention,
} from '@/app/admin/analytics/queries'
import { RetentionChart } from '@/components/analytics/retention-chart'

export async function LectureStatsSection({ lectureId }: { lectureId: string }) {
  const [lessons, students] = await Promise.all([
    getLectureLessonStats(lectureId),
    getLectureStudents(lectureId),
  ])

  // منحنى التسريب لأكثر درس مشاهدة — الأكثر دلالة.
  const topLesson = lessons.reduce<typeof lessons[number] | null>(
    (best, l) => (!best || l.views > best.views ? l : best),
    null,
  )
  const retention = topLesson ? await getLessonRetention(topLesson.lessonId) : []

  const totalViews = lessons.reduce((s, l) => s + l.views, 0)

  return (
    <section className="mt-8 flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">إحصائيات المشاهدة</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          مرئية للأدمن فقط — الطلاب لا يرون هذه الأرقام.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-5">
          <h3 className="font-bold text-foreground">أداء الدروس</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            إجمالي {totalViews.toLocaleString('en-US')} مشاهدة
          </p>
        </div>

        {lessons.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            لا توجد دروس في هذه المحاضرة.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-right text-xs text-muted-foreground">
                  <th className="p-4 font-medium">الدرس</th>
                  <th className="p-4 font-medium">مشاهدات</th>
                  <th className="p-4 font-medium">طلاب</th>
                  <th className="p-4 font-medium">متوسط الإكمال</th>
                  <th className="p-4 font-medium">أكملوه</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lessons.map((l) => (
                  <tr key={l.lessonId} className="transition-colors hover:bg-muted/40">
                    <td className="max-w-xs truncate p-4 font-medium text-foreground">
                      {l.title}
                    </td>
                    <td className="p-4 text-foreground tabular-nums">
                      {l.views.toLocaleString('en-US')}
                    </td>
                    <td className="p-4 text-muted-foreground tabular-nums">
                      {l.uniqueStudents.toLocaleString('en-US')}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${l.avgCompletion}%` }}
                          />
                        </div>
                        <span className="text-muted-foreground tabular-nums">
                          {l.avgCompletion}%
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground tabular-nums">
                      {l.completedCount.toLocaleString('en-US')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {topLesson && (
        <RetentionChart data={retention} title={`منحنى المشاهدة — ${topLesson.title}`} />
      )}

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-5">
          <h3 className="font-bold text-foreground">الطلاب</h3>
          <p className="mt-1 text-sm text-muted-foreground">مرتّبون حسب وقت المشاهدة</p>
        </div>

        {students.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            لم يشاهد أحد هذه المحاضرة بعد.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-right text-xs text-muted-foreground">
                  <th className="p-4 font-medium">الطالب</th>
                  <th className="p-4 font-medium">دروس</th>
                  <th className="p-4 font-medium">دقائق</th>
                  <th className="p-4 font-medium">متوسط الإكمال</th>
                  <th className="p-4 font-medium">آخر مشاهدة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((s, i) => (
                  <tr
                    key={s.studentId ?? `row-${i}`}
                    className="transition-colors hover:bg-muted/40"
                  >
                    <td className="p-4 font-medium text-foreground">{s.name}</td>
                    <td className="p-4 text-muted-foreground tabular-nums">
                      {s.lessonsViewed}
                    </td>
                    <td className="p-4 text-muted-foreground tabular-nums">
                      {s.watchMinutes.toLocaleString('en-US')}
                    </td>
                    <td className="p-4 text-muted-foreground tabular-nums">
                      {s.avgCompletion}%
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {s.lastViewedAt
                        ? new Date(s.lastViewedAt).toLocaleDateString('ar-EG')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
