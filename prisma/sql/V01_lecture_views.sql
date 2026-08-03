-- ============================================================================
-- V01: نظام مشاهدات المحاضرات + خريطة التسريب (Retention)
-- ----------------------------------------------------------------------------
-- الهدف: تتبّع مشاهدات دروس المحاضرات وإظهار إحصائيات للأدمن فقط.
-- الطلاب لا يرون أي رقم — الجداول دي RLS-enabled بدون أي policy،
-- فالوصول الوحيد ليها هو Prisma بالـ service connection (زي whatsapp_messages).
--
-- التشغيل: node --env-file-if-exists=/vercel/share/.env.project scripts/V01_run.mjs
-- آمن للتشغيل أكثر من مرة (idempotent).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) lecture_views — صف لكل فتح لصفحة درس (الحدث الخام)
-- ----------------------------------------------------------------------------
-- view_bucket: مفتاح تجميع 'YYYY-MM-DD-HH24' بتوقيت القاهرة، بيتولد داخل الـ
-- INSERT في التطبيق. مع الـ UNIQUE index بيمنع تكرار نفس الطالب/الدرس في نفس
-- الساعة (refresh، رجوع للصفحة، prefetch) فالأرقام تفضل حقيقية.
CREATE TABLE IF NOT EXISTS public.lecture_views (
  id          bigserial   PRIMARY KEY,
  lecture_id  uuid        NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  lesson_id   uuid        NOT NULL REFERENCES public.lessons(id)  ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
  student_id  uuid        REFERENCES public.students(id)          ON DELETE SET NULL,
  device      text        NOT NULL DEFAULT 'desktop',
  view_bucket text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lecture_views_device_chk
    CHECK (device IN ('desktop','mobile','tablet','bot','unknown'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_lecture_views_dedupe
  ON public.lecture_views (user_id, lesson_id, view_bucket);

CREATE INDEX IF NOT EXISTS idx_lecture_views_created
  ON public.lecture_views (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lecture_views_lecture
  ON public.lecture_views (lecture_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lecture_views_lesson
  ON public.lecture_views (lesson_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lecture_views_student
  ON public.lecture_views (student_id, created_at DESC);

ALTER TABLE public.lecture_views ENABLE ROW LEVEL SECURITY;
-- مفيش أي policy بشكل مقصود: مفيش قراءة ولا كتابة من الكلاينت خالص.

-- ----------------------------------------------------------------------------
-- 2) lesson_watch_progress — صف واحد مجمّع لكل (طالب، درس)
-- ----------------------------------------------------------------------------
-- ده اللي بيجاوب: الطالب ده وصل لكام % في الدرس ده، وقعد كام ثانية، وكم مرة رجع.
CREATE TABLE IF NOT EXISTS public.lesson_watch_progress (
  user_id          uuid        NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
  lesson_id        uuid        NOT NULL REFERENCES public.lessons(id)  ON DELETE CASCADE,
  lecture_id       uuid        NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  student_id       uuid        REFERENCES public.students(id)          ON DELETE SET NULL,
  max_percent      smallint    NOT NULL DEFAULT 0,
  watched_seconds  integer     NOT NULL DEFAULT 0,
  duration_seconds integer     NOT NULL DEFAULT 0,
  views_count      integer     NOT NULL DEFAULT 0,
  completed        boolean     NOT NULL DEFAULT false,
  first_viewed_at  timestamptz NOT NULL DEFAULT now(),
  last_viewed_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id),
  CONSTRAINT lwp_percent_chk  CHECK (max_percent BETWEEN 0 AND 100),
  CONSTRAINT lwp_seconds_chk  CHECK (watched_seconds >= 0 AND duration_seconds >= 0)
);

CREATE INDEX IF NOT EXISTS idx_lwp_lecture
  ON public.lesson_watch_progress (lecture_id, last_viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_lwp_lesson
  ON public.lesson_watch_progress (lesson_id);
CREATE INDEX IF NOT EXISTS idx_lwp_student
  ON public.lesson_watch_progress (student_id, last_viewed_at DESC);

ALTER TABLE public.lesson_watch_progress ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3) lesson_segment_viewers — خريطة التسريب (Retention)
-- ----------------------------------------------------------------------------
-- كل فيديو مقسوم 20 شريحة (segment 0..19 = كل 5% من المدة).
-- صف واحد لكل (درس، شريحة، طالب) → عدد المشاهدين لكل شريحة = COUNT(*) مباشرة،
-- بدون COUNT(DISTINCT) وبدون تضخيم من إعادة المشاهدة (الـ PK بيمنع التكرار).
CREATE TABLE IF NOT EXISTS public.lesson_segment_viewers (
  lesson_id     uuid        NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  segment_index smallint    NOT NULL,
  user_id       uuid        NOT NULL REFERENCES auth.users(id)     ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lesson_id, segment_index, user_id),
  CONSTRAINT lsv_segment_chk CHECK (segment_index BETWEEN 0 AND 19)
);

CREATE INDEX IF NOT EXISTS idx_lsv_lesson_segment
  ON public.lesson_segment_viewers (lesson_id, segment_index);

ALTER TABLE public.lesson_segment_viewers ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- تنظيف دوري (اختياري — شغّلها يدوي لو الجدول كبر)
-- ----------------------------------------------------------------------------
-- DELETE FROM public.lecture_views WHERE created_at < now() - interval '365 days';
