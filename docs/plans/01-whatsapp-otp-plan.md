# خطة 1 — نظام الواتساب + كود تسجيل الدخول (Login OTP)

> **STATUS: غير منفّذ — 0/7 milestones**
>
> **موجّهة للموديل المنفّذ:** اقرأ الملف كله قبل ما تكتب أي سطر. نفّذ Milestone واحد في المرة وبالترتيب. لا تنتقل للتالي قبل `npx tsc --noEmit` ينجح. **مش مطلوب منك تفكير معماري — كل القرارات متاخدة هنا. نفّذ حرفيًا.**

---

## 0) قواعد إلزامية (ممنوع تخالفها)

1. **ممنوع** تشغيل `prisma migrate` أو `prisma db push` أو أي SQL على القاعدة. المشروع مالوش `prisma/migrations/` والسكيما متعمولة `db pull` من Supabase.
2. كل تغيير DB بيتكتب في **ملف SQL جديد** تحت `prisma/sql/` وصاحب المشروع هو اللي يشغّله يدوي. بعد كده هو اللي يقولك "اتطبق".
3. بعد ما تكتب ملف الـ SQL، **إنت** تضيف `model` blocks بإيدك في `prisma/schema.prisma` مطابقة 1:1 للـ SQL (نفس الأعمدة، نفس الأنواع، نفس `@@schema("public")`)، وبعدها `npx prisma generate` بس.
4. **ممنوع** حذف أو تعديل أي feature موجودة. الإضافة فوق الموجود فقط.
5. كل تعديل بأدوات Edit/Write، والمسارات **absolute** من `/vercel/share/v0-project/`.
6. اللغة: كل نص واجهة بالعربي المصري، الاتجاه RTL، ونفس نبرة الرسائل الموجودة (`'تعذّر ... حاول تاني.'`).
7. **ممنوع** تخزين أي secret في جدول `settings` أو ترجعه للكلاينت. الـ secrets في env فقط.
8. **ممنوع** تلمس `auth.config.ts` في حاجة تخص الكوكيز أو `trustHost` — الملف ده متظبط لبيئة الـ preview.

---

## 1) السياق الحالي (حقائق متأكد منها — متفحصش تاني)

### المصادقة
- `auth.ts`: NextAuth v5 beta، provider واحد بس `Credentials` بـ `{ email, password }`، `PrismaAdapter`, session strategy = **jwt** (`auth.config.ts`).
- `authorize()` في `auth.ts` بتعمل: `prisma.user.findFirst` بالإيميل (insensitive) → `bcrypt.compare` → تقرأ `profiles.role` → لو assistant تجيب `assistant_permissions` → لو student تجيب `students.status` → ترجّع `{ id, email, role, permissions, status, instance_id }`.
- **مفيش أي OTP على تسجيل الدخول حاليًا.** الكود الموجود (6 أرقام) بيستخدم في **التسجيل الجديد فقط** عن طريق:
  - `app/auth/register/route.ts` → ينشئ `auth.users` + صف `students` + يكتب `VerificationToken` + `sendActivationCode`.
  - `app/auth/verify/route.ts` → يتحقق من `VerificationToken` ويعمل `emailVerified = now()`.
  - `app/auth/register/resend/route.ts` → يعيد الإرسال.
- `components/auth/auth-form.tsx` (client): تبويبين login/register + شاشة `awaitingCode` للتسجيل. بيستعمل `signIn('credentials', { redirect: false })` وبعدها `getSession()` وبعدها `window.location.assign(destination)`.
- `lib/email.ts`: `sendActivationCode(to, code)` عبر nodemailer + `SMTP_CONNECTION_URL`. قالب HTML عربي RTL جوّه نفس الملف.
- `lib/settings-data.ts`: `getGlobalSettings()` بتقرأ `settings` where `key='global'` وترجّع JSON. فيه helpers: `isEmailVerificationRequired()`, `areRegistrationsAllowed()`.
- `components/settings/settings-panel.tsx`: تبويبات في `baseTabs` (سطر ~108)، تبويب `security` بيعرض توجل `requireEmailVerification` و`allowRegistrations` ويحفظ عبر `updateSettings(newSettings)` من `app/admin/settings/actions.ts` (السطر ~286 فيه بناء `newSettings`).
- رقم الطالب موجود في **3 أماكن**: `auth.users.phone` (unique, بيتسجّل حاليًا؟ **لأ** — `register/route.ts` مبيكتبوش)، `profiles.phone`، و`students.phone` (ده اللي بيتكتب فعلًا من `ensureStudentRow`).
  → **المصدر الرسمي للرقم في الخطة دي: `students.phone`، وfallback على `profiles.phone`.**

### الطلبات/الدفع
- `app/admin/payments/orders-actions.ts` → `updateOrderStatus(id, status)` (سطر 77) بتعمل `prisma.orders.update` + `logActivity` + `revalidatePath('/admin/payments')`. `status` من نوع `'pending' | 'approved' | 'rejected'`.
- `orders` فيها `student_phone` و`student_name` و`code` و`total` (شوف `getOrders`).
- `lib/notify.ts` → `createNotification()` لإشعارات داخل المنصة (مش واتساب).

---

## 2) القرارات النهائية (متسألش عنها تاني)

| البند | القرار |
|---|---|
| مزوّد الواتساب | **Evolution API** self-hosted على VPS، مربوط بـ Meta WhatsApp Cloud API. الاتصال بيه HTTP REST بـ header `apikey`. |
| قنوات كود الدخول | `email` و`whatsapp`. الأدمن يفعّل: واحدة / الاتنين / ولا حاجة. |
| الاتنين مفعّلين | الطالب **يختار** القناة قبل إرسال الكود. |
| ولا حاجة مفعّلة | الدخول يكمّل عادي بباسورد بس (السلوك الحالي بالحرف). |
| مين عليه OTP | **الطلاب فقط** (`role === 'student'`). الأدمن والمساعد يدخلوا بباسورد على طول — عشان ما نقفلش المنصة على نفسنا لو الواتساب وقع. |
| رقم الإرسال | `students.phone` ثم `profiles.phone`. لو مفيش رقم صالح والقناة المطلوبة whatsapp → رسالة خطأ واضحة + السماح بالإيميل لو مفعّل. |
| مكان تنفيذ الـ OTP | **قبل** إنشاء الجلسة، عبر route handlers مخصّصة، و`authorize()` بترفض الدخول من غير `otpTicket` صالح. |
| صلاحية الكود | 5 دقايق، 6 أرقام، 5 محاولات كحد أقصى، 3 إرسالات للتحدي الواحد، كولداون 60 ثانية. |
| صلاحية الـ ticket | 120 ثانية، استخدام واحد. |
| إشعار الدفع | رسالة واتساب عند `updateOrderStatus(id, 'approved')` فقط. fire-and-forget. |
| الأسرار | env: `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`, `OTP_PEPPER`. |

---

## Milestone 1 — ملف الـ SQL (اكتبه بس، متشغّلوش)

**أنشئ:** `/vercel/share/v0-project/prisma/sql/W01_whatsapp_login_otp.sql`

```sql
-- W01: نظام كود تسجيل الدخول (Email/WhatsApp) + سجل رسائل الواتساب
-- التشغيل: يدوي من صاحب المشروع على الـ live DB. مرة واحدة.
-- آمن للتشغيل مرتين (idempotent).

-- 1) تحديات كود الدخول ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.login_otp_challenges (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email              text NOT NULL,
  channel            text NOT NULL,
  destination        text NOT NULL,
  code_hash          text NOT NULL,
  expires_at         timestamptz NOT NULL,
  attempts           integer NOT NULL DEFAULT 0,
  sends              integer NOT NULL DEFAULT 1,
  last_sent_at       timestamptz NOT NULL DEFAULT now(),
  consumed_at        timestamptz,
  ticket             text,
  ticket_expires_at  timestamptz,
  ip                 text,
  user_agent         text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT login_otp_channel_chk CHECK (channel IN ('email','whatsapp'))
);

CREATE INDEX IF NOT EXISTS idx_login_otp_user      ON public.login_otp_challenges (user_id);
CREATE INDEX IF NOT EXISTS idx_login_otp_email     ON public.login_otp_challenges (email, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_login_otp_ticket
  ON public.login_otp_challenges (ticket) WHERE ticket IS NOT NULL;

ALTER TABLE public.login_otp_challenges ENABLE ROW LEVEL SECURITY;
-- مفيش أي policy: الوصول من التطبيق فقط عبر Prisma (service connection).

-- 2) سجل رسائل الواتساب (outbox/audit) -------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_phone            text NOT NULL,
  template            text NOT NULL,
  body                text NOT NULL DEFAULT '',
  status              text NOT NULL DEFAULT 'queued',
  provider_message_id text,
  error               text,
  student_id          uuid REFERENCES public.students(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  sent_at             timestamptz,
  CONSTRAINT wa_msg_status_chk CHECK (status IN ('queued','sent','failed')),
  CONSTRAINT wa_msg_template_chk CHECK (template IN ('login_otp','payment_approved','custom'))
);

CREATE INDEX IF NOT EXISTS idx_wa_msg_created ON public.whatsapp_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_msg_status  ON public.whatsapp_messages (status);
CREATE INDEX IF NOT EXISTS idx_wa_msg_student ON public.whatsapp_messages (student_id);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- 3) تنظيف التحديات القديمة (شغّلها دوريًا لو حبيت)
-- DELETE FROM public.login_otp_challenges WHERE created_at < now() - interval '7 days';
```

**تحقق:** الملف مكتوب وبس. **متشغّلوش.**

---

## Milestone 2 — موديلات Prisma

**عدّل:** `/vercel/share/v0-project/prisma/schema.prisma`
أضف الموديلين دول **في آخر الملف قبل قسم الـ `enum`s** (يعني قبل `enum aal_level`):

```prisma
model login_otp_challenges {
  id                String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id           String    @db.Uuid
  email             String
  channel           String
  destination       String
  code_hash         String
  expires_at        DateTime  @db.Timestamptz(6)
  attempts          Int       @default(0)
  sends             Int       @default(1)
  last_sent_at      DateTime  @default(now()) @db.Timestamptz(6)
  consumed_at       DateTime? @db.Timestamptz(6)
  ticket            String?
  ticket_expires_at DateTime? @db.Timestamptz(6)
  ip                String?
  user_agent        String?
  created_at        DateTime  @default(now()) @db.Timestamptz(6)

  @@index([user_id], map: "idx_login_otp_user")
  @@index([email, created_at(sort: Desc)], map: "idx_login_otp_email")
  @@schema("public")
}

model whatsapp_messages {
  id                  String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  to_phone            String
  template            String
  body                String    @default("")
  status              String    @default("queued")
  provider_message_id String?
  error               String?
  student_id          String?   @db.Uuid
  created_at          DateTime  @default(now()) @db.Timestamptz(6)
  sent_at             DateTime? @db.Timestamptz(6)

  @@index([created_at(sort: Desc)], map: "idx_wa_msg_created")
  @@index([status], map: "idx_wa_msg_status")
  @@index([student_id], map: "idx_wa_msg_student")
  @@schema("public")
}
```

> **ملاحظة مقصودة:** مش بنضيف علاقة `@relation` مع `User` ولا `students` عشان مانضطرش نعدّل الموديلات الموجودة (بيزوّد مخاطر). العلاقة موجودة في الـ DB كـ FK بس، والكود بيعمل الربط يدوي بـ `user_id` / `student_id`.

**بعدها:** `npx prisma generate` (بس). لو الأمر فشل بسبب الاتصال بالقاعدة، ده طبيعي — `generate` مبيحتاجش DB؛ لو ظهر خطأ validation صلّح الـ schema.

---

## Milestone 3 — متغيرات البيئة

**عدّل:** `/vercel/share/v0-project/.env.example` (لو مش موجود، اعمله)، وأضف:

```
# Evolution API (WhatsApp)
EVOLUTION_API_URL="https://wa.example.com"
EVOLUTION_API_KEY=""
EVOLUTION_INSTANCE="main"

# فلفل تشفير أكواد الـ OTP (سلسلة عشوائية طويلة)
OTP_PEPPER=""
```

في نهاية الـ Milestone، **قول لصاحب المشروع بالنص**: "محتاج تضيف `EVOLUTION_API_URL` و`EVOLUTION_API_KEY` و`EVOLUTION_INSTANCE` و`OTP_PEPPER` في Vars". متكتبش قيم بنفسك.

---

## Milestone 4 — طبقة الـ lib

### 4.1 `/vercel/share/v0-project/lib/phone.ts` (جديد — بدون `server-only` عشان الكلاينت يستخدم الماسك)

```ts
/** يحوّل رقم مصري لصيغة E.164 بدون + (مثال: 01012345678 -> 201012345678). */
export function normalizeEgyptPhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  let d = String(raw).replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('20')) {
    // 20 + 10 digits (1xxxxxxxxx)
    if (d.length === 12 && d[2] === '1') return d
    return null
  }
  if (d.startsWith('01') && d.length === 11) return `20${d.slice(1)}`
  if (d.startsWith('1') && d.length === 10) return `20${d}`
  return null
}

/** يخفي وسط الرقم للعرض: 201012345678 -> ‎+20 10••••5678 */
export function maskPhone(e164: string): string {
  if (e164.length < 6) return '••••'
  return `+${e164.slice(0, 4)}••••${e164.slice(-4)}`
}

/** يخفي الإيميل للعرض: ahmed@gmail.com -> a•••d@gmail.com */
export function maskEmail(email: string): string {
  const [user, domain] = email.split('@')
  if (!domain) return '••••'
  if (user.length <= 2) return `${user[0] ?? '•'}•••@${domain}`
  return `${user[0]}•••${user[user.length - 1]}@${domain}`
}
```

### 4.2 `/vercel/share/v0-project/lib/whatsapp.ts` (جديد، `server-only`)

المطلوب بالحرف:

```ts
import 'server-only'
import { prisma } from '@/lib/prisma'
import { normalizeEgyptPhone } from '@/lib/phone'

type Template = 'login_otp' | 'payment_approved' | 'custom'

function config() {
  const baseUrl = (process.env.EVOLUTION_API_URL || '').replace(/\/+$/, '')
  const apiKey = process.env.EVOLUTION_API_KEY || ''
  const instance = process.env.EVOLUTION_INSTANCE || ''
  return { baseUrl, apiKey, instance, ready: !!(baseUrl && apiKey && instance) }
}

/** هل الواتساب متظبط في البيئة؟ (مش معناه إن الـ instance متصل) */
export function isWhatsAppConfigured(): boolean {
  return config().ready
}

/** يتأكد إن instance الـ Evolution متصل فعلًا. لا يرمي — يرجّع bool. */
export async function checkWhatsAppConnection(): Promise<{ ok: boolean; state: string }> {
  const { baseUrl, apiKey, instance, ready } = config()
  if (!ready) return { ok: false, state: 'not_configured' }
  try {
    const res = await fetch(`${baseUrl}/instance/connectionState/${encodeURIComponent(instance)}`, {
      method: 'GET',
      headers: { apikey: apiKey },
      cache: 'no-store',
    })
    if (!res.ok) return { ok: false, state: `http_${res.status}` }
    const json: any = await res.json().catch(() => ({}))
    const state = json?.instance?.state ?? json?.state ?? 'unknown'
    return { ok: state === 'open', state: String(state) }
  } catch {
    return { ok: false, state: 'network_error' }
  }
}

/**
 * يبعت رسالة نصية واتساب ويسجّلها في whatsapp_messages.
 * ما يرميش أبدًا — يرجّع { ok, error }.
 */
export async function sendWhatsAppText(input: {
  phone: string
  text: string
  template: Template
  studentId?: string | null
  /** لو true: ما نخزّنش نص الرسالة (للأكواد) */
  redactBody?: boolean
}): Promise<{ ok: boolean; error?: string }> {
  const e164 = normalizeEgyptPhone(input.phone)
  const { baseUrl, apiKey, instance, ready } = config()

  const logRow = await prisma.whatsapp_messages.create({
    data: {
      to_phone: e164 ?? String(input.phone),
      template: input.template,
      body: input.redactBody ? '[redacted]' : input.text.slice(0, 2000),
      status: 'queued',
      student_id: input.studentId ?? null,
    },
    select: { id: true },
  }).catch(() => null)

  const fail = async (error: string) => {
    if (logRow) {
      await prisma.whatsapp_messages
        .update({ where: { id: logRow.id }, data: { status: 'failed', error } })
        .catch(() => {})
    }
    return { ok: false, error }
  }

  if (!e164) return fail('invalid_phone')
  if (!ready) return fail('not_configured')

  try {
    const res = await fetch(`${baseUrl}/message/sendText/${encodeURIComponent(instance)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: apiKey },
      body: JSON.stringify({ number: e164, text: input.text }),
      cache: 'no-store',
    })
    const json: any = await res.json().catch(() => ({}))
    if (!res.ok) return fail(`http_${res.status}: ${JSON.stringify(json).slice(0, 300)}`)

    const providerId = json?.key?.id ?? json?.messageId ?? null
    if (logRow) {
      await prisma.whatsapp_messages
        .update({
          where: { id: logRow.id },
          data: { status: 'sent', sent_at: new Date(), provider_message_id: providerId },
        })
        .catch(() => {})
    }
    return { ok: true }
  } catch (e: any) {
    return fail(`network: ${String(e?.message ?? e).slice(0, 300)}`)
  }
}

/** نص رسالة كود الدخول. */
export function loginOtpText(code: string, minutes: number) {
  return [
    'منصة عبد السلام للرياضيات',
    '',
    `كود تسجيل الدخول: *${code}*`,
    `الكود صالح لمدة ${minutes} دقايق.`,
    '',
    'لو مش إنت اللي طلبت الكود، متشاركوش مع حد وغيّر كلمة السر.',
  ].join('\n')
}

/** نص رسالة قبول الدفع. */
export function paymentApprovedText(input: {
  studentName: string
  orderCode: string
  total: number
  items: string[]
}) {
  const lines = [
    'منصة عبد السلام للرياضيات',
    '',
    `أهلاً ${input.studentName || 'يا بطل'} 👋`,
    `تم تأكيد دفع طلبك رقم ${input.orderCode} بمبلغ ${input.total} ج.م.`,
  ]
  if (input.items.length) {
    lines.push('', 'المحتوى المتاح لك الآن:', ...input.items.map((t) => `• ${t}`))
  }
  lines.push('', 'يلا ابدأ من صفحة كورساتي على المنصة. بالتوفيق!')
  return lines.join('\n')
}
```

> **مهم:** الإيموجي في نص واتساب مسموح (مش UI). **ممنوع** إيموجي في أي JSX.

### 4.3 `/vercel/share/v0-project/lib/login-otp.ts` (جديد، `server-only`)

```ts
import 'server-only'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { getGlobalSettings } from '@/lib/settings-data'

export type OtpChannel = 'email' | 'whatsapp'

export type LoginOtpConfig = {
  emailEnabled: boolean
  whatsappEnabled: boolean
  codeLength: number
  ttlMinutes: number
  maxAttempts: number
  resendCooldownSeconds: number
  maxSends: number
}

const DEFAULTS: LoginOtpConfig = {
  emailEnabled: false,
  whatsappEnabled: false,
  codeLength: 6,
  ttlMinutes: 5,
  maxAttempts: 5,
  resendCooldownSeconds: 60,
  maxSends: 3,
}

/** يقرأ إعدادات الـ OTP من settings.key='global' → security.loginOtp */
export async function getLoginOtpConfig(): Promise<LoginOtpConfig> {
  const s = await getGlobalSettings()
  const raw = (s.security as any)?.loginOtp ?? {}
  return {
    emailEnabled: raw.emailEnabled === true,
    whatsappEnabled: raw.whatsappEnabled === true,
    codeLength: Number(raw.codeLength) || DEFAULTS.codeLength,
    ttlMinutes: Number(raw.ttlMinutes) || DEFAULTS.ttlMinutes,
    maxAttempts: Number(raw.maxAttempts) || DEFAULTS.maxAttempts,
    resendCooldownSeconds: Number(raw.resendCooldownSeconds) || DEFAULTS.resendCooldownSeconds,
    maxSends: Number(raw.maxSends) || DEFAULTS.maxSends,
  }
}

export function generateCode(length: number): string {
  const max = 10 ** length
  return String(crypto.randomInt(0, max)).padStart(length, '0')
}

export function hashCode(code: string): string {
  const pepper = process.env.OTP_PEPPER || 'dev-pepper'
  return crypto.createHmac('sha256', pepper).update(code).digest('hex')
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

export function newTicket(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * يستهلك ticket صالح مرة واحدة. يرجّع userId لو تم، أو null.
 * تُستدعى من authorize() في auth.ts.
 */
export async function consumeOtpTicket(ticket: string, email: string): Promise<string | null> {
  if (!ticket) return null
  const row = await prisma.login_otp_challenges.findFirst({
    where: { ticket, email },
    select: { id: true, user_id: true, ticket_expires_at: true },
  })
  if (!row || !row.ticket_expires_at || row.ticket_expires_at < new Date()) return null

  // إبطال فوري (استخدام واحد)
  const cleared = await prisma.login_otp_challenges.updateMany({
    where: { id: row.id, ticket },
    data: { ticket: null, ticket_expires_at: null },
  })
  if (cleared.count !== 1) return null
  return row.user_id
}
```

---

## Milestone 5 — مسارات الـ API (ثلاث routes جديدة)

> النمط: نفس شكل `app/auth/register/route.ts` بالحرف (`NextRequest`, `NextResponse.json`, رسائل عربية، بدون `'use server'`).

### 5.1 `/vercel/share/v0-project/app/auth/login/start/route.ts`

المنطق بالترتيب الحرفي:
1. `body = { email, password, channel? }`. طبّع `email = email.trim().toLowerCase()`.
2. لو مفيش email أو password → 400 `'البريد الإلكتروني وكلمة السر مطلوبان.'`
3. `user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })`.
4. لو مفيش user أو `!user.encrypted_password` أو `!(await bcrypt.compare(password, user.encrypted_password))` →
   **رجّع 401 برسالة موحّدة** `'البريد الإلكتروني أو كلمة السر غير صحيحة.'` (نفس الرسالة في كل حالات الفشل — منع user enumeration).
5. اقرأ `profiles.role`. لو الدور **مش** `student` → `return NextResponse.json({ otpRequired: false })`.
6. `cfg = await getLoginOtpConfig()`. لو `!cfg.emailEnabled && !cfg.whatsappEnabled` → `{ otpRequired: false }`.
7. جيب الوجهات:
   - `student = await prisma.students.findFirst({ where: { user_id: user.id }, select: { id: true, phone: true } })`
   - `profile.phone` كـ fallback.
   - `phoneE164 = normalizeEgyptPhone(student?.phone ?? profile?.phone)`.
   - القنوات المتاحة = `[]`؛ ضيف `'email'` لو `cfg.emailEnabled && user.email`؛ ضيف `'whatsapp'` لو `cfg.whatsappEnabled && phoneE164 && isWhatsAppConfigured()`.
8. لو المتاح فاضي → 503 `'خدمة كود التحقق غير متاحة حاليًا. تواصل مع الدعم.'`
9. لو `channel` مش مبعوت:
   - لو المتاح فيه اختيار واحد → استخدمه.
   - لو اتنين → رجّع `{ otpRequired: true, needChannel: true, channels: [{ id:'email', label:'البريد الإلكتروني', hint: maskEmail(...) }, { id:'whatsapp', label:'واتساب', hint: maskPhone(...) }] }` **بدون** إنشاء تحدي.
10. لو `channel` مبعوت ومش في المتاح → 400 `'القناة غير متاحة.'`
11. **rate limit**: لو فيه تحدي لنفس الإيميل `created_at > now()-60s` وعدده >= 3 → 429 `'محاولات كثيرة. استنى دقيقة وحاول تاني.'`
12. أنشئ الكود: `code = generateCode(cfg.codeLength)`، صف في `login_otp_challenges` بـ `code_hash = hashCode(code)`, `expires_at = now + ttl`, `destination = channel==='email' ? user.email : phoneE164`, `ip`/`user_agent` من `request.headers` (`x-forwarded-for` أول قيمة، `user-agent`).
13. ابعت:
    - email → `sendLoginCode(user.email, code, cfg.ttlMinutes)` (Milestone 6).
    - whatsapp → `sendWhatsAppText({ phone: phoneE164, text: loginOtpText(code, cfg.ttlMinutes), template:'login_otp', studentId: student?.id, redactBody: true })`.
14. لو الإرسال فشل → امسح الصف (`delete`) ورجّع 502 `'تعذّر إرسال الكود. جرّب قناة تانية أو حاول بعد شوية.'`
15. نجاح → `{ otpRequired: true, challengeId, channel, hint, expiresInSeconds: ttl*60, resendCooldownSeconds }`.

**ممنوع** ترجّع الكود نفسه في الـ response أبدًا. **ممنوع** `console.log` للكود.

### 5.2 `/vercel/share/v0-project/app/auth/login/verify/route.ts`
1. `body = { challengeId, code }`. لو ناقص → 400.
2. جيب الصف. لو مش موجود → 400 `'الكود غير صحيح.'`
3. لو `consumed_at` مش null → 400 `'الكود اتستخدم بالفعل. اطلب كود جديد.'`
4. لو `expires_at < now` → 400 `'انتهت صلاحية الكود. اطلب كود جديد.'`
5. لو `attempts >= cfg.maxAttempts` → 429 `'حاولت كتير. اطلب كود جديد.'`
6. `attempts += 1` (update دايمًا **قبل** المقارنة).
7. لو `!safeEqual(hashCode(code), row.code_hash)` → 400 `'الكود غير صحيح.'` + رجّع `remainingAttempts`.
8. نجاح: `ticket = newTicket()`، حدّث الصف `{ consumed_at: now, ticket, ticket_expires_at: now+120s }`.
9. رجّع `{ ok: true, otpTicket: ticket, email: row.email }`.

### 5.3 `/vercel/share/v0-project/app/auth/login/resend/route.ts`
1. `body = { challengeId }`.
2. تحقق: الصف موجود، مش `consumed_at`، `sends < cfg.maxSends`، `last_sent_at` أقدم من `resendCooldownSeconds`. غير كده → 429 برسالة مناسبة.
3. كود جديد + `code_hash` جديد + `expires_at` جديد + `attempts = 0` + `sends += 1` + `last_sent_at = now`.
4. أعد الإرسال على **نفس** `channel` و`destination`.
5. رجّع `{ ok: true }`.

### 5.4 عدّل `authorize()` في `/vercel/share/v0-project/auth.ts`
- ضيف `otpTicket: { label: 'OTP Ticket', type: 'text' }` لكائن `credentials`.
- بعد التحقق من الباسورد وقراءة الدور، **قبل** الـ `return`:

```ts
if (role === 'student') {
  const cfg = await getLoginOtpConfig()
  if (cfg.emailEnabled || cfg.whatsappEnabled) {
    const ticket = (credentials.otpTicket as string | undefined) || ''
    const ticketUserId = await consumeOtpTicket(ticket, email)
    if (!ticketUserId || ticketUserId !== user.id) return null
  }
}
```

- **متغيّرش** أي حاجة تانية في الملف. الاستيرادات الجديدة: `getLoginOtpConfig`, `consumeOtpTicket` من `@/lib/login-otp`.

---

## Milestone 6 — قالب إيميل كود الدخول

**عدّل:** `/vercel/share/v0-project/lib/email.ts`
- **متلمسش** `sendActivationCode` ولا `activationEmailHtml`.
- ضيف دالة `loginCodeEmailHtml(code: string, minutes: number)` — انسخ نفس تنسيق `activationEmailHtml` بالحرف (نفس الألوان `#f5f1e8`, `#13294b`, نفس البنية) وغيّر النصوص لـ "كود تسجيل الدخول".
- ضيف:

```ts
export async function sendLoginCode(to: string, code: string, minutes: number) {
  await getTransporter().sendMail({
    from: fromAddress(),
    to,
    subject: `كود تسجيل الدخول: ${code}`,
    html: loginCodeEmailHtml(code, minutes),
    text: `كود تسجيل الدخول في منصة عبد السلام هو: ${code}\nالكود صالح لمدة ${minutes} دقايق.`,
  })
}
```

---

## Milestone 7 — واجهة تسجيل الدخول + إعدادات الأدمن + إشعار الدفع

### 7.1 `components/auth/auth-form.tsx`
- **متغيّرش** مسار التسجيل (`register` / `awaitingCode` / `handleVerify` / `handleResend`) — ده لكود التفعيل وبيفضل زي ما هو.
- ضيف state جديد للدخول:

```ts
type LoginStep = 'credentials' | 'channel' | 'otp'
const [loginStep, setLoginStep] = useState<LoginStep>('credentials')
const [otpChannels, setOtpChannels] = useState<{ id: 'email' | 'whatsapp'; label: string; hint: string }[]>([])
const [challengeId, setChallengeId] = useState('')
const [loginCode, setLoginCode] = useState('')
const [otpHint, setOtpHint] = useState('')
const [cooldown, setCooldown] = useState(0)
```

- عدّل الفرع `if (tab === 'login')` في `handleSubmit` بحيث **الأول** ينده `/auth/login/start`:
  - `otpRequired === false` → كمّل بالسلوك الحالي بالحرف: `signIn('credentials', { email, password, redirect: false })` → `getSession()` → نفس منطق `destination` و`status === 'موقوف'` و`recordLogin()` و`window.location.assign`.
  - `needChannel` → `setOtpChannels(...)`، `setLoginStep('channel')`.
  - غير كده → `setChallengeId`, `setOtpHint`, `setLoginStep('otp')`, `setCooldown(resendCooldownSeconds)`.
- دالة `chooseChannel(id)` → تنده `/auth/login/start` تاني بنفس الإيميل/الباسورد + `channel: id` → تروح لـ `'otp'`.
- دالة `submitLoginOtp()` → `/auth/login/verify` → لو نجح: `signIn('credentials', { email: loginEmail.trim(), password: loginPassword, otpTicket: result.otpTicket, redirect: false })` وبعدها **نفس** منطق ما بعد الدخول الموجود حاليًا (getSession + destination + موقوف + recordLogin + assign).
  - **مهم:** لازم تنقل منطق ما بعد الدخول لدالة واحدة `finishLogin()` وتنديها من المكانين، عشان مايتكررش ويحصل اختلاف.
- دالة `resendLoginOtp()` → `/auth/login/resend` + `setCooldown(...)`.
- عدّاد الكولداون: `useEffect` بـ `setInterval` ينقّص كل ثانية ويتوقف عند 0 مع `clearInterval` في الـ cleanup.
- شاشة `'otp'`: **أعِد استخدام نفس** JSX بتاع `awaitingCode` (نفس الكلاسات والأيقونة `ShieldCheck` ونفس input الكود بـ `dir="ltr"` و`inputMode="numeric"`) بس بنصوص: "أكّد تسجيل دخولك" + "بعتنالك كود على {otpHint}" + زر "تأكيد الدخول" + "ابعت كود تاني ({cooldown})" لما `cooldown > 0` يكون disabled + زر رجوع يرجّع `loginStep` لـ `'credentials'`.
- شاشة `'channel'`: كاردين قابلين للضغط (Mail / MessageCircle من lucide) بنفس ستايل الكاردات الموجودة، كل واحد بيبين `label` و`hint`.
- **DEMO_ADMIN** سيبه زي ما هو (الأدمن مش عليه OTP فعلًا).
- **escape** أي apostrophe في JSX (`&apos;`).

### 7.2 تبويب الأمان في الإعدادات
**عدّل:** `/vercel/share/v0-project/components/settings/settings-panel.tsx`
- جوّه `activeTab === 'security'` (بعد التوجلين الموجودين) أضف قسم بعنوان "كود تسجيل الدخول (تحقق بخطوتين)" فيه:
  - `ToggleSwitch` لـ `otpEmailEnabled` — عنوان "كود على البريد الإلكتروني".
  - `ToggleSwitch` لـ `otpWhatsappEnabled` — عنوان "كود على الواتساب".
  - نص توضيحي: "لو الاتنين مقفولين، الطالب يدخل بكلمة السر بس. لو الاتنين مفتوحين، الطالب يختار."
  - حقول رقمية (Input type=number, dir=ltr) لـ `otpTtlMinutes` (1–15) و`otpMaxAttempts` (3–10).
  - تحذير `text-destructive` لما `otpWhatsappEnabled` يبقى true: "لازم تكون ضابط EVOLUTION_API_URL و EVOLUTION_API_KEY و EVOLUTION_INSTANCE في إعدادات البيئة."
- في `newSettings` (سطر ~286) عدّل:

```ts
security: {
  requireEmailVerification,
  allowRegistrations,
  loginOtp: {
    emailEnabled: otpEmailEnabled,
    whatsappEnabled: otpWhatsappEnabled,
    codeLength: 6,
    ttlMinutes: otpTtlMinutes,
    maxAttempts: otpMaxAttempts,
    resendCooldownSeconds: 60,
    maxSends: 3,
  },
},
```

- الـ initial state يقرأ من `settings.security?.loginOtp?.*` مع نفس الديفولتس اللي في `lib/login-otp.ts`.
- أضف كذلك في نفس القسم **مؤشّر حالة الواتساب**: زر "اختبار الاتصال" ينده server action جديدة في `app/admin/settings/actions.ts`:

```ts
export async function testWhatsAppConnection() {
  if (!(await hasResourceAccess('settings', 'manage'))) return { error: 'غير مسموح. لازم تكون أدمن.' }
  const { ok, state } = await checkWhatsAppConnection()
  return { success: true, ok, state }
}
```
واعرض النتيجة بـ `toast.success` / `toast.error`.

### 7.3 رسالة قبول الدفع
**عدّل:** `/vercel/share/v0-project/app/admin/payments/orders-actions.ts` — جوّه `updateOrderStatus`، **بعد** نجاح الـ `update` و**قبل** الـ `return`:

```ts
if (status === 'approved') {
  void (async () => {
    try {
      const full = await prisma.orders.findUnique({
        where: { id },
        select: {
          code: true, student_name: true, student_phone: true, total: true, student_id: true,
          order_items: { select: { lecture_title: true } },
        },
      })
      if (!full?.student_phone) return
      await sendWhatsAppText({
        phone: full.student_phone,
        text: paymentApprovedText({
          studentName: full.student_name ?? '',
          orderCode: full.code,
          total: Number(full.total),
          items: full.order_items.map((i) => i.lecture_title ?? '').filter(Boolean),
        }),
        template: 'payment_approved',
        studentId: full.student_id ?? null,
      })
    } catch {
      // fire-and-forget: الطلب اتقبل بالفعل، فشل الواتساب ما يوقفش حاجة
    }
  })()
}
```

- استيراد `sendWhatsAppText, paymentApprovedText` من `@/lib/whatsapp`.
- **مهم:** لو `orders.student_phone` فاضي، اسقط بصمت — **ممنوع** ترجّع error للأدمن بسبب الواتساب.

---

## قائمة التحقق النهائية (اعملها كلها وقول النتيجة)

- [ ] `npx tsc --noEmit` نضيف.
- [ ] `npx prisma generate` ناجح.
- [ ] ملف `prisma/sql/W01_whatsapp_login_otp.sql` موجود ومكتوب بالكامل، ومحدّش شغّله.
- [ ] الأدمن (`admin@test.com`) لسه بيدخل من غير كود مهما كانت الإعدادات.
- [ ] الاتنين مقفولين → مسار دخول الطالب مطابق للسلوك القديم 100%.
- [ ] واحدة بس مفتوحة → مفيش شاشة اختيار قناة.
- [ ] الاتنين مفتوحين → شاشة اختيار قناة.
- [ ] كود غلط 5 مرات → `'حاولت كتير. اطلب كود جديد.'`
- [ ] `signIn` من غير `otpTicket` والـ OTP مفعّل → فشل الدخول.
- [ ] الـ ticket مبيشتغلش مرتين.
- [ ] مفيش أي مكان بيرجّع أو يـ log الكود.
- [ ] قبول طلب دفع بيسجّل صف في `whatsapp_messages`.

## فخاخ متقعش فيها

1. **متعملش OTP على الأدمن/المساعد** — لو الواتساب وقع تقفل المنصة على نفسك.
2. **متستخدمش `Math.random()`** للأكواد — `crypto.randomInt` بس.
3. **متخزّنش الكود نص صريح** — `code_hash` فقط.
4. **متغيّرش رسالة الخطأ** بين "إيميل غلط" و"باسورد غلط" — واحدة موحّدة.
5. **متحوّلش `authorize()` لتنفيذ إرسال رسائل** — الإرسال في الـ routes بس.
6. **متضيفش provider جديد لـ NextAuth** — Credentials واحد وبس.
7. الرقم في `auth.users.phone` عليه `@unique` — **ممنوع** تكتب فيه في الخطة دي خالص.
