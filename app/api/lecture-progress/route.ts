import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { clampInt, isUuid } from '@/lib/view-tracking'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// أقصى ثوانٍ مقبولة في نبضة واحدة. النبضة كل 30 ثانية، و90 تسمح
// بسرعة تشغيل 2x مع هامش، وتمنع إرسال أرقام مبالَغ فيها.
const MAX_DELTA_SECONDS = 90

export async function POST(request: Request) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return Response.json({ ok: true })

    let body: {
      lessonId?: string
      percent?: number
      watchedDelta?: number
      durationSeconds?: number
      segments?: number[]
    } = {}
    try {
      body = await request.json()
    } catch {
      return Response.json({ ok: true })
    }

    const lessonId = body.lessonId
    if (!isUuid(lessonId)) return Response.json({ ok: true })

    const lesson = await prisma.lessons.findUnique({
      where: { id: lessonId },
      select: { lecture_id: true },
    })
    if (!lesson) return Response.json({ ok: true })

    // كل رقم من العميل يُحصر server-side. هذا هو الحاجز ضد التلاعب.
    const percent = clampInt(body.percent, 0, 100)
    const delta = clampInt(body.watchedDelta, 0, MAX_DELTA_SECONDS)
    const duration = clampInt(body.durationSeconds, 0, 86400)

    // أجزاء فريدة، داخل 0..19، وبحد أقصى 20 عنصرًا.
    const segments = Array.from(
      new Set(
        (Array.isArray(body.segments) ? body.segments : [])
          .map((s) => clampInt(s, 0, 19))
          .filter((s) => Number.isInteger(s)),
      ),
    ).slice(0, 20)

    if (delta === 0 && percent === 0 && segments.length === 0) {
      return Response.json({ ok: true })
    }

    const student = await prisma.students.findFirst({
      where: { user_id: userId },
      select: { id: true },
    })

    // max_percent و duration_seconds لا ينزلان أبدًا (GREATEST).
    // completed تُحسب من max_percent النهائي، لا من العميل.
    await prisma.$executeRaw`
      INSERT INTO lesson_watch_progress
        (user_id, lesson_id, lecture_id, student_id,
         max_percent, watched_seconds, duration_seconds, completed, last_viewed_at)
      VALUES
        (${userId}::uuid, ${lessonId}::uuid, ${lesson.lecture_id}::uuid,
         ${student?.id ?? null}::uuid,
         ${percent}::smallint, ${delta}, ${duration}, ${percent >= 90}, NOW())
      ON CONFLICT (user_id, lesson_id) DO UPDATE SET
        max_percent      = GREATEST(lesson_watch_progress.max_percent, EXCLUDED.max_percent),
        watched_seconds  = lesson_watch_progress.watched_seconds + EXCLUDED.watched_seconds,
        duration_seconds = GREATEST(lesson_watch_progress.duration_seconds, EXCLUDED.duration_seconds),
        completed        = GREATEST(lesson_watch_progress.max_percent, EXCLUDED.max_percent) >= 90,
        last_viewed_at   = NOW(),
        student_id       = COALESCE(lesson_watch_progress.student_id, EXCLUDED.student_id)
    `

    // خريطة التسريب: صف لكل (درس، جزء، مستخدم) — التكرار يُتجاهل.
    if (segments.length > 0) {
      await prisma.$executeRaw`
        INSERT INTO lesson_segment_viewers (lesson_id, segment_index, user_id)
        SELECT ${lessonId}::uuid, s::smallint, ${userId}::uuid
        FROM UNNEST(${segments}::int[]) AS s
        ON CONFLICT (lesson_id, segment_index, user_id) DO NOTHING
      `
    }

    return Response.json({ ok: true })
  } catch {
    return Response.json({ ok: true })
  }
}
