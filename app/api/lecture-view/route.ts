import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { classifyDevice, currentViewBucket, isUuid } from '@/lib/view-tracking'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// يسجّل مشاهدة واحدة لكل (مستخدم، درس، شبّاك 30 دقيقة).
// منع التكرار يحدث في القاعدة عبر uq_lecture_views_dedupe، فلا يمكن تضخيم الأرقام.
// المخرج دائمًا { ok: true } — لا يُرجَّع أي رقم للعميل مطلقًا.
export async function POST(request: Request) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return Response.json({ ok: true })

    let body: { lessonId?: string } = {}
    try {
      body = await request.json()
    } catch {
      return Response.json({ ok: true })
    }

    const lessonId = body.lessonId
    if (!isUuid(lessonId)) return Response.json({ ok: true })

    // lecture_id يُحسم من القاعدة لا من العميل — العميل لا يُوثَق به.
    const lesson = await prisma.lessons.findUnique({
      where: { id: lessonId },
      select: { lecture_id: true },
    })
    if (!lesson) return Response.json({ ok: true })

    const student = await prisma.students.findFirst({
      where: { user_id: userId },
      select: { id: true },
    })

    const device = classifyDevice(request.headers.get('user-agent') || '')
    const bucket = currentViewBucket()

    // ON CONFLICT DO NOTHING ⇒ inserted = 0 لو المشاهدة مكرّرة في نفس الشبّاك.
    const inserted = await prisma.$executeRaw`
      INSERT INTO lecture_views
        (lecture_id, lesson_id, user_id, student_id, device, view_bucket)
      VALUES
        (${lesson.lecture_id}::uuid, ${lessonId}::uuid, ${userId}::uuid,
         ${student?.id ?? null}::uuid, ${device}, ${bucket})
      ON CONFLICT (user_id, lesson_id, view_bucket) DO NOTHING
    `

    // views_count يزيد فقط مع مشاهدة جديدة فعليًا.
    if (inserted === 1) {
      await prisma.$executeRaw`
        INSERT INTO lesson_watch_progress
          (user_id, lesson_id, lecture_id, student_id, views_count, last_viewed_at)
        VALUES
          (${userId}::uuid, ${lessonId}::uuid, ${lesson.lecture_id}::uuid,
           ${student?.id ?? null}::uuid, 1, NOW())
        ON CONFLICT (user_id, lesson_id) DO UPDATE SET
          views_count    = lesson_watch_progress.views_count + 1,
          last_viewed_at = NOW(),
          student_id     = COALESCE(lesson_watch_progress.student_id, EXCLUDED.student_id)
      `
    }

    return Response.json({ ok: true })
  } catch {
    // التتبّع لا يجوز أن يكسر صفحة أبدًا.
    return Response.json({ ok: true })
  }
}
