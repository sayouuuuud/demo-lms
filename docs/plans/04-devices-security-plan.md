# خطة 4 — التأمين وإدارة الأجهزة (Device Binding + Security Score + IP Geolocation)

> **موجّهة للموديل المنفّذ:** اقرأ الملف كله قبل ما تكتب أي سطر. نفّذ Milestone واحد في المرة وبالترتيب. لا تنتقل للتالي قبل `npx tsc --noEmit` ينجح. **مش مطلوب منك تفكير معماري — كل القرارات متاخدة هنا. نفّذ حرفيًا.**
>
> **الترتيب:** الخطة دي رقم 4 (الأخيرة). المفروض خطة 1 (واتساب/OTP) اتنفّذت قبلها. لو مش اتنفّذت، الخطة دي **لسه تشتغل** — فيه ملاحظة صريحة في كل نقطة تعتمد على خطة 1.

---

## 0) قواعد إلزامية (ممنوع تخالفها)

1. **ممنوع** تشغّل `prisma migrate dev` أو `prisma migrate deploy` أو `prisma db push`. السكيما دي introspected من Supabase.
2. كل تغيير DB بيتكتب في **ملف SQL جديد** تحت `prisma/sql/` وصاحب المشروع هو اللي يشغّله يدوي. بعد كده هو اللي يقولك "اتطبق".
3. بعد ما يقولك "اتطبق" → عدّل `prisma/schema.prisma` بالإيد (models جديدة) وشغّل `npx prisma generate` **بس**.
4. ممنوع تعمل `rm -rf`، ممنوع تحذف ملفات موجودة، ممنوع تعيد كتابة ملف كامل لو المطلوب تعديل سطور.
5. كل النصوص للمستخدم **بالعربي**. كل التعليقات في الكود بالإنجليزي أو العربي — زي اللي موجود.
6. ممنوع تلمس `student_devices` (الجدول القديم). هو مستخدم في `lib/student-profile-data.ts` و`components/students/profile/student-profile.tsx` وعنده `student_id @unique` (جهاز واحد بس). الخطة دي بتضيف **جداول جديدة** وبتسيب القديم يشتغل زي ما هو.
7. أي حاجة مش مفهومة → **اسأل صاحب المشروع في الشات**. ممنوع تخترع.
8. بعد كل Milestone: `npx tsc --noEmit` لازم ينجح قبل التالي.

---

## 1) السياق الحالي (حقائق متأكد منها — متفحصش تاني)

### المصادقة
- `auth.ts`: NextAuth v5، `PrismaAdapter`, provider واحد `Credentials`، `session.strategy = 'jwt'`.
- `authorize()` بيقرأ `prisma.user` + `bcrypt.compare(password, user.encrypted_password)`، بعدين `prisma.profiles.role`، وبيرجّع `{ id, email, role, permissions, status, instance_id }`.
- `auth.config.ts`: callbacks `jwt` و`session` بينقلوا `id/role/permissions/status/instance_id`. `pages.signIn = '/auth'`. `trustHost: true`.
- `middleware.ts`: `export default auth((req) => ...)` — بيمنع غير المسجّلين، وبيفلتر `/admin/*` بالصلاحيات عن طريق `mapPathToResource`. `PUBLIC_PATHS = ['/', '/auth', '/stages', '/api/auth', '/api/track', '/api/uploadthing', '/api/webhooks']`.
- **مهم:** الـ middleware بيشتغل على Edge وبيستورد `auth.config` بس (بدون Prisma). **ممنوع** تستورد Prisma أو `lib/prisma` أو أي `server-only` في `middleware.ts` أو `auth.config.ts`.

### الطلاب والحظر
- `students`: فيه `id`, `code`, `user_id`, `name`, `email`, `phone`, `status` (default `'نشط'`), `stage_id`, `last_seen_at`.
- **الحظر الحالي:** `app/student/layout.tsx` فيه بالحرف:
  ```tsx
  if (resolvedProfile.status === 'موقوف') {
    return <BlockedUser />
  }
  ```
  يعني قيمة الحظر النصية هي **`'موقوف'`** في `students.status`. استخدم نفس القيمة بالحرف. **ممنوع** تخترع `'محظور'`.
- `components/student/blocked-user.tsx`: صفحة "حسابك موقوف" + زر خروج (`useLogout`).

### الحضور (presence)
- `components/student/presence-heartbeat.tsx` (client) بينادي `pingPresence()` من `app/student/presence-actions.ts`.
- `pingPresence()` بيعمل `prisma.students.updateMany({ where: { user_id }, data: { last_seen_at: new Date() } })`.
- مركّب في `app/student/layout.tsx` كـ `{profile && <PresenceHeartbeat />}`.
- في بروفايل الطالب عند الأدمن: نافذة "متصل الآن" = **دقيقتين** (`ONLINE_WINDOW_MS = 2 * 60 * 1000`).

### الأجهزة القديمة
- `student_devices`: `student_id String @unique`, `browser`, `os`, `device_type`, `ip`, `city`, `country`, `last_active`, `sessions`, `created_at`. صف واحد لكل طالب. مستخدم للعرض في بروفايل الطالب فقط. **مش** بيعمل أي enforcement.

### الإعدادات
- جدول `settings { key @unique, value Json, updated_at }`. الصف المهم `key = 'global'`.
- `lib/settings-data.ts`: `getGlobalSettings()` + helpers. النوع `GlobalSettings` فيه `security?: {...}` و`[key: string]: any`.
- `app/admin/settings/actions.ts`: `getSettings()` بيرجّع `value` كامل، و`updateSettings(newSettings)` بيعمل **upsert للكائن كله** (بيستبدل الـ JSON بالكامل) + `hasResourceAccess('settings','manage')` + `logActivity` + `revalidatePath('/', 'layout')`.
- `components/settings/settings-panel.tsx`: كلاينت. `baseTabs` فيه `{ id: 'security', label: 'الأمان', icon: Shield }`. الحفظ بيبعت كائن فيه `security: { requireEmailVerification, allowRegistrations }`.
  > ⚠️ **فخ خطير:** `updateSettings` بيستبدل الـ JSON كله. لو حفظت من التبويب من غير ما تحافظ على `security.loginOtp` (خطة 1) و`security.devices` (الخطة دي) → **هتمسح إعدادات موجودة**. الحل الإلزامي في Milestone 6.

### الصلاحيات والـ sidebar
- `lib/permissions.ts`: `ResourceKey` union + `RESOURCES[]` + `mapPathToResource()` (بياخد **أول segment** بعد `/admin`) + `satisfies()` + `fullPermissionMap()`. الملف SAFE للـ middleware (بدون server-only).
- `lib/auth-guard.ts`: `hasResourceAccess(resource, level)`, `getPermissionMap()`, `getCurrentStudent()` (بيرجّع صف `students` بـ `user_id`).
- `components/dashboard/sidebar.tsx`: `navItems[]` فيه `{ label, icon, href, resource, badge?, adminOnly? }`، وبيفلتر بـ `permissions` (لو `undefined` = أدمن كامل بيشوف الكل).
- `components/student/student-sidebar.tsx`: `navItems[]` فيه `{ label, icon, href, badge? }` — آخر عنصر "الإعدادات" `/student/settings`.

### السجلات
- `lib/audit-log.ts` → `logActivity({ action, resource, targetId?, targetLabel?, details? })` بيكتب في `activity_logs`.
- `auth_logs { actor_id, actor_name, actor_role, event, ip, user_agent, created_at }` — للأحداث الأمنية العامة.
- `lib/notify.ts` → `createNotification({ type, title, description?, studentId?, ... })`.
- `lib/logger.ts` → `logError(scope, err)`.

### خطة 1 (لو اتنفّذت)
- routes: `app/auth/login/start`, `/verify`, `/resend`. `lib/login-otp.ts` فيه `getLoginOtpConfig()` و`consumeOtpTicket()`.
- `authorize()` بقى بياخد `otpTicket` في `credentials`.
- `lib/whatsapp.ts` فيه `sendWhatsAppText(...)` و`isWhatsAppConfigured()`.
- الإعدادات تحت `security.loginOtp`.

---

## 2) القرارات النهائية (متسألش عنها تاني)

| البند | القرار |
|---|---|
| هوية الجهاز | كوكي `sd_device` فيه `deviceId.signature` (HMAC-SHA256 بـ `DEVICE_SECRET`)، عمرها سنة، `httpOnly`, `path:'/'`. + **بصمة إضافية** `fingerprint_hash` محسوبة سيرفر-سايد من تلميحات الكلاينت. |
| ليه كوكي + بصمة؟ | الكوكي بتضيع لو الطالب مسح الكاش → عندها نطابق بالبصمة عشان ما نستهلكش خانة جهاز جديدة بالغلط. |
| الحد الأقصى | 3 أجهزة (setting `security.devices.maxDevices`، default 3). |
| مكان الفرض (enforcement) | **بعد إنشاء الجلسة**، عن طريق Server Action `evaluateDeviceSession()` بينداها كومبوننت `DeviceGuard` في `app/student/layout.tsx`. **مش** في `authorize()` ولا في `middleware`. |
| ليه مش في `authorize()`؟ | `authorize()` مش بيشوف كوكيز الكلاينت ولا تلميحات الجهاز، ومش بيقدر يكتب كوكيز. الـ middleware على Edge وممنوع فيه Prisma. الـ Server Action هو المكان الوحيد اللي بيقدر يقرأ ويكتب كوكيز + يستخدم Prisma. |
| على مين ينطبق؟ | **الطلاب فقط** (`role === 'student'`). الأدمن والمساعد مستثنيين تمامًا — عشان ما نقفلش المنصة على نفسنا. |
| التزامن (concurrency) | لو فيه **جلسة نشِطة على جهاز مختلف** آخر نشاط لها أقل من `concurrencyWindowSeconds` (default 120 ثانية) → **الجهاز الجديد هو اللي يُمنع**، والقديم يفضل شغّال. |
| سكور الأمان | `student_security_state.score` من 0 لـ 100، يبدأ 100. العقوبات بتخصم، والتعافي اليومي بيزوّد. |
| الحظر | لو `score <= blockThreshold` (default 40) → `blocked = true` + `students.status = 'موقوف'` + إشعار + سجل. صفحة `BlockedUser` الحالية هي اللي تظهر. |
| فك الحظر | الأدمن بس: يرجّع السكور لقيمة، أو يفك الحظر (بيرجّع `students.status = 'نشط'`), أو يشيل جهاز. |
| IP Geolocation | BigDataCloud. المفتاح في إعدادات الأدمن (`security.geo.apiKey`) **مش** في env — لأن المستخدم طلب كده صريح. |
| كم مرة نستدعي الـ IP API؟ | **مرة واحدة لكل جلسة** عند أول `evaluateDeviceSession` للجلسة (`geo_fetched = true` على صف الجلسة) + **كاش لكل IP** في `ip_geo_cache` لمدة 30 يوم. يعني نفس الـ IP مش بيتسأل عنه تاني خلال 30 يوم مهما حصل. |
| لو الـ geo مقفول أو المفتاح فاضي؟ | كل قواعد الجغرافيا تتخطّى بصمت. باقي النظام (الحد، التزامن، البصمة) يشتغل عادي. |
| طلب إزالة جهاز | الطالب يقدّم طلب من `/student/devices` → صف في `device_removal_requests` → الأدمن يوافق/يرفض من `/admin/security`. الطالب **لا** يقدر يشيل جهاز بنفسه. |
| مفتاح مورد الأدمن | `'security'` (المسار `/admin/security` → أول segment `security`). |

### جدول العقوبات الافتراضي (كله قابل للتعديل من الإعدادات)

| المفتاح | الحدث | الخصم الافتراضي |
|---|---|---|
| `newDevice` | جهاز جديد اتسجّل (غير الأول) | 5 |
| `deviceLimit` | محاولة دخول من جهاز رابع | 10 |
| `concurrent` | محاولة دخول وجهاز تاني نشِط | 15 |
| `cityChange` | تغيّر المدينة خلال أقل من `cityChangeHours` (6) | 10 |
| `countryChange` | تغيّر الدولة | 20 |
| `impossibleTravel` | سرعة انتقال > `maxSpeedKmh` (500 كم/س) | 25 |
| `proxy` | الـ IP مصنّف proxy/VPN/Tor | 10 |
| `ipChurn` | أكتر من `ipChurnLimit` (5) عناوين IP مختلفة في 24 ساعة | 10 |

`dailyRecovery` = 1 نقطة لكل يوم بدون أحداث (بحد أقصى 100). `blockThreshold` = 40.

---

## Milestone 1 — ملف الـ SQL (اكتبه بس، متشغّلوش)

**أنشئ:** `/vercel/share/v0-project/prisma/sql/S01_devices_security.sql`

اكتبه بالحرف:

```sql
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
```

**بعد ما تكتب الملف قول لصاحب المشروع بالنص:**
> "كتبت `prisma/sql/S01_devices_security.sql`. شغّله على Supabase من SQL Editor وقول لي 'اتطبق' عشان أكمّل."

**متكملش لـ Milestone 2 قبل ما يقول "اتطبق".**

---

## Milestone 2 — موديلات Prisma (بعد "اتطبق" بس)

**عدّل:** `/vercel/share/v0-project/prisma/schema.prisma`

ضيف الموديلات دي في آخر الملف. كل موديل **لازم** يكون فيه `@@schema("public")` (السكيما بتستخدم multiSchema).

```prisma
model student_trusted_devices {
  id               String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  student_id       String    @db.Uuid
  device_key       String
  fingerprint_hash String    @default("")
  label            String    @default("")
  browser          String    @default("")
  os               String    @default("")
  device_type      String    @default("كمبيوتر")
  first_ip         String    @default("")
  last_ip          String    @default("")
  last_city        String    @default("")
  last_country     String    @default("")
  last_lat         Float?
  last_lon         Float?
  login_count      Int       @default(1)
  status           String    @default("active")
  removed_at       DateTime? @db.Timestamptz(6)
  removed_by       String?   @db.Uuid
  last_active_at   DateTime  @default(now()) @db.Timestamptz(6)
  created_at       DateTime  @default(now()) @db.Timestamptz(6)

  students                 students                   @relation(fields: [student_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  student_device_sessions  student_device_sessions[]
  student_security_events  student_security_events[]
  device_removal_requests  device_removal_requests[]

  @@unique([student_id, device_key], map: "uq_trusted_devices_student_key")
  @@index([student_id], map: "idx_trusted_devices_student")
  @@index([student_id, fingerprint_hash], map: "idx_trusted_devices_fp")
  @@index([status], map: "idx_trusted_devices_status")
  @@schema("public")
}

model student_device_sessions {
  id             String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  student_id     String    @db.Uuid
  device_id      String?   @db.Uuid
  session_key    String    @unique
  ip             String    @default("")
  city           String    @default("")
  country        String    @default("")
  lat            Float?
  lon            Float?
  geo_fetched    Boolean   @default(false)
  user_agent     String    @default("")
  started_at     DateTime  @default(now()) @db.Timestamptz(6)
  last_seen_at   DateTime  @default(now()) @db.Timestamptz(6)
  revoked_at     DateTime? @db.Timestamptz(6)
  revoked_reason String    @default("")

  students students                 @relation(fields: [student_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  device   student_trusted_devices? @relation(fields: [device_id], references: [id], onUpdate: NoAction)

  @@index([student_id, last_seen_at(sort: Desc)], map: "idx_device_sessions_student_seen")
  @@index([device_id], map: "idx_device_sessions_device")
  @@schema("public")
}

model student_security_state {
  student_id       String    @id @db.Uuid
  score            Int       @default(100)
  blocked          Boolean   @default(false)
  blocked_at       DateTime? @db.Timestamptz(6)
  blocked_reason   String    @default("")
  last_ip          String    @default("")
  last_city        String    @default("")
  last_country     String    @default("")
  last_lat         Float?
  last_lon         Float?
  last_geo_at      DateTime? @db.Timestamptz(6)
  last_event_at    DateTime? @db.Timestamptz(6)
  last_recovery_at DateTime? @db.Timestamptz(6)
  updated_at       DateTime  @default(now()) @db.Timestamptz(6)

  students students @relation(fields: [student_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@index([score], map: "idx_security_state_score")
  @@schema("public")
}

model student_security_events {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  student_id  String   @db.Uuid
  device_id   String?  @db.Uuid
  event_type  String
  severity    String   @default("info")
  score_delta Int      @default(0)
  score_after Int      @default(100)
  ip          String   @default("")
  city        String   @default("")
  country     String   @default("")
  details     Json     @default("{}")
  actor_id    String?  @db.Uuid
  created_at  DateTime @default(now()) @db.Timestamptz(6)

  students students                 @relation(fields: [student_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  device   student_trusted_devices? @relation(fields: [device_id], references: [id], onUpdate: NoAction)

  @@index([student_id, created_at(sort: Desc)], map: "idx_security_events_student")
  @@index([event_type], map: "idx_security_events_type")
  @@index([created_at(sort: Desc)], map: "idx_security_events_created")
  @@schema("public")
}

model ip_geo_cache {
  ip           String   @id
  city         String   @default("")
  country      String   @default("")
  country_code String   @default("")
  lat          Float?
  lon          Float?
  is_proxy     Boolean  @default(false)
  provider     String   @default("bigdatacloud")
  raw          Json     @default("{}")
  fetched_at   DateTime @default(now()) @db.Timestamptz(6)

  @@index([fetched_at(sort: Desc)], map: "idx_ip_geo_fetched")
  @@schema("public")
}

model device_removal_requests {
  id         String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  student_id String    @db.Uuid
  device_id  String    @db.Uuid
  reason     String    @default("")
  status     String    @default("pending")
  admin_note String    @default("")
  handled_by String?   @db.Uuid
  handled_at DateTime? @db.Timestamptz(6)
  created_at DateTime  @default(now()) @db.Timestamptz(6)

  students students                @relation(fields: [student_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  device   student_trusted_devices @relation(fields: [device_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@index([status, created_at(sort: Desc)], map: "idx_removal_requests_status")
  @@index([student_id], map: "idx_removal_requests_student")
  @@schema("public")
}
```

**وكمان** ضيف العلاقات العكسية جوه `model students` (بين الحقول الموجودة، بدون حذف أي سطر):

```prisma
  student_trusted_devices  student_trusted_devices[]
  student_device_sessions  student_device_sessions[]
  student_security_state   student_security_state?
  student_security_events  student_security_events[]
  device_removal_requests  device_removal_requests[]
```

بعدين شغّل **`npx prisma generate`** بس. لو طلع خطأ P1012 → اقرأ الرسالة وصلّح العلاقة الناقصة، **ومتشغّلش migrate**.

---

## Milestone 3 — متغيّرات البيئة

المطلوب متغيّر **واحد** جديد:

```
# سر توقيع كوكي الجهاز (سلسلة عشوائية طويلة، 32 حرف على الأقل)
DEVICE_SECRET=
```

مفتاح BigDataCloud **مش** في env — بيتحفظ في إعدادات الأدمن (قرار المستخدم).

في نهاية الـ Milestone قول بالنص:
> "محتاج تضيف `DEVICE_SECRET` في Vars (سلسلة عشوائية طويلة). لو مش موجود، النظام هيستخدم قيمة تطوير مؤقتة والكوكيز مش هتكون آمنة في الإنتاج."

**ممنوع** تحط قيمة بنفسك في أي ملف.

---

## Milestone 4 — طبقة الـ lib

### 4.1 `/vercel/share/v0-project/lib/device-settings.ts` (جديد، `server-only`)

بيقرأ إعدادات الأمان من `settings.key='global'` → `security.devices` و`security.geo`.

```ts
import 'server-only'
import { getGlobalSettings } from '@/lib/settings-data'

export type DevicePenalties = {
  newDevice: number
  deviceLimit: number
  concurrent: number
  cityChange: number
  countryChange: number
  impossibleTravel: number
  proxy: number
  ipChurn: number
}

export type DeviceSecurityConfig = {
  enabled: boolean                  // تشغيل/إيقاف النظام كله
  enforceLimit: boolean             // منع الجهاز الزائد فعليًا (لو false: يسجّل بس)
  enforceConcurrency: boolean
  autoBlock: boolean                // الحظر التلقائي عند تجاوز الحد
  maxDevices: number
  blockThreshold: number
  concurrencyWindowSeconds: number
  cityChangeHours: number
  maxSpeedKmh: number
  ipChurnLimit: number
  dailyRecovery: number
  penalties: DevicePenalties
}

export type GeoConfig = {
  enabled: boolean
  provider: 'bigdatacloud'
  apiKey: string
  cacheDays: number
  oncePerSession: boolean
}

const DEFAULT_PENALTIES: DevicePenalties = {
  newDevice: 5,
  deviceLimit: 10,
  concurrent: 15,
  cityChange: 10,
  countryChange: 20,
  impossibleTravel: 25,
  proxy: 10,
  ipChurn: 10,
}

export const DEVICE_DEFAULTS: DeviceSecurityConfig = {
  enabled: true,
  enforceLimit: true,
  enforceConcurrency: true,
  autoBlock: true,
  maxDevices: 3,
  blockThreshold: 40,
  concurrencyWindowSeconds: 120,
  cityChangeHours: 6,
  maxSpeedKmh: 500,
  ipChurnLimit: 5,
  dailyRecovery: 1,
  penalties: DEFAULT_PENALTIES,
}

export const GEO_DEFAULTS: GeoConfig = {
  enabled: false,
  provider: 'bigdatacloud',
  apiKey: '',
  cacheDays: 30,
  oncePerSession: true,
}

function num(v: unknown, fallback: number): number {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

export async function getDeviceSecurityConfig(): Promise<DeviceSecurityConfig> {
  const s = await getGlobalSettings()
  const raw = ((s.security as any)?.devices ?? {}) as Record<string, unknown>
  const rawPen = ((raw.penalties ?? {}) as Record<string, unknown>)
  return {
    enabled: raw.enabled !== false,
    enforceLimit: raw.enforceLimit !== false,
    enforceConcurrency: raw.enforceConcurrency !== false,
    autoBlock: raw.autoBlock !== false,
    maxDevices: Math.max(1, num(raw.maxDevices, DEVICE_DEFAULTS.maxDevices)),
    blockThreshold: num(raw.blockThreshold, DEVICE_DEFAULTS.blockThreshold),
    concurrencyWindowSeconds: Math.max(30, num(raw.concurrencyWindowSeconds, DEVICE_DEFAULTS.concurrencyWindowSeconds)),
    cityChangeHours: num(raw.cityChangeHours, DEVICE_DEFAULTS.cityChangeHours),
    maxSpeedKmh: Math.max(100, num(raw.maxSpeedKmh, DEVICE_DEFAULTS.maxSpeedKmh)),
    ipChurnLimit: Math.max(2, num(raw.ipChurnLimit, DEVICE_DEFAULTS.ipChurnLimit)),
    dailyRecovery: num(raw.dailyRecovery, DEVICE_DEFAULTS.dailyRecovery),
    penalties: {
      newDevice: num(rawPen.newDevice, DEFAULT_PENALTIES.newDevice),
      deviceLimit: num(rawPen.deviceLimit, DEFAULT_PENALTIES.deviceLimit),
      concurrent: num(rawPen.concurrent, DEFAULT_PENALTIES.concurrent),
      cityChange: num(rawPen.cityChange, DEFAULT_PENALTIES.cityChange),
      countryChange: num(rawPen.countryChange, DEFAULT_PENALTIES.countryChange),
      impossibleTravel: num(rawPen.impossibleTravel, DEFAULT_PENALTIES.impossibleTravel),
      proxy: num(rawPen.proxy, DEFAULT_PENALTIES.proxy),
      ipChurn: num(rawPen.ipChurn, DEFAULT_PENALTIES.ipChurn),
    },
  }
}

export async function getGeoConfig(): Promise<GeoConfig> {
  const s = await getGlobalSettings()
  const raw = ((s.security as any)?.geo ?? {}) as Record<string, unknown>
  const apiKey = typeof raw.apiKey === 'string' ? raw.apiKey.trim() : ''
  return {
    enabled: raw.enabled === true && apiKey.length > 0,
    provider: 'bigdatacloud',
    apiKey,
    cacheDays: Math.max(1, num(raw.cacheDays, GEO_DEFAULTS.cacheDays)),
    oncePerSession: raw.oncePerSession !== false,
  }
}
```

### 4.2 `/vercel/share/v0-project/lib/device-fingerprint.ts` (جديد — **بدون** `server-only`، الكلاينت بيستخدم `collectClientHints`)

```ts
// Client + server safe. No Node-only imports here.

export type ClientHints = {
  ua: string
  platform: string
  language: string
  timezone: string
  screen: string          // "1920x1080x24"
  cores: number
  memory: number
  touch: boolean
}

/** يتنادى من الكلاينت فقط. آمن لو أي API مش موجود. */
export function collectClientHints(): ClientHints {
  const nav = typeof navigator !== 'undefined' ? (navigator as any) : {}
  const scr = typeof screen !== 'undefined' ? screen : ({} as any)
  let timezone = ''
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  } catch {
    timezone = ''
  }
  return {
    ua: String(nav.userAgent || '').slice(0, 400),
    platform: String(nav.platform || nav.userAgentData?.platform || '').slice(0, 60),
    language: String(nav.language || '').slice(0, 20),
    timezone: String(timezone).slice(0, 60),
    screen: `${scr.width || 0}x${scr.height || 0}x${scr.colorDepth || 0}`,
    cores: Number(nav.hardwareConcurrency) || 0,
    memory: Number(nav.deviceMemory) || 0,
    touch: typeof window !== 'undefined' ? 'ontouchstart' in window : false,
  }
}

/** تسمية ودّية للجهاز — تتحسب على السيرفر من الـ UA. */
export function describeDevice(ua: string): { browser: string; os: string; deviceType: string; label: string } {
  const u = (ua || '').toLowerCase()

  let browser = 'متصفح غير معروف'
  if (u.includes('edg/')) browser = 'Edge'
  else if (u.includes('opr/') || u.includes('opera')) browser = 'Opera'
  else if (u.includes('chrome') && !u.includes('chromium')) browser = 'Chrome'
  else if (u.includes('firefox')) browser = 'Firefox'
  else if (u.includes('safari')) browser = 'Safari'

  let os = 'نظام غير معروف'
  if (u.includes('windows nt 10') || u.includes('windows nt 11')) os = 'Windows'
  else if (u.includes('windows')) os = 'Windows'
  else if (u.includes('android')) os = 'Android'
  else if (u.includes('iphone') || u.includes('ipad') || u.includes('ios')) os = 'iOS'
  else if (u.includes('mac os')) os = 'macOS'
  else if (u.includes('linux')) os = 'Linux'

  let deviceType = 'كمبيوتر'
  if (u.includes('ipad') || u.includes('tablet')) deviceType = 'تابلت'
  else if (u.includes('mobile') || u.includes('android') || u.includes('iphone')) deviceType = 'موبايل'

  return { browser, os, deviceType, label: `${browser} على ${os}` }
}
```

### 4.3 `/vercel/share/v0-project/lib/device-identity.ts` (جديد، `server-only`)

مسؤول عن الكوكيز والتوقيع والبصمة.

```ts
import 'server-only'
import crypto from 'crypto'
import { cookies } from 'next/headers'
import type { ClientHints } from '@/lib/device-fingerprint'

export const DEVICE_COOKIE = 'sd_device'
export const SESSION_COOKIE = 'sd_session'

const ONE_YEAR = 60 * 60 * 24 * 365
const THIRTY_DAYS = 60 * 60 * 24 * 30

function secret(): string {
  return process.env.DEVICE_SECRET || 'dev-only-device-secret-change-me'
}

function sign(value: string): string {
  return crypto.createHmac('sha256', secret()).update(value).digest('hex').slice(0, 32)
}

function pack(value: string): string {
  return `${value}.${sign(value)}`
}

function unpack(raw: string | undefined): string | null {
  if (!raw) return null
  const idx = raw.lastIndexOf('.')
  if (idx <= 0) return null
  const value = raw.slice(0, idx)
  const sig = raw.slice(idx + 1)
  const expected = sign(value)
  if (sig.length !== expected.length) return null
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  return value
}

/** بصمة الجهاز = sha256(تلميحات مستقرّة). مش بناخد الـ IP لأنه بيتغيّر. */
export function fingerprintFrom(hints: ClientHints): string {
  const stable = [
    hints.platform,
    hints.timezone,
    hints.screen,
    String(hints.cores),
    String(hints.memory),
    hints.touch ? 't' : 'f',
    // نستخدم عائلة المتصفح بس، مش رقم النسخة (بيتغيّر كل تحديث)
    (hints.ua.match(/(Chrome|Firefox|Safari|Edg|OPR)/) || ['x'])[0],
  ].join('|')
  return crypto.createHash('sha256').update(`${secret()}|${stable}`).digest('hex')
}

/** يقرأ deviceKey من الكوكي (null لو مش موجود أو التوقيع غلط). */
export async function readDeviceKey(): Promise<string | null> {
  const jar = await cookies()
  return unpack(jar.get(DEVICE_COOKIE)?.value)
}

/** يكتب/يحدّث كوكي الجهاز. يتنادى من Server Action أو Route Handler فقط. */
export async function writeDeviceKey(deviceKey: string): Promise<void> {
  const jar = await cookies()
  jar.set(DEVICE_COOKIE, pack(deviceKey), {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'development' ? 'lax' : 'none',
    secure: process.env.NODE_ENV !== 'development',
    path: '/',
    maxAge: ONE_YEAR,
  })
}

export async function readSessionKey(): Promise<string | null> {
  const jar = await cookies()
  return unpack(jar.get(SESSION_COOKIE)?.value)
}

export async function writeSessionKey(sessionKey: string): Promise<void> {
  const jar = await cookies()
  jar.set(SESSION_COOKIE, pack(sessionKey), {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'development' ? 'lax' : 'none',
    secure: process.env.NODE_ENV !== 'development',
    path: '/',
    maxAge: THIRTY_DAYS,
  })
}

export function newKey(): string {
  return crypto.randomUUID()
}
```

> **ملاحظة إلزامية:** إعدادات `sameSite`/`secure` هنا **مقصودة** ومتوافقة مع `auth.config.ts` (البريفيو بيشتغل جوه iframe cross-site). متغيّرهاش.

### 4.4 `/vercel/share/v0-project/lib/ip-geo.ts` (جديد، `server-only`)

```ts
import 'server-only'
import { prisma } from '@/lib/prisma'
import { logError } from '@/lib/logger'
import { getGeoConfig } from '@/lib/device-settings'

export type GeoResult = {
  ip: string
  city: string
  country: string
  countryCode: string
  lat: number | null
  lon: number | null
  isProxy: boolean
  fromCache: boolean
}

/** يستخرج أول IP حقيقي من هيدرز الطلب. */
export function extractIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for') || ''
  const first = xff.split(',')[0]?.trim()
  return first || headers.get('x-real-ip') || ''
}

function isPrivateIp(ip: string): boolean {
  if (!ip) return true
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true
  if (/^10\./.test(ip)) return true
  if (/^192\.168\./.test(ip)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true
  return false
}

/**
 * يرجّع بيانات الموقع للـ IP.
 * - لو الـ geo مقفول أو المفتاح فاضي أو الـ IP محلي → null (بدون استدعاء خارجي).
 * - بيقرأ من ip_geo_cache الأول. الاستدعاء الخارجي بيحصل بس لو مفيش كاش صالح.
 */
export async function lookupIp(ip: string): Promise<GeoResult | null> {
  const cfg = await getGeoConfig()
  if (!cfg.enabled) return null
  if (isPrivateIp(ip)) return null

  // 1) الكاش
  try {
    const cached = await prisma.ip_geo_cache.findUnique({ where: { ip } })
    if (cached) {
      const ageMs = Date.now() - cached.fetched_at.getTime()
      if (ageMs < cfg.cacheDays * 24 * 60 * 60 * 1000) {
        return {
          ip,
          city: cached.city,
          country: cached.country,
          countryCode: cached.country_code,
          lat: cached.lat ?? null,
          lon: cached.lon ?? null,
          isProxy: cached.is_proxy,
          fromCache: true,
        }
      }
    }
  } catch (e) {
    logError('lookupIp.cache', e)
  }

  // 2) BigDataCloud
  try {
    const url =
      `https://api.bigdatacloud.net/data/ip-geolocation-full` +
      `?ip=${encodeURIComponent(ip)}&localityLanguage=ar&key=${encodeURIComponent(cfg.apiKey)}`

    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) {
      logError('lookupIp.http', new Error(`BigDataCloud ${res.status}`))
      return null
    }
    const data: any = await res.json()

    const city =
      data?.location?.city ||
      data?.location?.localityName ||
      data?.location?.principalSubdivision ||
      ''
    const country = data?.country?.name || data?.country?.isoName || ''
    const countryCode = data?.country?.isoAlpha2 || ''
    const lat = typeof data?.location?.latitude === 'number' ? data.location.latitude : null
    const lon = typeof data?.location?.longitude === 'number' ? data.location.longitude : null
    const isProxy =
      data?.securityThreat?.isProxy === true ||
      data?.securityThreat?.isTor === true ||
      data?.securityThreat?.isKnownAttacker === true ||
      data?.hazardReport?.isKnownAsProxy === true

    await prisma.ip_geo_cache.upsert({
      where: { ip },
      update: {
        city, country, country_code: countryCode, lat, lon,
        is_proxy: isProxy, provider: 'bigdatacloud',
        raw: data ?? {}, fetched_at: new Date(),
      },
      create: {
        ip, city, country, country_code: countryCode, lat, lon,
        is_proxy: isProxy, provider: 'bigdatacloud', raw: data ?? {},
      },
    }).catch(() => {})

    return { ip, city, country, countryCode, lat, lon, isProxy, fromCache: false }
  } catch (e) {
    logError('lookupIp.fetch', e)
    return null
  }
}

/** المسافة بالكيلومتر بين نقطتين (Haversine). */
export function distanceKm(
  lat1: number, lon1: number, lat2: number, lon2: number,
): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}
```

> **فخ:** شكل رد BigDataCloud ممكن يختلف بين الـ endpoints. عشان كده كل قراءة فيها fallbacks و`?.`. **ممنوع** تعمل destructuring مباشر على `data.location`. لو الرد رجع فاضي → الدالة ترجّع `null` والنظام يكمّل عادي.

### 4.5 `/vercel/share/v0-project/lib/security-score.ts` (جديد، `server-only`)

القلب الحسابي. **كل** تعديل على السكور لازم يمرّ من هنا.

```ts
import 'server-only'
import { prisma } from '@/lib/prisma'
import { logError } from '@/lib/logger'
import { createNotification } from '@/lib/notify'
import { getDeviceSecurityConfig } from '@/lib/device-settings'

export type SecurityEventType =
  | 'newDevice' | 'deviceLimit' | 'concurrent' | 'cityChange' | 'countryChange'
  | 'impossibleTravel' | 'proxy' | 'ipChurn'
  | 'adminAdjust' | 'adminUnblock' | 'adminRemoveDevice' | 'autoBlock' | 'recovery'

export type SecurityState = {
  studentId: string
  score: number
  blocked: boolean
  blockedReason: string
}

const SEVERITY: Record<string, 'info' | 'warn' | 'critical'> = {
  newDevice: 'info',
  recovery: 'info',
  adminAdjust: 'info',
  adminUnblock: 'info',
  adminRemoveDevice: 'info',
  deviceLimit: 'warn',
  cityChange: 'warn',
  proxy: 'warn',
  ipChurn: 'warn',
  concurrent: 'critical',
  countryChange: 'critical',
  impossibleTravel: 'critical',
  autoBlock: 'critical',
}

/** يجيب أو يعمل صف الحالة للطالب. */
export async function ensureSecurityState(studentId: string) {
  return prisma.student_security_state.upsert({
    where: { student_id: studentId },
    update: {},
    create: { student_id: studentId },
  })
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

/**
 * يسجّل حدث أمني ويعدّل السكور. الدالة الوحيدة المسموح لها تكتب في السكور.
 * @param delta سالب = خصم، موجب = إضافة، 0 = تسجيل بس.
 */
export async function recordSecurityEvent(input: {
  studentId: string
  type: SecurityEventType
  delta: number
  deviceId?: string | null
  ip?: string
  city?: string
  country?: string
  details?: Record<string, unknown>
  actorId?: string | null
  /** لو true، متعملش حظر تلقائي (للأحداث الإدارية) */
  skipAutoBlock?: boolean
}): Promise<SecurityState> {
  const cfg = await getDeviceSecurityConfig()
  const state = await ensureSecurityState(input.studentId)

  const nextScore = clamp(state.score + input.delta)
  const shouldBlock =
    !input.skipAutoBlock &&
    cfg.autoBlock &&
    !state.blocked &&
    nextScore <= cfg.blockThreshold

  const updated = await prisma.student_security_state.update({
    where: { student_id: input.studentId },
    data: {
      score: nextScore,
      last_event_at: new Date(),
      updated_at: new Date(),
      ...(input.ip ? { last_ip: input.ip } : {}),
      ...(input.city ? { last_city: input.city } : {}),
      ...(input.country ? { last_country: input.country } : {}),
      ...(shouldBlock
        ? {
            blocked: true,
            blocked_at: new Date(),
            blocked_reason: `حظر تلقائي: السكور الأمني وصل ${nextScore}`,
          }
        : {}),
    },
  })

  await prisma.student_security_events.create({
    data: {
      student_id: input.studentId,
      device_id: input.deviceId ?? null,
      event_type: input.type,
      severity: SEVERITY[input.type] ?? 'info',
      score_delta: input.delta,
      score_after: nextScore,
      ip: input.ip ?? '',
      city: input.city ?? '',
      country: input.country ?? '',
      details: (input.details ?? {}) as any,
      actor_id: input.actorId ?? null,
    },
  }).catch((e) => logError('recordSecurityEvent.event', e))

  if (shouldBlock) {
    await applyBlock(input.studentId, `السكور الأمني وصل ${nextScore}`)
  }

  return {
    studentId: input.studentId,
    score: updated.score,
    blocked: updated.blocked,
    blockedReason: updated.blocked_reason,
  }
}

/** الحظر الفعلي: students.status = 'موقوف' + إبطال كل الجلسات + إشعار. */
export async function applyBlock(studentId: string, reason: string): Promise<void> {
  try {
    await prisma.students.update({
      where: { id: studentId },
      data: { status: 'موقوف' },
    })

    await prisma.student_device_sessions.updateMany({
      where: { student_id: studentId, revoked_at: null },
      data: { revoked_at: new Date(), revoked_reason: 'blocked' },
    })

    await prisma.student_security_events.create({
      data: {
        student_id: studentId,
        event_type: 'autoBlock',
        severity: 'critical',
        score_delta: 0,
        score_after: 0,
        details: { reason } as any,
      },
    }).catch(() => {})

    createNotification({
      type: 'system',
      title: 'تم إيقاف حسابك مؤقتًا',
      description: `${reason}. تواصل مع الدعم لمراجعة الحساب.`,
      studentId,
    }).catch(() => {})
  } catch (e) {
    logError('applyBlock', e)
  }
}

/** فك الحظر (أدمن). بيرجّع السكور لقيمة محدّدة. */
export async function liftBlock(
  studentId: string,
  newScore: number,
  actorId: string | null,
): Promise<void> {
  await prisma.student_security_state.upsert({
    where: { student_id: studentId },
    update: {
      score: clamp(newScore),
      blocked: false,
      blocked_at: null,
      blocked_reason: '',
      updated_at: new Date(),
    },
    create: { student_id: studentId, score: clamp(newScore) },
  })

  await prisma.students.update({
    where: { id: studentId },
    data: { status: 'نشط' },
  })

  await prisma.student_security_events.create({
    data: {
      student_id: studentId,
      event_type: 'adminUnblock',
      severity: 'info',
      score_delta: 0,
      score_after: clamp(newScore),
      actor_id: actorId,
      details: { newScore: clamp(newScore) } as any,
    },
  }).catch(() => {})

  createNotification({
    type: 'system',
    title: 'تم إعادة تفعيل حسابك',
    description: 'الإدارة راجعت الحساب وفكّت الإيقاف. خلّي بالك من مشاركة الحساب.',
    studentId,
  }).catch(() => {})
}

/**
 * تعافي تدريجي: نقطة لكل يوم نظيف.
 * بينداها evaluateDeviceSession قبل أي تقييم — رخيصة (قراءة صف واحد).
 */
export async function applyDailyRecovery(studentId: string): Promise<void> {
  const cfg = await getDeviceSecurityConfig()
  if (cfg.dailyRecovery <= 0) return

  const state = await ensureSecurityState(studentId)
  if (state.blocked) return          // المحظور ما يتعافى تلقائيًا
  if (state.score >= 100) return

  const base = state.last_recovery_at ?? state.updated_at
  const days = Math.floor((Date.now() - base.getTime()) / (24 * 60 * 60 * 1000))
  if (days < 1) return

  const gain = Math.min(days * cfg.dailyRecovery, 100 - state.score)
  if (gain <= 0) return

  await prisma.student_security_state.update({
    where: { student_id: studentId },
    data: {
      score: clamp(state.score + gain),
      last_recovery_at: new Date(),
      updated_at: new Date(),
    },
  })

  await prisma.student_security_events.create({
    data: {
      student_id: studentId,
      event_type: 'recovery',
      severity: 'info',
      score_delta: gain,
      score_after: clamp(state.score + gain),
      details: { days } as any,
    },
  }).catch(() => {})
}

/** تسمية عربية لمستوى الأمان. */
export function scoreLabel(score: number): { label: string; tone: 'success' | 'warning' | 'danger' } {
  if (score >= 80) return { label: 'آمن', tone: 'success' }
  if (score >= 55) return { label: 'مراقَب', tone: 'warning' }
  return { label: 'خطر', tone: 'danger' }
}

/** نص عربي لكل نوع حدث — استخدمه في كل الواجهات. */
export const EVENT_LABELS: Record<SecurityEventType, string> = {
  newDevice: 'جهاز جديد',
  deviceLimit: 'تجاوز حد الأجهزة',
  concurrent: 'دخول متزامن من جهاز آخر',
  cityChange: 'تغيّر مدينة سريع',
  countryChange: 'تغيّر دولة',
  impossibleTravel: 'انتقال غير منطقي',
  proxy: 'استخدام بروكسي / VPN',
  ipChurn: 'تغيّر عناوين IP كثير',
  adminAdjust: 'تعديل إداري للسكور',
  adminUnblock: 'فك حظر إداري',
  adminRemoveDevice: 'إزالة جهاز بواسطة الإدارة',
  autoBlock: 'حظر تلقائي',
  recovery: 'تعافي تدريجي',
}
```

### 4.6 `/vercel/share/v0-project/lib/device-guard.ts` (جديد، `server-only`)

**أهم ملف في الخطة.** المحرّك اللي بيقرّر يسمح أو يمنع.

```ts
import 'server-only'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { logError } from '@/lib/logger'
import { auth } from '@/auth'
import { getDeviceSecurityConfig, getGeoConfig } from '@/lib/device-settings'
import { extractIp, lookupIp, distanceKm } from '@/lib/ip-geo'
import { recordSecurityEvent, ensureSecurityState, applyDailyRecovery } from '@/lib/security-score'
import {
  readDeviceKey, writeDeviceKey, readSessionKey, writeSessionKey, newKey, fingerprintFrom,
} from '@/lib/device-identity'
import { describeDevice, type ClientHints } from '@/lib/device-fingerprint'

export type DeviceVerdict =
  | { status: 'ok'; score: number; deviceId: string }
  | { status: 'skipped'; reason: 'disabled' | 'not-student' | 'no-student-row' }
  | { status: 'blocked'; reason: 'limit' | 'concurrent' | 'score'; message: string; score: number }

/**
 * التقييم الكامل لجلسة الجهاز الحالي.
 * تُستدعى من Server Action فقط (بتكتب كوكيز).
 */
export async function evaluateDeviceSession(hints: ClientHints): Promise<DeviceVerdict> {
  const cfg = await getDeviceSecurityConfig()
  if (!cfg.enabled) return { status: 'skipped', reason: 'disabled' }

  const session = await auth()
  const user = session?.user as any
  if (!user?.id) return { status: 'skipped', reason: 'not-student' }
  if (user.role !== 'student') return { status: 'skipped', reason: 'not-student' }

  const student = await prisma.students.findFirst({
    where: { user_id: user.id },
    select: { id: true, name: true, status: true },
  })
  if (!student) return { status: 'skipped', reason: 'no-student-row' }

  const hdrs = await headers()
  const ip = extractIp(hdrs)
  const ua = hdrs.get('user-agent') || hints.ua || ''
  const fingerprint = fingerprintFrom(hints)
  const info = describeDevice(ua)

  // 0) تعافي تدريجي + حالة محظورة مسبقًا
  await applyDailyRecovery(student.id)
  const state = await ensureSecurityState(student.id)
  if (state.blocked) {
    return {
      status: 'blocked',
      reason: 'score',
      message: 'حسابك موقوف لأسباب أمنية. تواصل مع الدعم.',
      score: state.score,
    }
  }

  // 1) تحديد الجهاز: الكوكي أولًا، وبعدين البصمة
  let deviceKey = await readDeviceKey()
  let device = deviceKey
    ? await prisma.student_trusted_devices.findFirst({
        where: { student_id: student.id, device_key: deviceKey },
      })
    : null

  if (!device && fingerprint) {
    // الكوكي ضاع/اتمسح → طابق بالبصمة عشان ما نستهلكش خانة جديدة
    device = await prisma.student_trusted_devices.findFirst({
      where: { student_id: student.id, fingerprint_hash: fingerprint, status: 'active' },
      orderBy: { last_active_at: 'desc' },
    })
    if (device) {
      deviceKey = device.device_key
      await writeDeviceKey(deviceKey)
    }
  }

  const isNewDevice = !device

  // 2) حد الأجهزة
  if (isNewDevice) {
    const activeCount = await prisma.student_trusted_devices.count({
      where: { student_id: student.id, status: 'active' },
    })

    if (activeCount >= cfg.maxDevices) {
      await recordSecurityEvent({
        studentId: student.id,
        type: 'deviceLimit',
        delta: -cfg.penalties.deviceLimit,
        ip,
        details: { activeCount, maxDevices: cfg.maxDevices, ua },
      })

      if (cfg.enforceLimit) {
        return {
          status: 'blocked',
          reason: 'limit',
          message: `وصلت للحد الأقصى (${cfg.maxDevices} أجهزة). لو عايز تسجّل من جهاز جديد، اطلب من الدعم إزالة جهاز من أجهزتك.`,
          score: (await ensureSecurityState(student.id)).score,
        }
      }
    }
  }

  // 3) إنشاء/تحديث صف الجهاز
  if (isNewDevice) {
    deviceKey = newKey()
    await writeDeviceKey(deviceKey)
    device = await prisma.student_trusted_devices.create({
      data: {
        student_id: student.id,
        device_key: deviceKey,
        fingerprint_hash: fingerprint,
        label: info.label,
        browser: info.browser,
        os: info.os,
        device_type: info.deviceType,
        first_ip: ip,
        last_ip: ip,
      },
    })

    const totalDevices = await prisma.student_trusted_devices.count({
      where: { student_id: student.id, status: 'active' },
    })
    // أول جهاز مجاني — اللي بعده بيخصم
    if (totalDevices > 1) {
      await recordSecurityEvent({
        studentId: student.id,
        type: 'newDevice',
        delta: -cfg.penalties.newDevice,
        deviceId: device.id,
        ip,
        details: { label: info.label, totalDevices },
      })
    } else {
      await recordSecurityEvent({
        studentId: student.id,
        type: 'newDevice',
        delta: 0,
        deviceId: device.id,
        ip,
        details: { label: info.label, first: true },
      })
    }
  } else {
    device = await prisma.student_trusted_devices.update({
      where: { id: device!.id },
      data: {
        last_active_at: new Date(),
        last_ip: ip || device!.last_ip,
        login_count: { increment: 1 },
        // نحدّث البصمة لو كانت فاضية (أجهزة قديمة)
        ...(device!.fingerprint_hash ? {} : { fingerprint_hash: fingerprint }),
      },
    })
  }

  // 4) الجلسة الحالية
  let sessionKey = await readSessionKey()
  let deviceSession = sessionKey
    ? await prisma.student_device_sessions.findUnique({ where: { session_key: sessionKey } })
    : null

  // جلسة ملغاة أو بتاعة طالب تاني → اعمل جديدة
  if (deviceSession && (deviceSession.revoked_at || deviceSession.student_id !== student.id)) {
    deviceSession = null
    sessionKey = null
  }

  const isNewSession = !deviceSession

  // 5) التزامن — قبل إنشاء الجلسة الجديدة
  if (isNewSession && cfg.enforceConcurrency) {
    const windowStart = new Date(Date.now() - cfg.concurrencyWindowSeconds * 1000)
    const otherActive = await prisma.student_device_sessions.findFirst({
      where: {
        student_id: student.id,
        revoked_at: null,
        last_seen_at: { gte: windowStart },
        device_id: { not: device!.id },
      },
      orderBy: { last_seen_at: 'desc' },
      include: { device: { select: { label: true } } },
    })

    if (otherActive) {
      await recordSecurityEvent({
        studentId: student.id,
        type: 'concurrent',
        delta: -cfg.penalties.concurrent,
        deviceId: device!.id,
        ip,
        details: {
          otherDevice: otherActive.device?.label ?? '',
          otherLastSeen: otherActive.last_seen_at.toISOString(),
        },
      })

      const fresh = await ensureSecurityState(student.id)
      return {
        status: 'blocked',
        reason: 'concurrent',
        message: `في جهاز تاني مسجّل دخول بحسابك دلوقتي (${otherActive.device?.label || 'جهاز آخر'}). اقفل الجلسة من الجهاز التاني وحاول تاني بعد دقيقتين.`,
        score: fresh.score,
      }
    }
  }

  if (isNewSession) {
    sessionKey = newKey()
    await writeSessionKey(sessionKey)
    deviceSession = await prisma.student_device_sessions.create({
      data: {
        student_id: student.id,
        device_id: device!.id,
        session_key: sessionKey,
        ip,
        user_agent: ua.slice(0, 400),
      },
    })
  } else {
    deviceSession = await prisma.student_device_sessions.update({
      where: { id: deviceSession!.id },
      data: { last_seen_at: new Date(), ip: ip || deviceSession!.ip, device_id: device!.id },
    })
  }

  // 6) الجغرافيا — مرة واحدة لكل جلسة
  const geoCfg = await getGeoConfig()
  const needGeo = geoCfg.enabled && (!geoCfg.oncePerSession || !deviceSession!.geo_fetched)
  if (needGeo && ip) {
    await runGeoChecks({
      studentId: student.id,
      deviceId: device!.id,
      sessionId: deviceSession!.id,
      ip,
      cfg,
    })
  }

  const finalState = await ensureSecurityState(student.id)
  if (finalState.blocked) {
    return {
      status: 'blocked',
      reason: 'score',
      message: 'حسابك موقوف لأسباب أمنية. تواصل مع الدعم.',
      score: finalState.score,
    }
  }

  return { status: 'ok', score: finalState.score, deviceId: device!.id }
}

/** فحوصات الموقع الجغرافي. مفصولة عشان القراءة. */
async function runGeoChecks(args: {
  studentId: string
  deviceId: string
  sessionId: string
  ip: string
  cfg: Awaited<ReturnType<typeof getDeviceSecurityConfig>>
}): Promise<void> {
  const { studentId, deviceId, sessionId, ip, cfg } = args
  try {
    const geo = await lookupIp(ip)

    // علّم الجلسة إنها اتسألت — حتى لو فشل الاستدعاء، عشان ما نكرّرش الاستهلاك
    await prisma.student_device_sessions.update({
      where: { id: sessionId },
      data: {
        geo_fetched: true,
        ...(geo
          ? { city: geo.city, country: geo.country, lat: geo.lat, lon: geo.lon }
          : {}),
      },
    })

    if (!geo) return

    const state = await ensureSecurityState(studentId)

    await prisma.student_trusted_devices.update({
      where: { id: deviceId },
      data: {
        last_city: geo.city, last_country: geo.country,
        last_lat: geo.lat, last_lon: geo.lon,
      },
    }).catch(() => {})

    // (أ) بروكسي / VPN
    if (geo.isProxy) {
      await recordSecurityEvent({
        studentId, type: 'proxy', delta: -cfg.penalties.proxy,
        deviceId, ip, city: geo.city, country: geo.country,
        details: { ip },
      })
    }

    // (ب) تغيّر الدولة
    if (state.last_country && geo.country && state.last_country !== geo.country) {
      await recordSecurityEvent({
        studentId, type: 'countryChange', delta: -cfg.penalties.countryChange,
        deviceId, ip, city: geo.city, country: geo.country,
        details: { from: state.last_country, to: geo.country },
      })
    }

    // (ج) تغيّر المدينة السريع
    const hoursSince = state.last_geo_at
      ? (Date.now() - state.last_geo_at.getTime()) / (60 * 60 * 1000)
      : Number.POSITIVE_INFINITY

    if (
      state.last_city && geo.city &&
      state.last_city !== geo.city &&
      hoursSince < cfg.cityChangeHours
    ) {
      await recordSecurityEvent({
        studentId, type: 'cityChange', delta: -cfg.penalties.cityChange,
        deviceId, ip, city: geo.city, country: geo.country,
        details: { from: state.last_city, to: geo.city, hours: Number(hoursSince.toFixed(2)) },
      })
    }

    // (د) انتقال غير منطقي
    if (
      state.last_lat != null && state.last_lon != null &&
      geo.lat != null && geo.lon != null &&
      Number.isFinite(hoursSince) && hoursSince > 0
    ) {
      const km = distanceKm(state.last_lat, state.last_lon, geo.lat, geo.lon)
      const speed = km / Math.max(hoursSince, 0.05)   // نتجنب القسمة على صفر
      if (km > 50 && speed > cfg.maxSpeedKmh) {
        await recordSecurityEvent({
          studentId, type: 'impossibleTravel', delta: -cfg.penalties.impossibleTravel,
          deviceId, ip, city: geo.city, country: geo.country,
          details: { km: Math.round(km), hours: Number(hoursSince.toFixed(2)), speed: Math.round(speed) },
        })
      }
    }

    // (هـ) تغيّر IP كثير خلال 24 ساعة
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const rows = await prisma.student_device_sessions.findMany({
      where: { student_id: studentId, started_at: { gte: since } },
      select: { ip: true },
    })
    const distinct = new Set(rows.map((r) => r.ip).filter(Boolean))
    if (distinct.size > cfg.ipChurnLimit) {
      await recordSecurityEvent({
        studentId, type: 'ipChurn', delta: -cfg.penalties.ipChurn,
        deviceId, ip, city: geo.city, country: geo.country,
        details: { distinctIps: distinct.size, limit: cfg.ipChurnLimit },
      })
    }

    // حدّث آخر موقع معروف
    await prisma.student_security_state.update({
      where: { student_id: studentId },
      data: {
        last_ip: ip, last_city: geo.city, last_country: geo.country,
        last_lat: geo.lat, last_lon: geo.lon, last_geo_at: new Date(),
        updated_at: new Date(),
      },
    })
  } catch (e) {
    logError('runGeoChecks', e)
  }
}

/** نبضة خفيفة: تحدّث last_seen_at للجلسة الحالية بس. بدون أي فحوصات. */
export async function touchDeviceSession(): Promise<void> {
  try {
    const sessionKey = await readSessionKey()
    if (!sessionKey) return
    await prisma.student_device_sessions.updateMany({
      where: { session_key: sessionKey, revoked_at: null },
      data: { last_seen_at: new Date() },
    })
  } catch (e) {
    logError('touchDeviceSession', e)
  }
}
```

**فخاخ إلزامية في الملف ده:**
1. `evaluateDeviceSession` بتكتب كوكيز → **لازم** تتنادى من Server Action أو Route Handler. لو ندهتها من Server Component هترمي خطأ.
2. أول جهاز **مش** بيخصم. لو خصمت من أول جهاز، كل طالب جديد هيبدأ 95 وده غلط.
3. المنع بسبب التزامن بيحصل **قبل** إنشاء صف الجلسة الجديدة — عشان الجهاز الممنوع ما يعملش جلسة تخلي القديم يتمنع بعد كده.
4. `geo_fetched = true` بيتكتب **حتى لو** الاستدعاء فشل — ده المقصود من "مرة واحدة لكل جلسة".

---

## Milestone 5 — Server Actions للطالب

### 5.1 `/vercel/share/v0-project/app/student/actions/security.ts` (جديد)

```ts
'use server'

import { prisma } from '@/lib/prisma'
import { logError } from '@/lib/logger'
import { revalidatePath } from 'next/cache'
import { getCurrentStudent } from '@/lib/auth-guard'
import { evaluateDeviceSession, touchDeviceSession } from '@/lib/device-guard'
import { readDeviceKey } from '@/lib/device-identity'
import { ensureSecurityState, scoreLabel } from '@/lib/security-score'
import { getDeviceSecurityConfig } from '@/lib/device-settings'
import type { ClientHints } from '@/lib/device-fingerprint'
import type { DeviceVerdict } from '@/lib/device-guard'
```

الدوال المطلوبة بالحرف:

**`checkCurrentDevice(hints: ClientHints): Promise<DeviceVerdict>`**
- `try { return await evaluateDeviceSession(hints) } catch (e) { logError('checkCurrentDevice', e); return { status: 'skipped', reason: 'disabled' } }`
- **مهم:** أي استثناء = `skipped`. **ممنوع** نقفل على الطالب بسبب باگ في النظام الأمني (fail-open). ده قرار مقصود — لو عملتها fail-closed وحصل خطأ في الـ geo، كل الطلاب هيتقفل عليهم.

**`pingDeviceSession(): Promise<{ ok: boolean }>`**
- `await touchDeviceSession(); return { ok: true }` جوه try/catch.

**`getMyDevices()`** — بيرجّع للواجهة:
```ts
{
  maxDevices: number
  score: number
  scoreLabel: { label: string; tone: 'success' | 'warning' | 'danger' }
  blocked: boolean
  currentDeviceKey: string | null
  devices: Array<{
    id: string
    label: string
    browser: string
    os: string
    deviceType: string
    lastCity: string
    lastCountry: string
    lastActiveLabel: string      // نص عربي نسبي
    isCurrent: boolean
    createdAtLabel: string
    hasPendingRequest: boolean
  }>
  pendingRequests: number
}
```
- `student = await getCurrentStudent()`; لو `null` رجّع كائن فاضي آمن (`devices: []`, `score: 100`, ...).
- الأجهزة: `where: { student_id: student.id, status: 'active' }, orderBy: { last_active_at: 'desc' }`.
- `isCurrent` = `device.device_key === await readDeviceKey()`.
- `hasPendingRequest` = فيه صف في `device_removal_requests` بـ `device_id` و`status='pending'`.
- استخدم `formatRelativeTime` لو موجودة في `lib/` (ابحث عنها أول؛ هي مستخدمة في `lib/student-profile-data.ts`). لو مش موجودة، اكتب دالة محلية بسيطة بالعربي: "الآن / قبل X دقيقة / قبل X ساعة / قبل X يوم".

**`requestDeviceRemoval(deviceId: string, reason: string)`**
- `student` لازم يكون موجود، والجهاز لازم يكون بتاعه (`student_id` يساوي) و`status='active'` → غير كده `{ error: 'الجهاز غير موجود.' }`.
- ممنوع أكتر من طلب pending لنفس الجهاز → `{ error: 'فيه طلب قيد المراجعة بالفعل لنفس الجهاز.' }`.
- الحد: 3 طلبات pending كأقصى للطالب → `{ error: 'عندك طلبات كثيرة قيد المراجعة. استنى مراجعة الإدارة.' }`.
- `reason` = `String(reason ?? '').trim().slice(0, 300)`.
- إنشاء الصف + `revalidatePath('/student/devices')` + `{ success: true }`.
- **ممنوع** الطالب يشيل جهاز بنفسه. مفيش أي action للحذف من جهة الطالب.

---

## Milestone 6 — واجهات الطالب

### 6.1 `/vercel/share/v0-project/components/student/security/device-guard.tsx` (جديد، client)

```tsx
'use client'
```
المنطق:
1. `useState<DeviceVerdict | null>(null)`, `useEffect` مرة واحدة (`[]`):
   - `const hints = collectClientHints()`
   - `const verdict = await checkCurrentDevice(hints)`
   - `setVerdict(verdict)`
2. لو `verdict?.status === 'blocked'` → اعرض **overlay ثابت** يغطّي الشاشة:
   - `role="alertdialog"`, `aria-modal="true"`, `fixed inset-0 z-50 bg-background/95 backdrop-blur`
   - أيقونة `ShieldAlert` من lucide، عنوان: "تم إيقاف الدخول من هذا الجهاز"
   - `verdict.message` كنص الوصف.
   - "السكور الأمني: {verdict.score}/100"
   - زرين: **"تسجيل الخروج"** (`useLogout()` من `@/lib/use-logout`) و**"تحديث"** (`window.location.reload()`).
   - لو `reason === 'limit'` ضيف زر يودّي `/student/devices`... **لأ**، الطالب متقفل عليه. بدل كده اكتب النص: "كلّم الدعم لإزالة جهاز من أجهزتك."
3. لو `status !== 'blocked'` → `return null` (مفيش أي UI).
4. **نبضة الجلسة:** `setInterval(() => { pingDeviceSession() }, 60_000)` + `clearInterval` في التنظيف. شغّلها بس لو `verdict?.status === 'ok'`.
5. متعملش أي `fetch` مباشر. Server Actions بس.

> **مهم:** الكومبوننت ده **مش** بيمنع الرندر لو مفيش حظر — عشان ما نأخّرش الصفحة. الطالب الممنوع بيشوف الـ overlay فوق المحتوى خلال أقل من ثانية، وكل الـ actions الحسّاسة عندها فحص سيرفر مستقل (Milestone 9).

### 6.2 ركّب الـ guard في `/vercel/share/v0-project/app/student/layout.tsx`

- ضيف الاستيراد جنب استيرادات الكومبونتس الموجودة:
  `import { DeviceGuard } from '@/components/student/security/device-guard'`
- جوه `<StudentProvider>` بعد `{profile && <PresenceHeartbeat />}` بالحرف:
  ```tsx
  {profile && <DeviceGuard />}
  ```
- **ممنوع** تلمس شرط `resolvedProfile.status === 'موقوف'` ولا أي حاجة تانية في الملف.

### 6.3 `/vercel/share/v0-project/app/student/devices/page.tsx` (جديد)

- Server Component. `const data = await getMyDevices()` ثم `<StudentDevicesPage data={data} />`.
- `export const metadata = { title: 'أجهزتي' }`.

### 6.4 `/vercel/share/v0-project/components/student/security/student-devices-page.tsx` (جديد، client)

التصميم — التزم بالنمط الموجود في المشروع (`Card` من `components/ui/card`، RTL، `rounded-2xl`، توكنز `bg-card`/`text-foreground`/`text-muted-foreground`/`border-border`، الألوان الدلالية `success`/`warning`/`destructive`):

1. **بطاقة السكور** (فوق):
   - رقم كبير `{score}/100` + شارة `scoreLabel.label` بلون حسب `tone`.
   - شريط تقدّم أفقي (div بعرض `${score}%`).
   - نص توضيحي: "السكور بيقل لو حصل نشاط مريب زي الدخول من أماكن متباعدة أو مشاركة الحساب."
2. **بطاقة الحد**: "الأجهزة المسجّلة: {devices.length} من {maxDevices}".
3. **قائمة الأجهزة** (`flex flex-col gap-3`، مش grid):
   - أيقونة حسب `deviceType`: `Smartphone` / `Tablet` / `Monitor`.
   - `label` + شارة **"هذا الجهاز"** لو `isCurrent` (لون `success`).
   - سطر ثانوي: `{lastCity} · {lastCountry}` (لو فاضي: "موقع غير معروف") + "آخر نشاط: {lastActiveLabel}".
   - زر **"طلب إزالة"** — مقفول (`disabled`) لو `isCurrent` أو `hasPendingRequest`، مع نص "قيد المراجعة" في الحالة التانية.
4. **مودال طلب الإزالة**: `Dialog` من `components/ui/dialog` + `Textarea` للسبب (اختياري) + زر تأكيد → `requestDeviceRemoval`. استخدم `useTransition` + `toast` من `sonner` (نفس نمط `settings-panel.tsx`).
5. حالة فاضية: "مفيش أجهزة مسجّلة لسه."
6. Accessibility: كل زر ليه `aria-label` واضح، والأيقونات `aria-hidden`.

### 6.5 ضيف العنصر في `/vercel/share/v0-project/components/student/student-sidebar.tsx`

- استورد `ShieldCheck` من `lucide-react` (ضيفه على قائمة الاستيراد الموجودة).
- في `navItems` ضيف **قبل** عنصر "الإعدادات" بالحرف:
  ```ts
  { label: 'أجهزتي', icon: ShieldCheck, href: '/student/devices' },
  ```
- **ممنوع** أي تعديل تاني في الملف.

---

## Milestone 7 — إعدادات الأدمن (تبويب الأمان)

> ⚠️ **الفخ الأخطر في الخطة كلها.** `updateSettings` بيستبدل الـ JSON كله. اقرأ الخطوة 7.1 مرتين.

### 7.1 حافظ على المفاتيح الموجودة عند الحفظ

**عدّل:** `/vercel/share/v0-project/components/settings/settings-panel.tsx`

في دالة الحفظ، الكائن اللي بيتبعت لـ `updateSettings` لازم يبقى:

```ts
security: {
  ...(initialSettings?.security ?? {}),   // ← يحافظ على loginOtp وأي مفاتيح تانية
  requireEmailVerification,
  allowRegistrations,
  devices: deviceSecurity,                // الحالة الجديدة (تحت)
  geo: geoSettings,                       // الحالة الجديدة (تحت)
},
```

- `initialSettings` هو الـ prop اللي جاي من `getSettings()`. لو الاسم في الملف مختلف، **اقرأ الملف واستخدم الاسم الصح** — الفكرة إنك تنشر (spread) الـ `security` القديم الأول.
- **ممنوع** تبعت `security: { requireEmailVerification, allowRegistrations }` بس. ده هيمسح `loginOtp` بتاع خطة 1 و`devices` بتاع الخطة دي.

### 7.2 حالة جديدة في نفس الكومبوننت

```ts
const [deviceSecurity, setDeviceSecurity] = useState(() => ({
  enabled: settings.security?.devices?.enabled !== false,
  enforceLimit: settings.security?.devices?.enforceLimit !== false,
  enforceConcurrency: settings.security?.devices?.enforceConcurrency !== false,
  autoBlock: settings.security?.devices?.autoBlock !== false,
  maxDevices: Number(settings.security?.devices?.maxDevices) || 3,
  blockThreshold: Number(settings.security?.devices?.blockThreshold) || 40,
  concurrencyWindowSeconds: Number(settings.security?.devices?.concurrencyWindowSeconds) || 120,
  cityChangeHours: Number(settings.security?.devices?.cityChangeHours) || 6,
  maxSpeedKmh: Number(settings.security?.devices?.maxSpeedKmh) || 500,
  ipChurnLimit: Number(settings.security?.devices?.ipChurnLimit) || 5,
  dailyRecovery: Number(settings.security?.devices?.dailyRecovery ?? 1),
  penalties: {
    newDevice: Number(settings.security?.devices?.penalties?.newDevice ?? 5),
    deviceLimit: Number(settings.security?.devices?.penalties?.deviceLimit ?? 10),
    concurrent: Number(settings.security?.devices?.penalties?.concurrent ?? 15),
    cityChange: Number(settings.security?.devices?.penalties?.cityChange ?? 10),
    countryChange: Number(settings.security?.devices?.penalties?.countryChange ?? 20),
    impossibleTravel: Number(settings.security?.devices?.penalties?.impossibleTravel ?? 25),
    proxy: Number(settings.security?.devices?.penalties?.proxy ?? 10),
    ipChurn: Number(settings.security?.devices?.penalties?.ipChurn ?? 10),
  },
}))

const [geoSettings, setGeoSettings] = useState(() => ({
  enabled: settings.security?.geo?.enabled === true,
  provider: 'bigdatacloud' as const,
  apiKey: String(settings.security?.geo?.apiKey ?? ''),
  cacheDays: Number(settings.security?.geo?.cacheDays) || 30,
  oncePerSession: settings.security?.geo?.oncePerSession !== false,
}))
```

### 7.3 قسم جديد في تبويب "الأمان"

تحت المفاتيح الموجودة (`requireEmailVerification`, `allowRegistrations`)، ضيف قسمين بنفس نمط الـ `Card`/`ToggleSwitch` المستخدم في الملف:

**قسم "الأجهزة وسكور الأمان":**
- `ToggleSwitch`: تشغيل نظام الأجهزة (`enabled`)
- `ToggleSwitch`: فرض حد الأجهزة (`enforceLimit`) — وصف: "لو مقفول، الجهاز الزائد بيتسجّل بس بيتسجّل حدث أمني."
- `ToggleSwitch`: منع الدخول المتزامن (`enforceConcurrency`)
- `ToggleSwitch`: الحظر التلقائي عند تجاوز الحد (`autoBlock`)
- `Input type="number"`: الحد الأقصى للأجهزة (`maxDevices`, min 1, max 10)
- `Input type="number"`: حد الحظر للسكور (`blockThreshold`, 0–99)
- `Input type="number"`: نافذة التزامن بالثواني (`concurrencyWindowSeconds`, min 30)
- `Input type="number"`: تعافي يومي (`dailyRecovery`, 0–10)
- **شبكة العقوبات:** 8 مدخلات رقمية بليبلات عربية من `EVENT_LABELS` (استوردها من `@/lib/security-score`؟ **لأ** — `security-score.ts` فيه `server-only`. اكتب الليبلات نصًا مباشر في الكومبوننت، أو حرّك `EVENT_LABELS` لملف مشترك بدون `server-only`. **القرار: اكتبها نصًا مباشر في الكومبوننت.**)

**قسم "خدمة تحديد الموقع (IP Geolocation)":**
- `ToggleSwitch`: تشغيل الخدمة (`enabled`)
- حقل ثابت: المزوّد = **BigDataCloud** (نص، مش قابل للتغيير)
- `Input type="password"` للـ `apiKey` + زر عين للإظهار (لو فيه نمط موجود في الملف استخدمه، غير كده `type` بيتبدّل بـ `useState`)
- `Input type="number"`: مدة الكاش بالأيام (`cacheDays`, min 1)
- `ToggleSwitch`: استدعاء مرة واحدة لكل جلسة (`oncePerSession`) — وصف: "موصى به بشدة لتوفير رصيد الخدمة."
- نص مساعد: "اعمل حساب على bigdatacloud.com واستخدم مفتاح IP Geolocation. الاستدعاء بيحصل مرة واحدة لكل جلسة دخول ومع كاش لكل IP."
- **ممنوع** تعرض المفتاح كامل في أي مكان تاني (لا في الـ logs ولا في `activity_logs`).

### 7.4 تحديث نوع الإعدادات

**عدّل:** `/vercel/share/v0-project/lib/settings-data.ts` — في `type GlobalSettings` جوه `security` ضيف:
```ts
    devices?: Record<string, any>
    geo?: Record<string, any>
```
(الـ index signature موجود، فمش هيكسر — بس الإضافة بتوضّح النية.)

---

## Milestone 8 — لوحة الأدمن `/admin/security`

### 8.1 الصلاحيات والـ sidebar

**عدّل:** `/vercel/share/v0-project/lib/permissions.ts`
- في `ResourceKey` ضيف `| 'security'` بعد `'reports'`.
- في `RESOURCES` ضيف بعد عنصر `reports`:
  ```ts
  { key: 'security', label: 'الأمان والأجهزة', href: '/admin/security' },
  ```
> المسار `/admin/security` وأول segment بعد `/admin` هو `security` → المفتاح **لازم** يساوي `'security'` بالحرف عشان `mapPathToResource` تشتغل.

**عدّل:** `/vercel/share/v0-project/components/dashboard/sidebar.tsx`
- استورد `ShieldAlert` من `lucide-react`.
- في `navItems` ضيف بعد عنصر "التقارير":
  ```ts
  { label: 'الأمان والأجهزة', icon: ShieldAlert, href: '/admin/security', resource: 'security' },
  ```
- تبويب "المساعدون" في الإعدادات: **افحص الأول** — لو بيبني القائمة من `RESOURCES` مفيش تعديل مطلوب. لو فيه قائمة مكتوبة بالإيد، ضيف `'security'` فيها. **مش مسموح** أي تعديل تاني.

### 8.2 `/vercel/share/v0-project/app/admin/security/actions.ts` (جديد)

كل دالة **لازم** تبدأ بـ `if (!(await hasResourceAccess('security', 'manage'))) return { error: 'غير مسموح.' }` (أو `'view'` للقراءة)، وتنتهي بـ `logActivity({...})` + `revalidatePath('/admin/security')`. نفس نمط `app/admin/settings/actions.ts` بالحرف.

**دوال القراءة (`'view'`):**

1. **`getSecurityOverview()`** →
   ```ts
   {
     totalDevices: number
     blockedStudents: number
     atRiskStudents: number      // score < 55 وغير محظور
     eventsToday: number
     pendingRequests: number
     avgScore: number
     geoEnabled: boolean
     geoCallsLast30Days: number  // count من ip_geo_cache بـ fetched_at >= now-30d
   }
   ```
   استخدم `Promise.all` مع `count`/`aggregate`. **ممنوع** تجيب كل الصفوف وتعدّها في JS.

2. **`listStudentSecurity(params)`** — `params = { search?, filter?: 'all'|'blocked'|'atRisk', page?, pageSize? }`
   - `pageSize` default 20، max 100.
   - بيرجّع `{ rows, total }` حيث كل row:
     ```ts
     { studentId, name, code, stageTitle, score, blocked, blockedReason,
       deviceCount, lastCity, lastCountry, lastEventLabel, lastEventAt }
     ```
   - الاستعلام: من `student_security_state` مع `include: { students: { select: { name, code, status, stages: { select: { title } } } } }`.
   - **مهم:** الطلاب اللي لسه ماعندهمش صف حالة **مش** هيظهروا. ده مقبول (معناه مفيش نشاط أمني). متعملش صفوف لكل الطلاب.
   - `search` على `students.name` (`contains`, `mode: 'insensitive'`) أو `students.code`.

3. **`listSecurityEvents(params)`** — `{ studentId?, type?, severity?, page?, pageSize? }` → أحداث مرتّبة `created_at desc` مع اسم الطالب.

4. **`listDeviceRemovalRequests(status = 'pending')`** → الطلبات مع اسم الطالب واسم الجهاز.

5. **`getStudentSecurityDetail(studentId)`** → `{ state, devices, sessions (آخر 20), events (آخر 50) }`.

**دوال التعديل (`'manage'`):**

6. **`adminRemoveDevice(deviceId: string, note: string)`**
   - `update` على الجهاز: `{ status: 'removed', removed_at: new Date(), removed_by: actorId }`.
   - إبطال جلسات الجهاز: `student_device_sessions.updateMany({ where: { device_id: deviceId, revoked_at: null }, data: { revoked_at: new Date(), revoked_reason: 'device removed' } })`.
   - `recordSecurityEvent({ type: 'adminRemoveDevice', delta: 0, skipAutoBlock: true, actorId, deviceId, studentId })`.
   - إشعار للطالب: "تمت إزالة جهاز من أجهزتك. تقدر تسجّل دخول من جهاز جديد."
   - **ممنوع** `delete` للصف — الأرشفة بـ `status='removed'` عشان السجل يفضل.

7. **`adminSetScore(studentId: string, score: number, note: string)`**
   - `score` لازم `0..100` بعد `Math.round`؛ غير كده `{ error: 'السكور لازم يكون بين 0 و100.' }`.
   - `upsert` على `student_security_state`.
   - `recordSecurityEvent({ type: 'adminAdjust', delta: 0, skipAutoBlock: true, ... , details: { newScore: score, note } })`.
   - **مهم:** لو السكور الجديد **أكبر** من `blockThreshold` والطالب محظور → **ما تفكّش** الحظر تلقائي. فك الحظر عملية منفصلة صريحة (`adminUnblock`).

8. **`adminUnblock(studentId: string, restoreScore = 100)`**
   - نادِ `liftBlock(studentId, restoreScore, actorId)` من `@/lib/security-score`.
   - `logActivity` + `revalidatePath`.

9. **`adminBlock(studentId: string, reason: string)`**
   - `reason` مطلوب (`trim().length >= 3`) غير كده `{ error: 'اكتب سبب الحظر.' }`.
   - `upsert` الحالة `{ blocked: true, blocked_at, blocked_reason: reason }` ثم `applyBlock(studentId, reason)`.

10. **`adminRevokeAllSessions(studentId: string)`**
    - `updateMany({ where: { student_id, revoked_at: null }, data: { revoked_at: new Date(), revoked_reason: 'admin revoke' } })`.
    - إشعار: "تم إنهاء كل جلساتك النشِطة بواسطة الإدارة."

11. **`handleRemovalRequest(requestId: string, action: 'approve' | 'reject', note: string)`**
    - `approve` → نادِ `adminRemoveDevice(request.device_id, note)` بعدين حدّث الطلب `status='approved'`.
    - `reject` → حدّث الطلب `status='rejected'` + إشعار للطالب بالسبب.
    - في الحالتين: `handled_by`, `handled_at`.
    - لو الطلب مش `pending` → `{ error: 'الطلب اتعامل معاه بالفعل.' }`.

12. **`recalcSecurityScores()`** (زر "تحديث الحسابات" في الصفحة)
    - يشتغل على `student_security_state` بـ `take: 500` مرتّبين بـ `updated_at asc`.
    - لكل صف: `applyDailyRecovery(studentId)`.
    - يرجّع `{ processed: number }`.
    - **ممنوع** يمشي على كل الصفوف بدون `take` — الصفحة هتعمل timeout.

**استخراج `actorId`:** `const session = await auth(); const actorId = session?.user?.id ?? null`.

### 8.3 `/vercel/share/v0-project/app/admin/security/page.tsx` (جديد)

```tsx
export default async function AdminSecurityPage() {
  const [overview, students, events, requests] = await Promise.all([
    getSecurityOverview(),
    listStudentSecurity({ filter: 'all', page: 1 }),
    listSecurityEvents({ page: 1, pageSize: 30 }),
    listDeviceRemovalRequests('pending'),
  ])
  return <SecurityDashboard ... />
}
```
- `export const metadata = { title: 'الأمان والأجهزة' }`.
- استخدم `PageHeader`/`SettingsPageHeader` لو فيه نمط مشابه في صفحات الأدمن التانية — **افحص `app/admin/reports/page.tsx` أو `app/admin/exams/page.tsx` واتبع نفس الشكل.**

### 8.4 `/vercel/share/v0-project/components/admin/security/security-dashboard.tsx` (جديد، client)

**التصميم — اتبع النمط الموجود في لوحة الأدمن حرفيًا** (`Card`, `rounded-2xl`, RTL, توكنز الألوان، `lucide-react`، `sonner` للتوستات، `useTransition` للأكشنز):

1. **صف ويدجتس فوق** (`grid gap-4 sm:grid-cols-2 lg:grid-cols-4`):
   - إجمالي الأجهزة المسجّلة (`Monitor`)
   - طلاب محظورين (`ShieldOff`، لون `destructive`)
   - طلاب تحت المراقبة (score < 55) (`ShieldAlert`، لون `warning`)
   - أحداث اليوم (`Activity`)
   - + بطاقة صغيرة: "طلبات إزالة جهاز معلّقة: {n}" لو `n > 0` (لون `warning`).
   - + بطاقة: "استدعاءات خدمة الموقع (30 يوم): {geoCallsLast30Days}" — تظهر بس لو `geoEnabled`.
2. **تبويبات داخلية** (نفس نمط `settings-panel.tsx`: `useState<TabId>` + أزرار):
   - `students` — **الطلاب والسكور**
   - `requests` — **طلبات إزالة الأجهزة** (مع عدّاد)
   - `events` — **السجل الأمني**
3. **تبويب الطلاب:** جدول (`table` مع `min-w-full`) أعمدته: الطالب (اسم + كود) / السنة / السكور (شريط + رقم + شارة) / الأجهزة (عدد + زر "عرض") / آخر موقع / الحالة / إجراءات.
   - فلاتر: بحث نصي + `Select` (الكل / محظور / تحت المراقبة).
   - إجراءات لكل صف: **"تعديل السكور"**, **"فك الحظر"** (لو محظور), **"حظر"** (لو مش محظور), **"إنهاء الجلسات"**, **"الأجهزة"**.
   - كل إجراء تدميري (حظر / إزالة جهاز / إنهاء جلسات) لازم `AlertDialog` تأكيد من `components/ui/alert-dialog` + حقل سبب/ملاحظة.
4. **مودال أجهزة الطالب:** `Dialog` بيجيب `getStudentSecurityDetail(studentId)` عند الفتح؛ يعرض الأجهزة (label / موقع / آخر نشاط / عدد الدخول) مع زر **"إزالة الجهاز"**، وتحته آخر 20 جلسة (جهاز / IP / مدينة / بدأت / آخر ظهور / ملغاة؟).
5. **تبويب الطلبات:** كروت لكل طلب: اسم الطالب + الجهاز + السبب + التاريخ + زرين "موافقة" و"رفض" + حقل ملاحظة.
6. **تبويب السجل:** جدول أحداث بـ badges ملوّنة حسب `severity` (`info` = رمادي, `warn` = `warning`, `critical` = `destructive`), والنص العربي للنوع (اكتب خريطة الليبلات نصًا في الكومبوننت — **ممنوع** تستورد من `security-score.ts` لأنه `server-only`), وتفاصيل مختصرة من `details` (مثلًا "من القاهرة إلى الإسكندرية خلال 1.2 ساعة").
   - فلتر بالنوع والخطورة + "تحميل المزيد".
7. زر **"تحديث الحسابات"** فوق يمين → `recalcSecurityScores()` + توست بالنتيجة.
8. حالات فاضية لكل تبويب بنص عربي واضح.
9. **ممنوع** أي `useEffect` بيعمل fetch أول تحميل — البيانات الأولى جاية من الـ Server Component. الـ actions للتحديثات والتفاصيل بس.

### 8.5 ربط بروفايل الطالب عند الأدمن (تعديل صغير)

**عدّل:** `/vercel/share/v0-project/components/students/profile/student-profile.tsx`
- في بطاقة الرأس، جنب شارة الحضور، ضيف شارة السكور الأمني لو البيانات متاحة.
- عشان البيانات تكون متاحة: **عدّل** `lib/student-profile-data.ts` وضيف للكائن المرجّع:
  ```ts
  security: {
    score: number
    label: string
    tone: 'success' | 'warning' | 'danger'
    blocked: boolean
    deviceCount: number
  }
  ```
  تُقرأ من `student_security_state` + `count` للأجهزة النشِطة. لو مفيش صف → `{ score: 100, label: 'آمن', tone: 'success', blocked: false, deviceCount: 0 }`.
- الشارة: `<span>` بلون حسب `tone` ونصها "الأمان: {score}" + زر/لينك صغير لـ `/admin/security` لو `blocked`.
- **ممنوع** تلمس `device` القديم ولا `presence` ولا أي حساب تاني في الملف.

---

## Milestone 9 — الفرض على العمليات الحسّاسة (server-side)

الـ `DeviceGuard` بيغطّي الواجهة. لكن الحماية الحقيقية لازم تكون على السيرفر.

**أنشئ في `/vercel/share/v0-project/lib/device-guard.ts`** (نفس الملف، دالة إضافية):

```ts
/**
 * فحص خفيف للأكشنز الحسّاسة: بيرفض لو الطالب محظور أو جلسته ملغاة.
 * ممنوع يعمل استدعاءات خارجية ولا يكتب كوكيز — دالة قراءة بس.
 */
export async function assertDeviceAllowed(): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const cfg = await getDeviceSecurityConfig()
    if (!cfg.enabled) return { ok: true }

    const session = await auth()
    const user = session?.user as any
    if (!user?.id || user.role !== 'student') return { ok: true }

    const student = await prisma.students.findFirst({
      where: { user_id: user.id },
      select: { id: true },
    })
    if (!student) return { ok: true }

    const state = await prisma.student_security_state.findUnique({
      where: { student_id: student.id },
      select: { blocked: true },
    })
    if (state?.blocked) {
      return { ok: false, message: 'حسابك موقوف لأسباب أمنية. تواصل مع الدعم.' }
    }

    const sessionKey = await readSessionKey()
    if (!sessionKey) return { ok: true }   // fail-open: الجلسة لسه ماتسجّلتش

    const row = await prisma.student_device_sessions.findUnique({
      where: { session_key: sessionKey },
      select: { revoked_at: true, student_id: true },
    })
    if (row && row.student_id === student.id && row.revoked_at) {
      return { ok: false, message: 'تم إنهاء هذه الجلسة. سجّل دخول من جديد.' }
    }

    return { ok: true }
  } catch {
    return { ok: true }   // fail-open مقصود
  }
}
```

**ضيف الفحص ده في بداية الأكشنز دي بالحرف** (وبس دي — **ممنوع** تضيفه في كل حاجة):

1. `app/student/actions/exams-assignments.ts` → الأكشن اللي بيبدأ اختبار، واللي بيسلّم اختبار، واللي بيسلّم واجب. (اقرأ الملف واستخرج أسماء الأكشنز الفعلية.)
2 . أي أكشن بيرجّع رابط فيديو/بث للطالب (ابحث عن `playback`/`hls`/`signed` جوه `app/student/`).

النمط:
```ts
const guard = await assertDeviceAllowed()
if (!guard.ok) return { error: guard.message }
```
لو الأكشن بيرجّع شكل تاني (مثلًا `{ success, data }`)، طوّع الرسالة لنفس الشكل. **ممنوع** تغيّر أنواع الإرجاع الموجودة.

---

## Milestone 10 — تنظيف الجلسات القديمة

**عدّل:** `/vercel/share/v0-project/app/student/presence-actions.ts`

جوه `pingPresence()` بعد تحديث `last_seen_at` بالحرف، ضيف:
```ts
await touchDeviceSession()
```
باستيراد `import { touchDeviceSession } from '@/lib/device-guard'`.

- ده بيخلّي نافذة التزامن دقيقة من غير interval إضافي.
- **ممنوع** تحط أي منطق تقييم في `pingPresence`. نبضة بس.

وكمان في `recalcSecurityScores()` (Milestone 8.2 رقم 12) ضيف تنظيف:
```ts
// إلغاء الجلسات الميتة (مفيش نشاط أكتر من 12 ساعة)
await prisma.student_device_sessions.updateMany({
  where: { revoked_at: null, last_seen_at: { lt: new Date(Date.now() - 12 * 60 * 60 * 1000) } },
  data: { revoked_at: new Date(), revoked_reason: 'stale' },
})
```

---

## Milestone 11 — إشعار واتساب للأحداث الخطيرة (اختياري — بس لو خطة 1 اتنفّذت)

لو `lib/whatsapp.ts` موجود:
- في `recordSecurityEvent`، بعد تسجيل الحدث، لو `SEVERITY[type] === 'critical'` **و** `settings.security.devices.notifyWhatsApp === true`:
  - جيب `students.phone` وابعت:
    > "تنبيه أمني: تم رصد محاولة دخول مريبة لحسابك ({نوع الحدث}). لو مش إنت، غيّر كلمة السر فورًا وكلّم الدعم."
  - `fire-and-forget` بـ `.catch(() => {})`. **ممنوع** الإرسال يوقف أو يأخّر التقييم.
- ضيف `ToggleSwitch` "إشعار واتساب للأحداث الخطيرة" في قسم الأجهزة بالإعدادات.

لو `lib/whatsapp.ts` **مش** موجود → **اتخطى الـ Milestone بالكامل** ومتكتبش أي استيراد ليه، وقول لصاحب المشروع: "خطة 1 مش متنفّذة فاتخطّيت إشعارات الواتساب الأمنية."

---

## قائمة التحقق النهائية (اعملها كلها وقول النتيجة)

- [ ] `npx tsc --noEmit` نجح بدون أخطاء.
- [ ] `npx prisma generate` نجح.
- [ ] مفيش أي `prisma migrate` / `db push` اتشغّل.
- [ ] `prisma/sql/S01_devices_security.sql` مكتوب بالكامل وصاحب المشروع هو اللي شغّله.
- [ ] `student_devices` القديم **ماتغيّرش**، وبروفايل الطالب عند الأدمن لسه بيفتح عادي.
- [ ] طالب جديد يفتح `/student` → يتسجّل جهاز، والسكور يفضل **100** (أول جهاز مجاني).
- [ ] نفس الطالب من متصفح تاني (بعد إغلاق الأول وانتظار أكتر من نافذة التزامن) → جهاز تاني، السكور 95.
- [ ] جهاز تالت → 90. جهاز رابع → **يتمنع** برسالة الحد + السكور 80.
- [ ] الطالب يفتح `/student/devices` → يشوف 3 أجهزة، "هذا الجهاز" على الصح، وزر "طلب إزالة" مقفول على الجهاز الحالي.
- [ ] طلب إزالة → يظهر في `/admin/security` تبويب الطلبات → موافقة → الجهاز `status='removed'` والطالب يقدر يسجّل من جهاز جديد.
- [ ] جهازين في نفس الوقت: افتح الجلسة على جهاز A وسيبها نشِطة، بعدين افتح على B → **B يتمنع** ورسالة التزامن تظهر، وA يفضل شغّال.
- [ ] مسح كوكيز الجهاز من نفس المتصفح → **مش** بيستهلك خانة جديدة (اتطابق بالبصمة).
- [ ] السكور ينزل تحت 40 → الطالب يتحظر تلقائي، `students.status = 'موقوف'`، وصفحة `BlockedUser` هي اللي تظهر.
- [ ] الأدمن يفك الحظر → `status = 'نشط'` والسكور رجع، والطالب يدخل عادي.
- [ ] الأدمن يعدّل السكور لطالب محظور → **الحظر ما يتفكّش** تلقائي.
- [ ] `geo.enabled = false` → مفيش أي استدعاء خارجي خالص، والنظام كامل شغّال.
- [ ] `geo.enabled = true` بمفتاح صح → أول تقييم للجلسة بيسجّل مدينة/دولة، والتقييم التاني في نفس الجلسة **مش** بيستدعي تاني (`geo_fetched = true`).
- [ ] نفس الـ IP في جلسة جديدة → بيتقرأ من `ip_geo_cache` (مفيش استدعاء خارجي).
- [ ] مفتاح BigDataCloud **مش** ظاهر في أي log ولا في `activity_logs`.
- [ ] حفظ تبويب الأمان **مش** بيمسح `security.loginOtp` (لو خطة 1 متنفّذة) — افحص صف `settings` بعد الحفظ.
- [ ] الأدمن والمساعد يدخلوا ويستخدموا المنصة عادي بدون أي فرض أجهزة.
- [ ] مساعد بصلاحية `view` على `security` يشوف الصفحة ومش قادر ينفّذ أي إجراء.
- [ ] مساعد بدون صلاحية → الـ middleware يمنعه والعنصر مش ظاهر في الـ sidebar.
- [ ] لو `DEVICE_SECRET` مش موجود → التطبيق **ما يقعش**، بس اطبع تحذير مرة واحدة.

---

## فخاخ متقعش فيها

1. **ممنوع** Prisma أو `server-only` في `middleware.ts` أو `auth.config.ts`. الـ middleware على Edge وهيكسر الـ build.
2. **الفرض مش في `authorize()`.** `authorize()` مش شايف كوكيز الجهاز ولا بيقدر يكتبها. لو حاولت، هتقفل الدخول على الكل.
3. **fail-open مقصود.** أي استثناء في النظام الأمني = اسمح. لو عملتها fail-closed، أول باگ في BigDataCloud هيقفل المنصة على كل الطلاب.
4. **قيمة الحظر النصية هي `'موقوف'`** — مش `'محظور'` ولا `'blocked'`. `app/student/layout.tsx` بيقارن بـ `'موقوف'`.
5. **`updateSettings` بيستبدل الـ JSON كله.** انشر `...(initialSettings?.security ?? {})` وإلا هتمسح إعدادات خطة 1.
6. **أول جهاز ما بيخصمش.** لو خصمت منه، كل طالب هيبدأ بسكور ناقص.
7. **المنع بسبب التزامن قبل إنشاء صف الجلسة.** لو أنشأت الصف الأول، الجهاز الممنوع هيتسبّب في منع الجهاز الشغّال بعد كده.
8. **`geo_fetched = true` حتى لو الاستدعاء فشل.** ده اللي يضمن "مرة واحدة لكل جلسة" فعليًا.
9. **`recordSecurityEvent` هي المصدر الوحيد لتغيير السكور.** ممنوع `prisma.student_security_state.update({ score })` في أي مكان تاني غير `liftBlock` و`applyDailyRecovery` و`adminSetScore`.
10. **`EVENT_LABELS` في ملف `server-only`.** ممنوع تستوردها في كومبونتس الكلاينت — اكتب الليبلات نصًا هناك.
11. **`recalcSecurityScores` لازم `take`.** بدون سقف هتعمل timeout على أي عدد طلاب حقيقي.
12. **ممنوع حذف صفوف الأجهزة.** `status = 'removed'` عشان السجل الأمني يفضل مترابط.
13. الكوكيز `sameSite: 'none'` + `secure: true` خارج التطوير — **مقصود** عشان البريفيو داخل iframe. لو غيّرتها، الأجهزة مش هتتعرّف في البريفيو.

---

## ملاحظات للمنفّذ (اقرأها قبل ما تبدأ)

1. **الفرق بين "جهاز" و"جلسة" هو أهم فكرة في الخطة.** الجهاز = كوكي طويل الأمد + بصمة (بيعدّ في حد الـ 3). الجلسة = كوكي أقصر + صف بيتحدّث بالنبضة (بيحدّد التزامن). لو خلطتهم، حد الأجهزة أو منع التزامن واحد فيهم هيتكسر.
2. **الجغرافيا اختيارية بالكامل.** لازم كل حاجة تشتغل بالضبط لو `geo.enabled = false`. اختبر الحالتين.
3. **الأدمن مستثنى.** أي كود بيفحص الأجهزة لازم يخرج بدري لو `role !== 'student'`.
4. لو أي عمود أو علاقة في السكيما مختلفة عن اللي مكتوب هنا، **اقرأ السكيما وعدّل الاستعلام**، سيب باقي التصميم زي ما هو، واكتب في الشات إيه اللي اختلف.
5. لو أي Milestone احتاج تغيير DB إضافي: **متشغّلوش**. اكتب ملف SQL جديد `S02_...sql` واطلب من المستخدم يشغّله.
6. رتّب التنفيذ: 1 → 2 (بعد "اتطبق") → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11. **متقفزش.**
