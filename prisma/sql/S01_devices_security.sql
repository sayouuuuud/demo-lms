-- ============================================================================
-- S01_devices_security.sql
-- التأمين وإدارة الأجهزة: أجهزة موثوقة + جلسات + سكور أمان + أحداث + كاش IP
-- شغّل الملف ده مرة واحدة على Supabase (SQL Editor) ثم قول للموديل "اتطبق".
-- الملف idempotent: تشغيله تاني مش هيكسر حاجة.
-- ============================================================================

-- 1) الأجهزة الموثوقة (بديل متعدد الصفوف للجدول القديم student_devices)
CREATE TABLE IF NOT EXISTS public.student_trusted_devices (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  device_key       text NOT NULL,               -- المعرّف اللي جوه الكوكي (uuid)
  fingerprint_hash text NOT NULL DEFAULT '',    -- sha256 لتلميحات الجهاز
  label            text NOT NULL DEFAULT '',    -- اسم ودّي: "Chrome على Windows"
  browser          text NOT NULL DEFAULT '',
  os               text NOT NULL DEFAULT '',
  device_type      text NOT NULL DEFAULT 'كمبيوتر',
  first_ip         text NOT NULL DEFAULT '',
  last_ip          text NOT NULL DEFAULT '',
  last_city        text NOT NULL DEFAULT '',
  last_country     text NOT NULL DEFAULT '',
  last_lat         double precision,
  last_lon         double precision,
  login_count      integer NOT NULL DEFAULT 1,
  status           text NOT NULL DEFAULT 'active',  -- active | removed
  removed_at       timestamptz,
  removed_by       uuid,
  last_active_at   timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_trusted_devices_student_key
  ON public.student_trusted_devices (student_id, device_key);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_student
  ON public.student_trusted_devices (student_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_fp
  ON public.student_trusted_devices (student_id, fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_status
  ON public.student_trusted_devices (status);

-- 2) جلسات الأجهزة (للتزامن + "مرة واحدة لكل جلسة" للـ geo)
CREATE TABLE IF NOT EXISTS public.student_device_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  device_id      uuid REFERENCES public.student_trusted_devices(id) ON DELETE SET NULL,
  session_key    text NOT NULL UNIQUE,          -- عشوائي لكل جلسة متصفح
  ip             text NOT NULL DEFAULT '',
  city           text NOT NULL DEFAULT '',
  country        text NOT NULL DEFAULT '',
  lat            double precision,
  lon            double precision,
  geo_fetched    boolean NOT NULL DEFAULT false,
  user_agent     text NOT NULL DEFAULT '',
  started_at     timestamptz NOT NULL DEFAULT now(),
  last_seen_at   timestamptz NOT NULL DEFAULT now(),
  revoked_at     timestamptz,
  revoked_reason text NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_device_sessions_student_seen
  ON public.student_device_sessions (student_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_sessions_device
  ON public.student_device_sessions (device_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_active
  ON public.student_device_sessions (student_id) WHERE revoked_at IS NULL;

-- 3) حالة السكور الأمني (صف واحد لكل طالب)
CREATE TABLE IF NOT EXISTS public.student_security_state (
  student_id      uuid PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
  score           integer NOT NULL DEFAULT 100,
  blocked         boolean NOT NULL DEFAULT false,
  blocked_at      timestamptz,
  blocked_reason  text NOT NULL DEFAULT '',
  last_ip         text NOT NULL DEFAULT '',
  last_city       text NOT NULL DEFAULT '',
  last_country    text NOT NULL DEFAULT '',
  last_lat        double precision,
  last_lon        double precision,
  last_geo_at     timestamptz,
  last_event_at   timestamptz,
  last_recovery_at timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_state_score
  ON public.student_security_state (score);
CREATE INDEX IF NOT EXISTS idx_security_state_blocked
  ON public.student_security_state (blocked) WHERE blocked = true;

-- 4) سجل الأحداث الأمنية
CREATE TABLE IF NOT EXISTS public.student_security_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  device_id    uuid REFERENCES public.student_trusted_devices(id) ON DELETE SET NULL,
  event_type   text NOT NULL,     -- newDevice | deviceLimit | concurrent | cityChange | countryChange | impossibleTravel | proxy | ipChurn | adminAdjust | adminUnblock | adminRemoveDevice | autoBlock | recovery
  severity     text NOT NULL DEFAULT 'info',  -- info | warn | critical
  score_delta  integer NOT NULL DEFAULT 0,
  score_after  integer NOT NULL DEFAULT 100,
  ip           text NOT NULL DEFAULT '',
  city         text NOT NULL DEFAULT '',
  country      text NOT NULL DEFAULT '',
  details      jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id     uuid,              -- الأدمن لو الحدث إداري
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_student
  ON public.student_security_events (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_type
  ON public.student_security_events (event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created
  ON public.student_security_events (created_at DESC);

-- 5) كاش الـ IP Geolocation (لتوفير كريدت BigDataCloud)
CREATE TABLE IF NOT EXISTS public.ip_geo_cache (
  ip           text PRIMARY KEY,
  city         text NOT NULL DEFAULT '',
  country      text NOT NULL DEFAULT '',
  country_code text NOT NULL DEFAULT '',
  lat          double precision,
  lon          double precision,
  is_proxy     boolean NOT NULL DEFAULT false,
  provider     text NOT NULL DEFAULT 'bigdatacloud',
  raw          jsonb NOT NULL DEFAULT '{}'::jsonb,
  fetched_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ip_geo_fetched ON public.ip_geo_cache (fetched_at DESC);

-- 6) طلبات إزالة جهاز (الطالب يطلب، الأدمن ينفّذ)
CREATE TABLE IF NOT EXISTS public.device_removal_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  device_id    uuid NOT NULL REFERENCES public.student_trusted_devices(id) ON DELETE CASCADE,
  reason       text NOT NULL DEFAULT '',
  status       text NOT NULL DEFAULT 'pending',   -- pending | approved | rejected
  admin_note   text NOT NULL DEFAULT '',
  handled_by   uuid,
  handled_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_removal_requests_status
  ON public.device_removal_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_removal_requests_student
  ON public.device_removal_requests (student_id);

-- 7) RLS: الجداول دي بيتم الوصول لها من السيرفر بـ service role فقط.
ALTER TABLE public.student_trusted_devices  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_device_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_security_state   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_security_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_geo_cache             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_removal_requests  ENABLE ROW LEVEL SECURITY;
