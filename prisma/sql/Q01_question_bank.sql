-- Q01: بنك الأسئلة الاحترافي
-- التشغيل: يدوي من صاحب المشروع على الـ live DB. مرة واحدة.
-- آمن للتشغيل مرتين (idempotent).

-- 1) أسئلة البنك -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.question_bank_questions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text   text        NOT NULL DEFAULT '',
  question_type   text        NOT NULL DEFAULT 'mcq',
  content_mode    text        NOT NULL DEFAULT 'text',
  image_url       text,
  options         jsonb       NOT NULL DEFAULT '[]'::jsonb,
  correct_answer  text,
  model_answer    text,
  points          integer     NOT NULL DEFAULT 1,
  difficulty      text        NOT NULL DEFAULT 'medium',
  auto_difficulty text,
  usage_count     integer     NOT NULL DEFAULT 0,
  last_used_at    timestamptz,
  answers_count   integer     NOT NULL DEFAULT 0,
  correct_count   integer     NOT NULL DEFAULT 0,
  notes           text,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  archived_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT qbq_type_chk       CHECK (question_type IN ('mcq','essay','file')),
  CONSTRAINT qbq_mode_chk       CHECK (content_mode IN ('text','image')),
  CONSTRAINT qbq_difficulty_chk CHECK (difficulty IN ('easy','medium','hard')),
  CONSTRAINT qbq_auto_diff_chk  CHECK (auto_difficulty IS NULL OR auto_difficulty IN ('easy','medium','hard')),
  CONSTRAINT qbq_points_chk     CHECK (points > 0)
);

CREATE INDEX IF NOT EXISTS idx_qbq_active     ON public.question_bank_questions (archived_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qbq_difficulty ON public.question_bank_questions (difficulty);
CREATE INDEX IF NOT EXISTS idx_qbq_type       ON public.question_bank_questions (question_type);

-- 2) نطاقات الربط (سنة / فرع / كورس شهري / محاضرة) --------------------------
CREATE TABLE IF NOT EXISTS public.question_bank_scopes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.question_bank_questions(id) ON DELETE CASCADE,
  scope_type  text NOT NULL,
  scope_id    uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT qbs_type_chk CHECK (scope_type IN ('stage','branch','monthly_course','lecture'))
);

-- مفيش FK على scope_id عن قصد لأنه polymorphic (بيشاور على 4 جداول).
-- التنظيف بيحصل من التطبيق + دالة الصيانة تحت.
CREATE UNIQUE INDEX IF NOT EXISTS uq_qbs_unique ON public.question_bank_scopes (question_id, scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_qbs_lookup ON public.question_bank_scopes (scope_type, scope_id);

-- 3) المواضيع/الوسوم --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.question_bank_topics (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_qbt_title ON public.question_bank_topics (title);

CREATE TABLE IF NOT EXISTS public.question_bank_question_topics (
  question_id uuid NOT NULL REFERENCES public.question_bank_questions(id) ON DELETE CASCADE,
  topic_id    uuid NOT NULL REFERENCES public.question_bank_topics(id) ON DELETE CASCADE,
  PRIMARY KEY (question_id, topic_id)
);
CREATE INDEX IF NOT EXISTS idx_qbqt_topic ON public.question_bank_question_topics (topic_id);

-- 4) ربط أسئلة الاختبارات بالبنك -------------------------------------------
ALTER TABLE public.exam_questions
  ADD COLUMN IF NOT EXISTS bank_question_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exam_questions_bank_question_fk'
  ) THEN
    ALTER TABLE public.exam_questions
      ADD CONSTRAINT exam_questions_bank_question_fk
      FOREIGN KEY (bank_question_id)
      REFERENCES public.question_bank_questions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_exam_questions_bank ON public.exam_questions (bank_question_id);

-- 5) RLS: الوصول من التطبيق فقط (Prisma service connection) ------------------
ALTER TABLE public.question_bank_questions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank_scopes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank_topics           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank_question_topics  ENABLE ROW LEVEL SECURITY;
-- مفيش policies عن قصد: مفيش وصول مباشر من anon/authenticated.

-- 6) صيانة: مسح النطاقات اللي بقت يتيمة (بيتنادى من أكشن الصيانة) ----------
CREATE OR REPLACE FUNCTION public.qb_cleanup_orphan_scopes() RETURNS integer AS $$
DECLARE deleted integer;
BEGIN
  WITH gone AS (
    DELETE FROM public.question_bank_scopes s
    WHERE (s.scope_type = 'stage'          AND NOT EXISTS (SELECT 1 FROM public.stages          x WHERE x.id = s.scope_id))
       OR (s.scope_type = 'branch'         AND NOT EXISTS (SELECT 1 FROM public.branches        x WHERE x.id = s.scope_id))
       OR (s.scope_type = 'monthly_course' AND NOT EXISTS (SELECT 1 FROM public.monthly_courses x WHERE x.id = s.scope_id))
       OR (s.scope_type = 'lecture'        AND NOT EXISTS (SELECT 1 FROM public.lectures        x WHERE x.id = s.scope_id))
    RETURNING 1
  )
  SELECT count(*) INTO deleted FROM gone;
  RETURN deleted;
END $$ LANGUAGE plpgsql;
