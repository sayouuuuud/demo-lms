# خطة تنفيذ نظام مشاهدات المحاضرات (Lecture Views Analytics)

> **للموديل المنفّذ: اقرأ هذا الملف بالكامل قبل أن تكتب أي سطر.**
>
> هذه الخطة **حرفية**. كل ملف مكتوب بالكامل. لا تبتكر، لا تستنتج، لا تعيد التسمية،
> لا تضف مكتبات. نفّذ المراحل بالترتيب من M2 إلى M8.
> **المرحلة M1 (قاعدة البيانات) تم تنفيذها بالفعل — لا تعدها.**
>
> القاعدة الذهبية: **لو حاجة مش مكتوبة هنا، متعملهاش.**

---

## 0. ثوابت لا تتغير (احفظها)

هذه الحقائق تم التحقق منها من الكود الفعلي. **لا تخالفها.**

| الحقيقة | القيمة الصحيحة |
|---|---|
| `course.id` في نوع `CourseDetail` | **slug** نصّي، **ليس UUID** |
| `lesson.id` في نوع `Lesson` | **slug** نصّي، **ليس UUID** |
| `lesson.lessonId` في نوع `Lesson` | **UUID الحقيقي** لصف `lessons` — اختياري `?` |
| `/admin/courses/[id]` | الـ `id` هنا **UUID** للمحاضرة (يُرفض غير ذلك) |
| `data.lecture.id` في صفحة الأدمن | **UUID** للمحاضرة |
| `data.lecture.lessons[].id` | **UUID** للدرس |
| عميل Prisma | `import { prisma } from '@/lib/prisma'` |
| الجلسة | `import { auth } from '@/auth'` ثم `const session = await auth()` |
| فحص الأدمن | `import { requireAdmin } from '@/lib/auth-guard'` → ترجع `boolean` |
| صف الطالب | جدول `students`، العمود الرابط `user_id`، والاسم في `name` |
| recharts | مثبّت `3.8.0` |
| موجود بالفعل | `components/ui/chart.tsx`, `table.tsx`, `tabs.tsx`, `select.tsx` |
| **غير موجود** | `components/ui/progress.tsx` → استخدم `div` عادي لأشرطة التقدّم |
| Next.js | 16 — `params` و `cookies()` و `headers()` **يجب** `await` |
| `PageHeader` | **لا يقبل props** ونصوصه ثابتة — **لا تستخدمه** في صفحة الإحصائيات |
| `videoRef` في `video-player.tsx` | موجود فعلًا (سطر 116) باسم `videoRef` |
| `Eye` في `sidebar.tsx` | **غير مستورد** حاليًا — لازم تضيفه (`BarChart3` مستورد بالفعل) |
| صلاحيات الأدمن في `layout.tsx` | الأدمن يستلم `permissions === undefined` ⇒ بلا فلترة |

### تم التحقّق عمليًا من قاعدة البيانات ✅

هذه ليست تخمينات — تم تشغيلها فعليًا على القاعدة المتصلة:

- **كل استعلامات SQL في هذه الخطة (14 استعلامًا) نُفِّذت بنجاح** داخل transaction
  ثم `ROLLBACK` (السكربت: `scripts/V01_smoke.mjs`). صفر أخطاء، صفر بيانات محفوظة.
- **العزل عن الطلاب تم إثباته** (السكربت: `scripts/V01_rls_check.mjs`):
  الدور `authenticated` يفشل في `SELECT` و`INSERT` على الجداول الثلاثة بالخطأ
  `42501 permission denied`. النتيجة: `PASS`.
- تقدر تعيد تشغيل الاثنين في أي وقت للتأكد:
  `node --env-file-if-exists=/vercel/share/.env.project scripts/V01_smoke.mjs`

### قواعد إلزامية

1. **`prisma.$queryRaw` يرجّع `BigInt` لنتائج `COUNT()`.** لفّ كل رقم بـ `Number(...)`
   قبل إرجاعه لأي كومبوننت، وإلا هتقع بخطأ
   `Do not know how to serialize a BigInt`.
2. **ممنوع منعًا تامًا** إنشاء أي Route Handler أو Server Action يقرأ ويرجّع أرقام
   الإحصائيات للطالب. القراءة **فقط** داخل Server Components تحت `/admin` وبعد
   `requireAdmin()`.
3. مسارات الكتابة (`/api/lecture-view`, `/api/lecture-progress`) **ترجّع
   `{ ok: true }` فقط**. لا ترجّع عدّادات ولا نِسب ولا أي رقم.
4. كل الجداول الثلاثة عليها RLS مُفعّل و**صفر policies** و**صفر grants** لـ
   `anon`/`authenticated`. يعني غير مرئية تمامًا للطالب. **لا تضف أي policy.**
5. النصوص الظاهرة للمستخدم **بالعربية**. الاتجاه `dir="rtl"` متكفّل به الـ layout.
6. استخدم توكنز التصميم فقط (`bg-card`, `text-foreground`, `text-muted-foreground`,
   `border-border`, `bg-primary`, `bg-muted`). **ممنوع** `bg-white` / `text-black`.

---

## M1 — قاعدة البيانات ✅ تم بالفعل

**لا تنفّذ هذه المرحلة. هي مكتملة.** مذكورة هنا للمرجعية فقط.

- ملف الـ migration: `prisma/sql/V01_lecture_views.sql`
- مُشغِّل الـ migration: `scripts/V01_run.mjs`
- الموديلات مضافة في `prisma/schema.prisma` وتم `prisma validate` بنجاح.

### الجداول الثلاثة كما هي فعلًا في القاعدة

```
lecture_views
  id                bigserial   PK
  lecture_id        uuid        NOT NULL  → lectures(id)  ON DELETE CASCADE
  lesson_id         uuid        NOT NULL  → lessons(id)   ON DELETE CASCADE
  user_id           uuid        NOT NULL  → auth.users(id) ON DELETE CASCADE
  student_id        uuid        NULL      → students(id)  ON DELETE SET NULL
  device            text        NOT NULL  DEFAULT 'desktop'
                                CHECK IN ('desktop','mobile','tablet','bot','unknown')
  view_bucket       text        NOT NULL
  created_at        timestamptz NOT NULL  DEFAULT now()
  UNIQUE (user_id, lesson_id, view_bucket)   -- اسم القيد: uq_lecture_views_dedupe

lesson_watch_progress
  user_id           uuid        NOT NULL   ┐ PK مركّب
  lesson_id         uuid        NOT NULL   ┘
  lecture_id        uuid        NOT NULL
  student_id        uuid        NULL
  max_percent       smallint    NOT NULL DEFAULT 0   CHECK 0..100
  watched_seconds   integer     NOT NULL DEFAULT 0   CHECK >= 0
  duration_seconds  integer     NOT NULL DEFAULT 0   CHECK >= 0
  views_count       integer     NOT NULL DEFAULT 0
  completed         boolean     NOT NULL DEFAULT false
  first_viewed_at   timestamptz NOT NULL DEFAULT now()
  last_viewed_at    timestamptz NOT NULL DEFAULT now()

lesson_segment_viewers
  lesson_id         uuid        NOT NULL   ┐
  segment_index     smallint    NOT NULL   ├ PK مركّب ثلاثي
  user_id           uuid        NOT NULL   ┘
  created_at        timestamptz NOT NULL DEFAULT now()
  CHECK (segment_index BETWEEN 0 AND 19)
```

### المفاهيم الثلاثة

- **`view_bucket`**: نص يمثّل شبّاك 30 دقيقة، بصيغة `YYYY-MM-DDTHH:MM`
  (مثال `2026-08-03T14:30`). مع القيد الفريد، فتح الطالب لنفس الدرس 50 مرة في
  نصف ساعة = **مشاهدة واحدة**. هذا هو منع التلاعب/التكرار، ومطبَّق في القاعدة
  نفسها لا في الكود.
- **`segment_index`**: كل فيديو مقسوم **20 جزء** (0..19). الجزء رقم `i` يغطّي
  من `i/20` إلى `(i+1)/20` من مدة الفيديو. صف واحد لكل (درس، جزء، مستخدم) ⇒
  `COUNT(*)` لكل جزء = **عدد المشاهدين الفريدين** لذلك الجزء ⇒ منحنى التسريب.
- **`lesson_watch_progress`**: صف واحد لكل (مستخدم، درس) — الحالة المجمّعة.
  `max_percent` لا ينزل أبدًا (نستخدم `GREATEST`).

---

## M2 — طبقة الكتابة: تسجيل المشاهدة عند فتح الدرس

### M2.1 — أنشئ `lib/view-tracking.ts`

ملف مساعد مشترك بين الـ route handlers. **اكتبه حرفيًا:**

```ts
import 'server-only'

/** شبّاك 30 دقيقة يُستخدم كمفتاح منع التكرار: 'YYYY-MM-DDTHH:MM'. */
export function currentViewBucket(now: Date = new Date()): string {
  const y = now.getUTCFullYear()
  const mo = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  const h = String(now.getUTCHours()).padStart(2, '0')
  const halfHour = now.getUTCMinutes() < 30 ? '00' : '30'
  return `${y}-${mo}-${d}T${h}:${halfHour}`
}

/** مصنّف أجهزة صغير — نفس منطق /api/track بدون أي مكتبة. */
export function classifyDevice(
  ua: string,
): 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown' {
  if (!ua) return 'unknown'
  const s = ua.toLowerCase()
  if (/bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly/.test(s)) return 'bot'
  if (/ipad|tablet|(android(?!.*mobile))/.test(s)) return 'tablet'
  if (/mobi|iphone|ipod|android.*mobile|windows phone/.test(s)) return 'mobile'
  return 'desktop'
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v)
}

/** يحصر رقمًا بين حدّين ويرجّع عددًا صحيحًا. مضاد للتلاعب من العميل. */
export function clampInt(v: unknown, min: number, max: number): number {
  const n = Math.floor(Number(v))
  if (!Number.isFinite(n)) return min
  if (n < min) return min
  if (n > max) return max
  return n
}
```

### M2.2 — أنشئ `app/api/lecture-view/route.ts`

يُنادى مرة واحدة عند فتح صفحة الدرس. **اكتبه حرفيًا:**

```ts
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { classifyDevice, currentViewBucket, isUuid } from '@/lib/view-tracking'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// يسجّل مشاهدة واحدة لكل (مستخدم، درس، شبّاك 30 دقيقة).
// منع التكرار يح��ث في القاعدة عبر uq_lecture_views_dedupe، فلا يمكن تضخيم الأرقام.
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
```

### M2.3 — أنشئ `app/api/lecture-progress/route.ts`

يستقبل نبضة كل 30 ثانية أثناء التشغيل. **اكتبه حرفيًا:**

```ts
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
```

> **تنبيه للمنفّذ:** لا تضف `/api/lecture-view` أو `/api/lecture-progress` إلى
> `PUBLIC_PATHS` في `middleware.ts`. **لا تعدّل `middleware.ts` في هذه المرحلة
> إطلاقًا.** بقاؤهما محميّين يعني أن الطالب المسجَّل فقط يستطيع الكتابة، وهذا
> المطلوب بالضبط.

---

## M3 — طبقة العميل: التتبّع في الواجهة

### M3.1 — أنشئ `components/analytics/lecture-view-tracker.tsx`

كومبوننت لا يرسم شيئًا، يبعت beacon واحد لكل درس. **اكتبه حرفيًا:**

```tsx
'use client'

import { useEffect, useRef } from 'react'

// يسجّل فتح الدرس مرة واحدة. منع التكرار الحقيقي في القاعدة (شبّاك 30 دقيقة)،
// وهذا الحرس يمنع الإرسال المتكرر عند إعادة الرندر فقط.
export function LectureViewTracker({ lessonId }: { lessonId?: string }) {
  const sent = useRef<string | null>(null)

  useEffect(() => {
    if (!lessonId) return
    if (sent.current === lessonId) return
    sent.current = lessonId

    const controller = new AbortController()
    fetch('/api/lecture-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId }),
      signal: controller.signal,
      keepalive: true,
    }).catch(() => {})

    return () => controller.abort()
  }, [lessonId])

  return null
}
```

### M3.2 — أنشئ `lib/use-watch-tracker.ts`

الهوك الذي يقيس المشاهدة الفعلية والأجزاء. **اكتبه حرفيًا:**

```ts
'use client'

import { useEffect, useRef } from 'react'

const SEGMENTS = 20 // عدد أجزاء منحنى التسريب — يطابق CHECK (0..19) في القاعدة
const FLUSH_EVERY_MS = 30_000

/**
 * يقيس ثوانى المشاهدة الحقيقية + الأجزاء المُشاهَدة، ويُرسلها كل 30 ثانية.
 * لا يَعُدّ إلا إذا كان الفيديو يعمل فعلًا والتاب ظاهر — فلا أرقام مزيّفة.
 */
export function useWatchTracker({
  videoRef,
  lessonId,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>
  lessonId?: string
}) {
  const watchedRef = useRef(0)
  const segmentsRef = useRef<Set<number>>(new Set())
  const percentRef = useRef(0)
  const durationRef = useRef(0)

  useEffect(() => {
    if (!lessonId) return
    const video = videoRef.current
    if (!video) return

    // إعادة الضبط عند تغيير الدرس حتى لا تُنسب أرقام درس لدرس آخر.
    watchedRef.current = 0
    segmentsRef.current = new Set()
    percentRef.current = 0
    durationRef.current = 0

    // عدّاد الثانية: يزيد فقط أثناء تشغيل حقيقي وتاب ظاهر.
    const ticker = setInterval(() => {
      const v = videoRef.current
      if (!v || v.paused || v.ended) return
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return

      watchedRef.current += 1

      const duration = v.duration
      if (!Number.isFinite(duration) || duration <= 0) return
      durationRef.current = Math.floor(duration)

      const pct = Math.floor((v.currentTime / duration) * 100)
      if (pct > percentRef.current) percentRef.current = Math.min(pct, 100)

      const seg = Math.floor((v.currentTime / duration) * SEGMENTS)
      segmentsRef.current.add(Math.min(Math.max(seg, 0), SEGMENTS - 1))
    }, 1000)

    const flush = (useBeacon: boolean) => {
      const watchedDelta = watchedRef.current
      const segments = Array.from(segmentsRef.current)
      if (watchedDelta === 0 && segments.length === 0) return

      // صفّر أولًا حتى لا تُحتسب نفس الثواني مرتين لو تأخر الطلب.
      watchedRef.current = 0
      segmentsRef.current = new Set()

      const payload = JSON.stringify({
        lessonId,
        percent: percentRef.current,
        watchedDelta,
        durationSeconds: durationRef.current,
        segments,
      })

      // عند إغلاق الصفحة، sendBeacon هو الوحيد الموثوق.
      if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(
          '/api/lecture-progress',
          new Blob([payload], { type: 'application/json' }),
        )
        return
      }

      fetch('/api/lecture-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {})
    }

    const flusher = setInterval(() => flush(false), FLUSH_EVERY_MS)

    const onHide = () => {
      if (document.visibilityState === 'hidden') flush(true)
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', () => flush(true))

    return () => {
      clearInterval(ticker)
      clearInterval(flusher)
      document.removeEventListener('visibilitychange', onHide)
      flush(true) // لا تفقد آخر ثوانٍ عند الانتقال لدرس آخر
    }
  }, [lessonId, videoRef])
}
```

### M3.3 — عدّل `components/student/courses/video-player.tsx`

**تعديلان فقط. لا تلمس أي شيء آخر في هذا الملف.**

**(أ)** أضف الاستيراد بعد آخر استيراد موجود (`import { cn } from '@/lib/utils'`):

```ts
import { useWatchTracker } from '@/lib/use-watch-tracker'
```

**(ب)** غيّر توقيع الكومبوننت لإضافة `lessonId` اختياري، ونادِ الهوك بعد
`const { isHls } = useHls(...)`.

قبل:

```tsx
export function VideoPlayer({
  src,
  poster,
  className,
}: {
  src?: string
  poster?: string
  className?: string
}) {
```

بعد:

```tsx
export function VideoPlayer({
  src,
  poster,
  className,
  lessonId,
}: {
  src?: string
  poster?: string
  className?: string
  /** UUID درس حقيقي. لو غير مُمرَّر، التتبّع مُعطَّل بالكامل. */
  lessonId?: string
}) {
```

ثم بعد هذا السطر الموجود:

```tsx
  const { isHls } = useHls(src, videoRef, retryKey, onFatalHlsError)
```

أضف مباشرة:

```tsx
  // يجب أن يُنادى قبل أي `return` مشروط (قاعدة الهوكس).
  useWatchTracker({ videoRef, lessonId })
```

> **تنبيه:** `useWatchTracker` **لازم** يكون قبل فرع `if (isYoutube)` الذي يعمل
> `return`. لو حطّيته بعده، هتكسر ترتيب الهوكس. مسار يوتيوب لن يُنتج نبضات
> (لا يوجد `<video>` أصلي) وهذا مقبول ومتوقّع.

### M3.4 — عدّل `components/student/courses/lesson-player.tsx`

**تعديلان فقط.**

**(أ)** أضف الاستيراد بعد `import { VideoPlayer } from '@/components/student/courses/video-player'`:

```ts
import { LectureViewTracker } from '@/components/analytics/lecture-view-tracker'
```

**(ب)** ابحث عن هذا السطر بالحرف:

```tsx
                <VideoPlayer key={lesson.id} src={lesson.videoUrl} poster={course.image} />
```

استبدله بـ:

```tsx
                <VideoPlayer
                  key={lesson.id}
                  src={lesson.videoUrl}
                  poster={course.image}
                  lessonId={lesson.lessonId}
                />
```

ثم ابحث عن أول سطر داخل `return (`:

```tsx
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
```

أضف الـ tracker مباشرة بعد فتح الـ `div`:

```tsx
    <div className="flex flex-col gap-6">
      <LectureViewTracker lessonId={lesson.lessonId} />
      {/* Breadcrumb */}
```

> **مهم جدًا:** استخدم `lesson.lessonId` (UUID)، **وليس** `lesson.id` (slug).
> لو استخدمت `lesson.id` كل الكتابات ستُرفَض بصمت لأن التحقّق `isUuid` سيفشل.

### M3.5 — نظّف الـ console.log القديم

في `app/student/courses/[id]/lessons/[lessonId]/page.tsx` احذف هذه السطور
الثلاثة **فقط** (متروكة من debugging سابق):

```ts
  console.log('--- LESSON RENDER ---');
  console.log('Lesson ID:', data.lesson.lessonId);
  console.log('Attachments:', JSON.stringify(data.lesson.attachments, null, 2));
```

لا تغيّر أي شيء آخر في هذا الملف.

---

## M4 — طبقة القراءة (أدمن فقط)

### M4.1 — أنشئ `app/admin/analytics/queries.ts`

كل استعلامات القراءة في ملف واحد. **`import 'server-only'` إلزامي** — هو الذي
يجعل استيراد الملف من كود عميل خطأ بناء لا يُصرَّف.

```ts
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
```

> **ملاحظة `device <> 'bot'`:** موجودة في استعلامات المشاهدات كي لا تُحسب زيارات
> الزواحف. **لا تحذفها.**

---

## M5 — صفحة `/admin/analytics`

### M5.1 — أنشئ `components/analytics/views-kpi-cards.tsx`

```tsx
import { Eye, Users, Clock, TrendingUp } from 'lucide-react'
import type { ViewsKpis } from '@/app/admin/analytics/queries'

const fmt = (v: number) => v.toLocaleString('en-US')

export function ViewsKpiCards({ kpis }: { kpis: ViewsKpis }) {
  const cards = [
    { label: 'إجمالي المشاهدات', value: fmt(kpis.totalViews), icon: Eye },
    { label: 'طلاب فريدون', value: fmt(kpis.uniqueStudents), icon: Users },
    { label: 'ساعات المشاهدة', value: fmt(kpis.watchHours), icon: Clock },
    { label: 'متوسط الإكمال', value: `${kpis.avgCompletion}%`, icon: TrendingUp },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="flex items-center gap-4 rounded-xl border border-border bg-card p-5"
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <c.icon className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm text-muted-foreground">{c.label}</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{c.value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
```

### M5.2 — أنشئ `components/analytics/top-lectures-table.tsx`

```tsx
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { TopLecture } from '@/app/admin/analytics/queries'

export function TopLecturesTable({ rows }: { rows: TopLecture[] }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border p-5">
        <h2 className="font-bold text-foreground">أكثر المحاضرات مشاهدة</h2>
        <p className="mt-1 text-sm text-muted-foreground">مرتّبة حسب عدد المشاهدات</p>
      </div>

      {rows.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">
          لا توجد مشاهدات في هذه المدة.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r, i) => (
            <li key={r.lectureId}>
              <Link
                href={`/admin/courses/${r.lectureId}`}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground tabular-nums">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{r.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {r.uniqueStudents.toLocaleString('en-US')} طالب · متوسط إكمال{' '}
                    {r.avgCompletion}%
                  </p>
                </div>
                <span className="shrink-0 text-lg font-bold text-foreground tabular-nums">
                  {r.views.toLocaleString('en-US')}
                </span>
                <ArrowLeft className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

### M5.3 — أنشئ `components/analytics/retention-chart.tsx`

`'use client'` لأن recharts يحتاج المتصفح.

```tsx
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
                formatter={(value: number, name) =>
                  name === 'percent'
                    ? [`${value}%`, 'نسبة البقاء']
                    : [value, 'مشاهدون']
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
```

### M5.4 — أنشئ `components/analytics/analytics-side-panels.tsx`

بطاقتان: المحتوى الميّت + أوقات الذروة + توزيع الأجهزة.

```tsx
import Link from 'next/link'
import { AlertTriangle, Monitor } from 'lucide-react'
import type {
  DeadLecture,
  DeviceSlice,
  PeakHour,
} from '@/app/admin/analytics/queries'

export function DeadLecturesPanel({ rows }: { rows: DeadLecture[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 text-primary" />
        <h3 className="font-bold text-foreground">محاضرات بدون مشاهدات</h3>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        محتوى لم يفتحه أحد في هذه المدة.
      </p>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          كل المحاضرات لها مشاهدات. ممتاز.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-1">
          {rows.map((r) => (
            <li key={r.lectureId}>
              <Link
                href={`/admin/courses/${r.lectureId}`}
                className="block truncate rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
              >
                {r.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function DeviceSplitPanel({ rows }: { rows: DeviceSlice[] }) {
  const total = rows.reduce((s, r) => s + r.views, 0)

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Monitor className="size-4 text-primary" />
        <h3 className="font-bold text-foreground">الأجهزة</h3>
      </div>

      {total === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">لا توجد بيانات.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {rows.map((r) => {
            const pct = Math.round((r.views / total) * 100)
            return (
              <li key={r.device}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{r.device}</span>
                  <span className="text-muted-foreground tabular-nums">{pct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function PeakHoursPanel({ rows }: { rows: PeakHour[] }) {
  const max = Math.max(...rows.map((r) => r.views), 1)
  const hasData = rows.some((r) => r.views > 0)

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-bold text-foreground">أوقات الذروة</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        توزيع المشاهدات على ساعات اليوم بتوقيت القاهرة.
      </p>

      {!hasData ? (
        <p className="py-8 text-center text-sm text-muted-foreground">لا توجد بيانات.</p>
      ) : (
        <div className="mt-4 flex items-end justify-between gap-1" dir="ltr">
          {rows.map((r) => (
            <div key={r.hour} className="group flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-primary/70 transition-colors group-hover:bg-primary"
                style={{ height: `${Math.max((r.views / max) * 80, 2)}px` }}
                title={`${r.hour}:00 — ${r.views} مشاهدة`}
              />
              {r.hour % 6 === 0 && (
                <span className="text-[10px] text-muted-foreground tabular-nums">{r.hour}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

### M5.5 — أنشئ `components/analytics/range-tabs.tsx`

مبدّل المدة عبر الـ URL (`?days=`) — لا حاجة لأي state.

```tsx
import Link from 'next/link'
import { cn } from '@/lib/utils'

const OPTIONS = [
  { days: 7, label: 'آخر 7 أيام' },
  { days: 30, label: 'آخر 30 يوم' },
  { days: 90, label: 'آخر 90 يوم' },
] as const

export function RangeTabs({ active }: { active: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-muted p-1.5">
      {OPTIONS.map((o) => (
        <Link
          key={o.days}
          href={`/admin/analytics?days=${o.days}`}
          className={cn(
            'rounded-xl px-4 py-1.5 text-sm transition-colors',
            active === o.days
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </Link>
      ))}
    </div>
  )
}
```

### M5.6 — أنشئ `app/admin/analytics/page.tsx`

Server Component. **لا تضف `'use client'`.**

```tsx
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
```

> **⚠️ لا تستخدم `PageHeader` هنا.** كومبوننت
> `components/dashboard/page-header.tsx` **لا يقبل أي props** ونصوصه مكتوبة
> بالكود («الصفحة الرئيسية» + أزرار إضافة كورس/رفع درس). استخدام
> `<PageHeader title=... />` سيفشل في الـ type check ويعرض عنوانًا خاطئًا.
> العنوان في الكود أعلاه مكتوب inline وهو الصحيح.
> **ولا تعدّل `page-header.tsx` نفسه** — تستخدمه صفحات أخرى.

### M5.7 — أضف رابط القائمة الجانبية

في `components/dashboard/sidebar.tsx`:

**(أ)** أضف `Eye` إلى قائمة استيراد `lucide-react` الموجودة في أعلى الملف.

**(ب)** ابحث عن هذا السطر بالحرف داخل مصفوفة `navItems`:

```tsx
      { label: 'التقارير', icon: BarChart3, href: '/admin/reports', resource: 'reports' },
```

أضف بعده مباشرة:

```tsx
      { label: 'إحصائيات المشاهدة', icon: Eye, href: '/admin/analytics', resource: 'reports', adminOnly: true },
```

> **لماذا هذا صحيح ولماذا لا نلمس `middleware.ts`:**
> - `adminOnly: true` ⇒ الـ sidebar يُخفي العنصر عن المساعد (الفلترة في السطر
>   `if (item.adminOnly) return false`). والأدمن الكامل يستلم `permissions ===
>   undefined` من `app/admin/layout.tsx`، فتظهر له القائمة كاملة بلا فلترة.
> - `mapPathToResource('/admin/analytics')` ترجّع `null` لأن `analytics` ليست في
>   `RESOURCE_KEYS` ⇒ الـ middleware يحوّل أي مساعد بعيدًا عن المسار تلقائيًا.
> - الطالب يُحوَّل إلى `/student` من الـ middleware أصلًا.
>
> ⇒ النتيجة: **أدمن فقط**، بصفر تعديلات على `middleware.ts` أو `permissions.ts`.
> **لا تضف `'analytics'` إلى `ResourceKey`. لا تضف المسار إلى `OPEN_ADMIN_PATHS`.**

---

## M6 — قسم الإحصائيات داخل صفحة المحاضرة

### M6.1 — أنشئ `components/analytics/lecture-stats-section.tsx`

Server Component يقرأ ويرسم كل شيء لمحاضرة واحدة.

```tsx
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
```

### M6.2 — عدّل `app/admin/courses/[id]/page.tsx`

الملف حاليًا:

```tsx
import { notFound } from 'next/navigation'
import { getLectureDetailAdmin } from '../actions'
import { getStreamingSettings } from '@/lib/video-actions'
import { AdminLectureDetail } from '@/components/courses/admin-lecture-detail'

export const dynamic = 'force-dynamic'

export default async function AdminLecturePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [data, settings] = await Promise.all([
    getLectureDetailAdmin(id),
    getStreamingSettings(),
  ])
  if (!data) notFound()

  return <AdminLectureDetail lecture={data.lecture} content={data.content} streamingEnabled={settings?.enabled ?? false} />
}
```

اجعله:

```tsx
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
```

> **`data.lecture.id` هو UUID المحاضرة** — هذا ما تتوقعه دوال الاستعلام.
> **لا تمرّر `id` من الـ params ولا `data.lecture.slug`.**
> **لا تعدّل `components/courses/admin-lecture-detail.tsx` إطلاقًا.**

---

## M7 — التحقّق (إلزامي — لا تتخطَّ أي خطوة)

نفّذ بالترتيب. لو فشلت خطوة، أصلحها قبل الانتقال.

### M7.1 — Type check

```bash
cd /vercel/share/v0-project && npx tsc --noEmit
```

يجب أن يمر بلا أخطاء في أي ملف من ملفات هذه الخطة.

### M7.2 — تأكيد عدم تسريب الإحصائيات للطالب

```bash
cd /vercel/share/v0-project && grep -rn "analytics/queries" --include=*.tsx --include=*.ts app components | grep -v "app/admin"
```

**يجب أن يكون المخرج فارغًا.** أي نتيجة = تسريب أرقام لصفحة غير أدمن ⇒ أصلحه فورًا.

### M7.3 — تأكيد استخدام UUID لا slug

```bash
cd /vercel/share/v0-project && grep -n "LectureViewTracker\|lessonId={" components/student/courses/lesson-player.tsx
```

يجب أن يظهر `lesson.lessonId` في الحالتين. لو ظهر `lesson.id` ⇒ خطأ، صحّحه.

### M7.4 — اختبار حيّ في المتصفح

استخدم مهارة `agent-browser`:

1. سجّل دخول كطالب وافتح صفحة درس فيديو.
2. شغّل الفيديو **40 ثانية على الأقل** (لازم تتعدّى نبضة الـ 30 ثانية).
3. في الـ Network يجب أن ترى:
   - `POST /api/lecture-view` → 200 والمخرج `{"ok":true}` بالضبط
   - `POST /api/lecture-progress` → 200 والمخرج `{"ok":true}` بالضبط
   - **لا أي رقم في أي استجابة.** لو وجدت رقمًا ⇒ خطأ فادح، صحّحه.
4. سجّل دخول كأدمن وافتح `/admin/analytics` — تأكّد أن الأرقام ظهرت.
5. افتح `/admin/courses/<uuid>` — تأكّد من ظهور قسم «إحصائيات المشاهدة».
6. خُذ screenshot إلى `/tmp/agent-browser/analytics.png` وافحص التنسيق.

### M7.5 — تأكيد وصول البيانات للقاعدة

```bash
cd /vercel/share/v0-project && set -a && source /vercel/share/.env.project && set +a && node -e "
const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL});
(async()=>{await c.connect();
for (const t of ['lecture_views','lesson_watch_progress','lesson_segment_viewers']) {
  const r = await c.query('select count(*)::int as n from ' + t);
  console.log(t, '=', r.rows[0].n);
}
await c.end()})().catch(e=>{console.log('ERR',e.message);process.exit(1)})
"
```

بعد خطوة M7.4 يجب أن تكون الثلاثة **> 0**.
لو `lecture_views = 0` ⇒ المشكلة في M3.4 (غالبًا slug بدل UUID).
لو `lesson_segment_viewers = 0` ⇒ المشكلة في M3.3 (الهوك غير مُنادى أو
`lessonId` غير مُمرَّر لـ `VideoPlayer`).

---

## M8 — قائمة تحقّق نهائية

ضع ✅ فقط بعد التأكّد الفعلي:

- [ ] `lib/view-tracking.ts` مُنشأ
- [ ] `app/api/lecture-view/route.ts` مُنشأ ويرجّع `{ ok: true }` فقط
- [ ] `app/api/lecture-progress/route.ts` مُنشأ ويحصر ��ل مدخلات العميل
- [ ] `components/analytics/lecture-view-tracker.tsx` مُنشأ
- [ ] `lib/use-watch-tracker.ts` مُنشأ
- [ ] `video-player.tsx`: prop `lessonId` مُضاف + الهوك مُنادى **قبل** فرع يوتيوب
- [ ] `lesson-player.tsx`: يمرّر `lesson.lessonId` (**UUID** لا slug)
- [ ] الـ `console.log` الثلاثة محذوفة من صفحة درس الطالب
- [ ] `app/admin/analytics/queries.ts` مُنشأ، فيه `'server-only'` و `assertAdmin()` على كل دالة
- [ ] كل خمسة كومبوننتس تحت `components/analytics/` مُنشأة
- [ ] `app/admin/analytics/page.tsx` مُنشأ (Server Component)
- [ ] رابط القائمة الجانبية مُضاف مع `adminOnly: true`
- [ ] `components/analytics/lecture-stats-section.tsx` مُنشأ
- [ ] `app/admin/courses/[id]/page.tsx` معدّل ويمرّر `data.lecture.id`
- [ ] `npx tsc --noEmit` نظيف
- [ ] فحص التسريب (M7.2) مخرجه فارغ
- [ ] الاختبار الحيّ (M7.4) ناجح
- [ ] عدّادات الجداول (M7.5) كلها > 0

### ممنوعات صريحة — لا تفعلها أبدًا

| ✗ ممنوع | السبب |
|---|---|
| تعديل `middleware.ts` | الحماية تعمل بالفعل بالتصميم الحالي |
| تعديل `lib/permissions.ts` أو إضافة `'analytics'` لـ `ResourceKey` | سيمنح المساعدين وصولًا |
| تعديل `components/courses/admin-lecture-detail.tsx` | لا داعي، القسم يُضاف من الصفحة |
| إضافة أي RLS policy على الجداول الثلاثة | الإخفاء يعتمد على غياب الـ policies |
| إنشاء route/action يرجّع أرقامًا للطالب | تسريب البيانات |
| استخدام `lesson.id` أو `course.id` كـ UUID | هما slugs — الكتابة ستُرفض بصمت |
| إعادة تشغيل `scripts/V01_run.mjs` | تم بالفعل |
| `npx prisma db push` أو `migrate` | سيحاول تعديل 1400 سطر schema قائم |
| تثبيت أي مكتبة جديدة | كل المطلوب مثبَّت (recharts 3.8.0) |
| إرجاع `BigInt` لأي كومبوننت | خطأ serialize — لُفّ بـ `Number()` |
