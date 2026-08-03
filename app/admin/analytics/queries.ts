import 'server-only'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'

/** يرمي استثناءً لو المستخدم ليس أدمن كامل. حرس على كل دالة قراءة. */
async function assertAdmin() {
  if (!(await requireAdmin())) throw new Error('FORBIDDEN')
}

const n = (v: unknown) => Number(v ?? 0)

export type AnalyticsRange = 7 | 30 | 90

export type ViewsKpis = {
  totalViews: number
  uniqueStudents: number
  watchHours: number
  avgCompletion: number
}

export async function getViewsKpis(days: AnalyticsRange): Promise<ViewsKpis> {
  await assertAdmin()

  const rows = await prisma.$queryRaw<
    { total_views: bigint; unique_students: bigint }[]
  >`
    SELECT COUNT(*) AS total_views,
           COUNT(DISTINCT user_id) AS unique_students
    FROM lecture_views
    WHERE created_at >= NOW() - (${days}::int * INTERVAL '1 day')
      AND device <> 'bot'
  `

  const agg = await prisma.$queryRaw<
    { watch_seconds: bigint | null; avg_completion: number | null }[]
  >`
    SELECT SUM(watched_seconds) AS watch_seconds,
           AVG(max_percent)     AS avg_completion
    FROM lesson_watch_progress
    WHERE last_viewed_at >= NOW() - (${days}::int * INTERVAL '1 day')
  `

  return {
    totalViews: n(rows[0]?.total_views),
    uniqueStudents: n(rows[0]?.unique_students),
    watchHours: Math.round(n(agg[0]?.watch_seconds) / 3600),
    avgCompletion: Math.round(n(agg[0]?.avg_completion)),
  }
}

export type TopLecture = {
  lectureId: string
  title: string
  views: number
  uniqueStudents: number
  avgCompletion: number
}

export async function getTopLectures(
  days: AnalyticsRange,
  limit = 10,
): Promise<TopLecture[]> {
  await assertAdmin()

  const rows = await prisma.$queryRaw<
    {
      lecture_id: string
      title: string
      views: bigint
      unique_students: bigint
      avg_completion: number | null
    }[]
  >`
    SELECT lv.lecture_id,
           l.title,
           COUNT(*)                       AS views,
           COUNT(DISTINCT lv.user_id)     AS unique_students,
           COALESCE(AVG(p.max_percent),0) AS avg_completion
    FROM lecture_views lv
    JOIN lectures l ON l.id = lv.lecture_id
    LEFT JOIN lesson_watch_progress p
           ON p.lesson_id = lv.lesson_id AND p.user_id = lv.user_id
    WHERE lv.created_at >= NOW() - (${days}::int * INTERVAL '1 day')
      AND lv.device <> 'bot'
    GROUP BY lv.lecture_id, l.title
    ORDER BY views DESC
    LIMIT ${limit}
  `

  return rows.map((r) => ({
    lectureId: r.lecture_id,
    title: r.title,
    views: n(r.views),
    uniqueStudents: n(r.unique_students),
    avgCompletion: Math.round(n(r.avg_completion)),
  }))
}

export type DeadLecture = { lectureId: string; title: string }

/** محاضرات لم تُشاهَد ولا مرة داخل المدة — محتوى ميّت يحتاج تدخّل. */
export async function getDeadLectures(
  days: AnalyticsRange,
  limit = 10,
): Promise<DeadLecture[]> {
  await assertAdmin()

  const rows = await prisma.$queryRaw<{ id: string; title: string }[]>`
    SELECT l.id, l.title
    FROM lectures l
    WHERE NOT EXISTS (
      SELECT 1 FROM lecture_views lv
      WHERE lv.lecture_id = l.id
        AND lv.created_at >= NOW() - (${days}::int * INTERVAL '1 day')
    )
    ORDER BY l.created_at DESC
    LIMIT ${limit}
  `
  return rows.map((r) => ({ lectureId: r.id, title: r.title }))
}

export type DailyViewsPoint = { label: string; views: number; students: number }

/** سلسلة يومية مع أيام الصفر مُعبَّأة عبر generate_series. */
export async function getDailyViews(
  days: AnalyticsRange,
): Promise<DailyViewsPoint[]> {
  await assertAdmin()

  const rows = await prisma.$queryRaw<
    { day: Date; views: bigint; students: bigint }[]
  >`
    SELECT d.day::date AS day,
           COUNT(lv.id) AS views,
           COUNT(DISTINCT lv.user_id) AS students
    FROM generate_series(
           (NOW() - (${days}::int * INTERVAL '1 day'))::date,
           NOW()::date,
           INTERVAL '1 day'
         ) AS d(day)
    LEFT JOIN lecture_views lv
           ON lv.created_at::date = d.day::date
          AND lv.device <> 'bot'
    GROUP BY d.day
    ORDER BY d.day ASC
  `

  return rows.map((r) => {
    const dt = new Date(r.day)
    return {
      label: `${dt.getDate()}/${dt.getMonth() + 1}`,
      views: n(r.views),
      students: n(r.students),
    }
  })
}

export type DeviceSlice = { device: string; views: number }

export async function getDeviceSplit(
  days: AnalyticsRange,
): Promise<DeviceSlice[]> {
  await assertAdmin()

  const rows = await prisma.$queryRaw<{ device: string; views: bigint }[]>`
    SELECT device, COUNT(*) AS views
    FROM lecture_views
    WHERE created_at >= NOW() - (${days}::int * INTERVAL '1 day')
      AND device <> 'bot'
    GROUP BY device
    ORDER BY views DESC
  `

  const labels: Record<string, string> = {
    desktop: 'كمبيوتر',
    mobile: 'موبايل',
    tablet: 'تابلت',
    unknown: 'غير معروف',
  }
  return rows.map((r) => ({
    device: labels[r.device] ?? r.device,
    views: n(r.views),
  }))
}

export type PeakHour = { hour: number; views: number }

/** توزيع المشاهدات على 24 ساعة بتوقيت القاهرة. */
export async function getPeakHours(days: AnalyticsRange): Promise<PeakHour[]> {
  await assertAdmin()

  const rows = await prisma.$queryRaw<{ hour: number; views: bigint }[]>`
    SELECT h.hour::int AS hour, COUNT(lv.id) AS views
    FROM generate_series(0, 23) AS h(hour)
    LEFT JOIN lecture_views lv
           ON EXTRACT(HOUR FROM lv.created_at AT TIME ZONE 'Africa/Cairo') = h.hour
          AND lv.created_at >= NOW() - (${days}::int * INTERVAL '1 day')
          AND lv.device <> 'bot'
    GROUP BY h.hour
    ORDER BY h.hour ASC
  `
  return rows.map((r) => ({ hour: Number(r.hour), views: n(r.views) }))
}

// ─────────────────────────────────────────────────────────────
// إحصائيات محاضرة واحدة (تُستخدم في /admin/courses/[id])
// ─────────────────────────────────────────────────────────────

export type LectureLessonStat = {
  lessonId: string
  title: string
  views: number
  uniqueStudents: number
  avgCompletion: number
  completedCount: number
}

export async function getLectureLessonStats(
  lectureId: string,
): Promise<LectureLessonStat[]> {
  await assertAdmin()

  const rows = await prisma.$queryRaw<
    {
      lesson_id: string
      title: string
      views: bigint
      unique_students: bigint
      avg_completion: number | null
      completed_count: bigint
    }[]
  >`
    SELECT le.id AS lesson_id,
           le.title,
           COALESCE(v.views, 0)            AS views,
           COALESCE(v.unique_students, 0)  AS unique_students,
           COALESCE(p.avg_completion, 0)   AS avg_completion,
           COALESCE(p.completed_count, 0)  AS completed_count
    FROM lessons le
    LEFT JOIN (
      SELECT lesson_id,
             COUNT(*) AS views,
             COUNT(DISTINCT user_id) AS unique_students
      FROM lecture_views
      WHERE device <> 'bot'
      GROUP BY lesson_id
    ) v ON v.lesson_id = le.id
    LEFT JOIN (
      SELECT lesson_id,
             AVG(max_percent) AS avg_completion,
             COUNT(*) FILTER (WHERE completed) AS completed_count
      FROM lesson_watch_progress
      GROUP BY lesson_id
    ) p ON p.lesson_id = le.id
    WHERE le.lecture_id = ${lectureId}::uuid
    ORDER BY le.sort_order ASC
  `

  return rows.map((r) => ({
    lessonId: r.lesson_id,
    title: r.title,
    views: n(r.views),
    uniqueStudents: n(r.unique_students),
    avgCompletion: Math.round(n(r.avg_completion)),
    completedCount: n(r.completed_count),
  }))
}

export type RetentionPoint = { segment: number; viewers: number; percent: number }

/**
 * منحنى التسريب لدرس واحد: 20 نقطة مضمونة (حتى الأجزاء بصفر مشاهدين).
 * `percent` = نسبة مشاهدي الجزء إلى مشاهدي الجزء الأول ⇒ يبدأ من 100% وينزل.
 */
export async function getLessonRetention(
  lessonId: string,
): Promise<RetentionPoint[]> {
  await assertAdmin()

  const rows = await prisma.$queryRaw<{ segment_index: number; viewers: bigint }[]>`
    SELECT s.i::int AS segment_index, COUNT(sv.user_id) AS viewers
    FROM generate_series(0, 19) AS s(i)
    LEFT JOIN lesson_segment_viewers sv
           ON sv.segment_index = s.i AND sv.lesson_id = ${lessonId}::uuid
    GROUP BY s.i
    ORDER BY s.i ASC
  `

  const first = n(rows[0]?.viewers)
  return rows.map((r) => {
    const viewers = n(r.viewers)
    return {
      segment: Number(r.segment_index),
      viewers,
      percent: first > 0 ? Math.round((viewers / first) * 100) : 0,
    }
  })
}

export type LectureStudentRow = {
  studentId: string | null
  name: string
  lessonsViewed: number
  watchMinutes: number
  avgCompletion: number
  lastViewedAt: string | null
}

export async function getLectureStudents(
  lectureId: string,
  limit = 50,
): Promise<LectureStudentRow[]> {
  await assertAdmin()

  const rows = await prisma.$queryRaw<
    {
      student_id: string | null
      name: string | null
      lessons_viewed: bigint
      watch_seconds: bigint | null
      avg_completion: number | null
      last_viewed_at: Date | null
    }[]
  >`
    SELECT p.student_id,
           st.name,
           COUNT(*)                  AS lessons_viewed,
           SUM(p.watched_seconds)    AS watch_seconds,
           AVG(p.max_percent)        AS avg_completion,
           MAX(p.last_viewed_at)     AS last_viewed_at
    FROM lesson_watch_progress p
    LEFT JOIN students st ON st.id = p.student_id
    WHERE p.lecture_id = ${lectureId}::uuid
    GROUP BY p.student_id, st.name
    ORDER BY watch_seconds DESC NULLS LAST
    LIMIT ${limit}
  `

  return rows.map((r) => ({
    studentId: r.student_id,
    name: r.name ?? 'طالب محذوف',
    lessonsViewed: n(r.lessons_viewed),
    watchMinutes: Math.round(n(r.watch_seconds) / 60),
    avgCompletion: Math.round(n(r.avg_completion)),
    lastViewedAt: r.last_viewed_at ? new Date(r.last_viewed_at).toISOString() : null,
  }))
}
