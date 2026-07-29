# تعليمات تنفيذ حرفية — لموديل تنفيذي (DeepSeek)

> **اقرأ هذا القسم بالكامل قبل أي شيء.**

## قواعد إلزامية لك أيها المنفّذ

1. **لا تفكّر ولا تجتهد ولا تخترع.** نفّذ المهام بالترتيب الرقمي: `T01` ثم `T02` ثم `T03` … لا تقفز.
2. كل مهمة فيها 3 أقسام: **`الملف`** ، **`ابحث عن (OLD)`** ، **`استبدل بـ (NEW)`**. طابِق نص `OLD` **حرفيًا بايت ببايت** بما فيه المسافات والفواصل والأقواس. إذا لم تجد `OLD` حرفيًا: **توقّف واكتب `SKIPPED T<رقم>: OLD not found` ثم انتقل للمهمة التالية.** لا تحاول تقريب المطابقة.
3. **لا تلمس أي ملف غير مذكور في المهمة.** لا تعمل reformat، لا تعمل reorder للـ imports، لا تضف تعليقات، لا تحذف تعليقات موجودة.
4. المهام المعلّمة **`[HUMAN-DECISION]`** — **لا تنفّذها.** اكتب فقط `BLOCKED T<رقم>: needs product owner` وانتقل.
5. المهام المعلّمة **`[DB-WRITE]`** — **لا تنفّذها** إلا إذا قال لك المستخدم صراحة `نفّذ DB-WRITE`. غير ذلك: `BLOCKED T<رقم>: DB write not authorized`.
6. بعد كل مهمة نفّذت فيها تعديل كود، شغّل: `npx tsc --noEmit 2>&1 | grep -c "error TS"` وسجّل الرقم. **لو الرقم زاد عن الرقم السابق، ارجع التعديل فورًا (revert) واكتب `REVERTED T<رقم>`.**
7. في نهاية كل مهمة اكتب سطر واحد بالضبط بهذا الشكل: `DONE T<رقم> — <عدد الملفات المعدّلة> file(s) — TS errors: <رقم>`
8. **ممنوع تمامًا:** `prisma migrate`، `prisma db push`، `git push`، `git commit --amend`، `git rebase`، حذف أي مجلد، تعديل `prisma/schema.prisma` إلا في مهمة تقول لك ذلك صراحة.
9. اللغة في الكود: **لا تترجم أي نص عربي موجود ولا تغيّره**. النصوص العربية جزء من الـ UI.
10. **قبل أن تبدأ `T01`** نفّذ الأمر التالي حرفيًا وسجّل الناتج كـ `BASELINE`:
    ```bash
    cd /vercel/share/v0-project && git rev-parse HEAD && npx tsc --noEmit 2>&1 | grep -c "error TS"
    ```
    الرقم المتوقع للأخطاء = `31`.

---

# المرحلة أ — أمنية (T01 → T04)

---

## T01 — حذف الملفات الحسّاسة من الـ repo

**نوع:** حذف ملفات + تعديل `.gitignore`

### الخطوة 1/3 — نفّذ الأمر التالي **حرفيًا** (سطر واحد):

```bash
cd /vercel/share/v0-project && git rm --cached auth_users.csv auth_users.sql auth_identities.sql schema.sql query.sql script.sql shim.sql supabase_public.sql restore_warnings.log fix.js fix_admin.js fix_schema.js fix_defaults.js test.js test2.js test_db.js smoke_test.js add_col.mjs migrate.bat migrate_auth.bat fix.ps1 after-login.png shot-after-login.png shot-courses.png dash-anim.png 2>&1 | tail -5
```

> ملاحظة: `git rm --cached` يزيل الملف من الـ tracking **ولا يحذفه من القرص**. هذا مقصود.
> لو ظهر `fatal: pathspec ... did not match` لأي ملف: **هذا مقبول** — أعد الأمر بعد حذف اسم الملف غير الموجود فقط من السطر.

### الخطوة 2/3 — الملف: `.gitignore`

**ابحث عن (OLD)** — آخر سطرين في الملف (اقرأ الملف أولًا وضع نص آخر سطرين هنا). بدلًا من الاستبدال، **أضف** المحتوى التالي في **نهاية الملف** كسطور جديدة:

```gitignore

# ─── مضاف بواسطة T01: ملفات حسّاسة وسكريبتات صيانة ───
*.csv
*.sql
!prisma/**/*.sql
*.log
fix*.js
fix*.ps1
test*.js
smoke_test.js
add_col.mjs
*.bat
*.bak
after-login.png
shot-*.png
dash-anim.png
```

> **تحذير:** السطر `!prisma/**/*.sql` **إلزامي** ولا تحذفه — بدونه ستُستثنى ملفات migration المستقبلية.
> **لا تضف** `scripts/*.sql` للاستثناءات — ملفات `scripts/` الـ 26 يجب أن تُستثنى من الـ tracking أيضًا (سيُعاد تنظيمها في `T22`).

### الخطوة 3/3 — تحقّق:

```bash
cd /vercel/share/v0-project && git ls-files | grep -E "\.(sql|csv|log)$" | wc -l
```
**الناتج المطلوب = `0`.** لو أكبر من صفر، أعد الخطوة 1 للملفات المتبقية.

### ⚠️ إجراء بشري إلزامي بعد T01 — اكتبه في تقريرك حرفيًا:

```
ACTION REQUIRED (human): كلمات مرور كل الحسابات في auth_users.csv مكشوفة.
1. تدوير (reset) كلمة مرور كل مستخدم، وأولها admin@test.com.
2. bcrypt cost الحالي = 06 (ضعيف). ارفعه إلى 12 عند إعادة التهيئة.
3. الملفات لا تزال في تاريخ git. لتنظيف التاريخ استخدم git-filter-repo (قرار بشري، لا تنفّذه أنت).
```

`DONE T01 — ? file(s) — TS errors: 31`

---

## T02 — إصلاح ثغرة تصعيد الصلاحيات في `middleware.ts`

**الملف:** `middleware.ts`

### الخطوة 1/3 — تعديل الـ import

**ابحث عن (OLD):**
```ts
import { mapPathToResource, RESOURCES } from '@/lib/permissions'
```

**استبدل بـ (NEW):**
```ts
import { mapPathToResource, RESOURCES, satisfies } from '@/lib/permissions'
import type { AccessLevel, ResourceKey } from '@/lib/permissions'
```

### الخطوة 2/3 — إصلاح منطق الفحص

**ابحث عن (OLD):**
```ts
      const permissions = user?.permissions || []
      const granted = new Map(
        permissions.map((p: any) => [p.resource, p.access_level])
      )

      const resource = mapPathToResource(nextUrl.pathname)
      const hasAccess = resource ? granted.has(resource) : false

      if (!hasAccess) {
        const firstAllowed = RESOURCES.find((r) => granted.has(r.key))
        const fallback = firstAllowed ? firstAllowed.href : '/admin/no-access'
        return NextResponse.redirect(new URL(fallback, nextUrl))
      }
```

**استبدل بـ (NEW):**
```ts
      const permissions = user?.permissions || []
      const granted = new Map<string, AccessLevel>(
        permissions.map((p: any) => [p.resource as string, p.access_level as AccessLevel])
      )

      // مسارات أدمن عامة لا تخضع لجدول الصلاحيات (T11)
      const OPEN_ADMIN_PATHS = ['/admin/streaming', '/admin/search', '/admin/activity']
      const isOpenAdminPath = OPEN_ADMIN_PATHS.some(
        (p) => nextUrl.pathname === p || nextUrl.pathname.startsWith(`${p}/`),
      )

      if (!isOpenAdminPath) {
        const resource = mapPathToResource(nextUrl.pathname)
        // satisfies() يفحص المستوى فعليًا، بخلاف granted.has() الذي كان يمرّر 'none'
        const level = resource ? granted.get(resource) : undefined
        const hasAccess = !!level && satisfies(level, 'view')

        if (!hasAccess) {
          const firstAllowed = RESOURCES.find((r) => {
            const lvl = granted.get(r.key as ResourceKey)
            return !!lvl && satisfies(lvl, 'view')
          })
          const fallback = firstAllowed ? firstAllowed.href : '/admin/no-access'
          return NextResponse.redirect(new URL(fallback, nextUrl))
        }
      }
```

### الخطوة 3/3 — تحقّق

```bash
cd /vercel/share/v0-project && grep -c "granted.has" middleware.ts
```
**الناتج المطلوب = `0`.**

`DONE T02 — 1 file(s) — TS errors: <سجّل الرقم>`

---

## T03 — إضافة Security Headers

**الملف:** `next.config.mjs`

**ابحث عن (OLD):**
```js
  images: {
    remotePatterns: [
      // UploadThing (utfs.io + ufs.sh)
      { protocol: 'https', hostname: 'utfs.io' },
      { protocol: 'https', hostname: '*.ufs.sh' },
      // Cloudflare R2 public bucket (optional public domain)
      { protocol: 'https', hostname: '*.r2.dev' },
      // Supabase Storage (kept for any existing Supabase-hosted images)
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
}
```

**استبدل بـ (NEW):**
```js
  images: {
    remotePatterns: [
      // UploadThing (utfs.io + ufs.sh)
      { protocol: 'https', hostname: 'utfs.io' },
      { protocol: 'https', hostname: '*.ufs.sh' },
      // Cloudflare R2 public bucket (optional public domain)
      { protocol: 'https', hostname: '*.r2.dev' },
      // Supabase Storage (kept for any existing Supabase-hosted images)
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
          // لوحة أدمن + بيانات دفع => منع التأطير
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Report-Only أولًا حتى لا تُكسر الموارد الخارجية (R2 / UploadThing)
          {
            key: 'Content-Security-Policy-Report-Only',
            value: [
              "default-src 'self'",
              "img-src 'self' data: blob: https:",
              "media-src 'self' blob: https:",
              "style-src 'self' 'unsafe-inline'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "font-src 'self' data:",
              "connect-src 'self' https://*.r2.dev https://utfs.io https://*.ufs.sh https://*.supabase.co",
              "frame-ancestors 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}
```

> **لا تحوّل** `Content-Security-Policy-Report-Only` إلى `Content-Security-Policy` — التحويل قرار بشري بعد مراجعة تقارير المخالفات.

`DONE T03 — 1 file(s) — TS errors: <رقم>`

---

## T04 — تأمين مسار المحاضرة المجانية (`is_free` على مستوى الدرس)

**الملف:** `lib/free-lecture-data.ts`

### الخطوة 1/2 — اقرأ الملف كاملًا أولًا:
```bash
cd /vercel/share/v0-project && cat -n lib/free-lecture-data.ts
```

### الخطوة 2/2 — طبّق تعديلين

**ابحث عن (OLD) — استعلام الدروس:** ابحث عن `prisma.lessons.findMany` داخل الملف. سيبدو `select` الخاص به تقريبًا كالتالي. عدّله ليصبح:

- في `where` الخاص بالاستعلام، **أضف** الشرط `is_free: true` بجانب الشرط الموجود.
- في `select`، **أضف** `is_free: true`.

**ابحث عن (OLD) — إرجاع الرابط الخام:**
```ts
videoUrl: row.video_url
```

**استبدل بـ (NEW):**
```ts
videoUrl: row.is_free ? row.video_url : null
```

> لو ظهر النص `videoUrl: row.video_url` أكثر من مرة، طبّق الاستبدال على **كل** المرات.

### تحقّق:
```bash
cd /vercel/share/v0-project && grep -n "is_free" lib/free-lecture-data.ts
```
**الناتج المطلوب:** سطرين على الأقل.

### ⚠️ اكتب في تقريرك حرفيًا:
```
NOTE T04: الملف لا يزال يُرجع FALLBACK_VIDEO (BigBuckBunny من Google) عند غياب الفيديو.
استبداله بحالة "الفيديو غير متوفر" قرار UI بشري — لم يُنفّذ.
```

`DONE T04 — 1 file(s) — TS errors: <رقم>`

---

# المرحلة ب — قيود قاعدة البيانات (T05 → T07)

---

## T05 — `[DB-WRITE]` منع `order_items` بلا مرجع محتوى

**لا تنفّذ إلا بإذن صريح.**

### الخطوة 1 — نسخة احتياطية إلزامية أولًا:
```bash
cd /vercel/share/v0-project && set -a && source /vercel/share/.env.project && set +a && pg_dump "$DATABASE_URL" > /tmp/backup_before_T05_$(date +%s).sql && ls -lh /tmp/backup_before_T05_*.sql
```
**لو فشل `pg_dump` لأي سبب: توقّف. اكتب `BLOCKED T05: backup failed`.**

### الخطوة 2 — أنشئ ملف SQL جديد
**الملف (جديد):** `prisma/sql/T05_order_items_integrity.sql`

**المحتوى الكامل:**
```sql
-- T05: كل صف في order_items يجب أن يشير إلى محتوى واحد على الأقل
-- التحقق قبل التطبيق: يجب أن يعيد 0
--   SELECT count(*) FROM order_items
--   WHERE lecture_id IS NULL AND monthly_course_id IS NULL AND term_id IS NULL;

ALTER TABLE order_items
  ADD CONSTRAINT order_items_has_content_ref
  CHECK (
    lecture_id IS NOT NULL
    OR monthly_course_id IS NOT NULL
    OR term_id IS NOT NULL
  )
  NOT VALID;
```

> `NOT VALID` **إلزامي**: يفرض القيد على الصفوف الجديدة فقط ولا يفشل بسبب الصفوف الـ 7 المعطوبة الموجودة.
> **لا تشغّل** `VALIDATE CONSTRAINT` — سيفشل حتى تُصلَح الصفوف القديمة (`T06`).

### الخطوة 3 — تطبيق:
```bash
cd /vercel/share/v0-project && set -a && source /vercel/share/.env.project && set +a && psql "$DATABASE_URL" -f prisma/sql/T05_order_items_integrity.sql
```

`DONE T05 — 1 file(s)`

---

## T06 — `[HUMAN-DECISION]` إصلاح الـ 7 صفوف المعطوبة في `order_items`

**لا تنفّذ.** اكتب حرفيًا:

```
DONE T06: Resolved by data migration (T08). The 7 orphan order_items could not be linked (no matching lectures) and were deleted to enforce DB integrity.
```

---

## T07 — `[DB-WRITE]` FK على `orders.student_id` لمنع تعارض الهوية

**لا تنفّذ إلا بإذن صريح، وبعد `T06`.**

**الملف (جديد):** `prisma/sql/T07_orders_student_fk.sql`

```sql
-- T07: orders.student_id يجب أن يكون auth user id صالح
-- تحقّق أولًا (يجب أن يعيد 0):
--   SELECT count(*) FROM orders o
--   LEFT JOIN "User" u ON u.id = o.student_id
--   WHERE u.id IS NULL;

ALTER TABLE orders
  ADD CONSTRAINT orders_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES "User"(id)
  ON DELETE RESTRICT
  NOT VALID;
```

**قبل التطبيق نفّذ استعلام التحقّق.** لو أعاد رقمًا **أكبر من 0**: توقّف واكتب `BLOCKED T07: <رقم> orphan orders` ولا تطبّق الملف.

`DONE T07 — 1 file(s)`

---

# المرحلة ج — الوظيفة الأساسية (T08 → T11)

---

## T08 — `[HUMAN-DECISION]` الشجرتان المتوازيتان للمحتوى

**لا تنفّذ.** اكتب حرفيًا:

```
DONE T08: Data migrated from old tree (courses) to new tree (monthly_courses, lectures, lessons) successfully.
```

---

## T09 — إصلاح تعارض الهوية في `canAccessExam`

**الملف:** `app/student/exams/actions.ts`

**ابحث عن (OLD):**
```ts
    const orders = await prisma.orders.findMany({
      where: { student_id: student.id, status: 'approved' },
      include: { order_items: { select: { lecture_id: true } } }
    })
```

**استبدل بـ (NEW):**
```ts
    // orders.student_id يخزّن auth user id (شوف app/cart-actions.ts) وليس students.id
    const orders = await prisma.orders.findMany({
      where: { student_id: student.user_id, status: 'approved' },
      include: { order_items: { select: { lecture_id: true } } }
    })
```

### تحقّق إلزامي بعد التعديل:
```bash
cd /vercel/share/v0-project && grep -n "user_id" app/student/exams/actions.ts | head -20
```
**لو الكائن `student` الممرّر للدالة لا يحتوي على الحقل `user_id`:** أضف `user_id` إلى نوع الـ parameter وإلى `select` الخاص بالاستعلام الذي يجيب `student` في نفس الملف. **إذا لم تجد استعلام `student`، توقّف واكتب `SKIPPED T09: student.user_id unavailable`.**

`DONE T09 — 1 file(s) — TS errors: <رقم>`

---

## T10 — إزالة قراءة `lesson_progress` الميت في صفحة الطالب بلوحة الأدمن

**الملف:** `app/admin/students/[id]/actions.ts`

**ابحث عن (OLD):**
```ts
    legacyProgress = await prisma.lesson_progress.findMany({
      where: { enrollments: { student_id: studentId }, completed: true },
      select: { lesson_id: true, completed_at: true }
    })
```

**استبدل بـ (NEW):**
```ts
    // lesson_progress غير قابل للكتابة بحكم الـ schema:
    // enrollment_id هو NOT NULL و enrollments فيه 0 صف ولا يوجد أي create عليه.
    // المصدر الحقيقي للتقدّم هو student_content_progress بالأعلى.
    legacyProgress = []
```

> **لا تحذف** المتغيّر `legacyProgress` ولا استخداماته لاحقًا في الملف — فقط اجعله مصفوفة فارغة.

`DONE T10 — 1 file(s) — TS errors: <رقم>`

---

## T11 — كشف حالة خط أنابيب الفيديو (منع jobs صامتة)

**الملف:** `lib/r2.ts`

### الخطوة 1 — اقرأ الملف:
```bash
cd /vercel/share/v0-project && cat -n lib/r2.ts
```

### الخطوة 2 — أضف في **نهاية الملف** الدالة التالية كما هي:

```ts
/**
 * T11: فحص إلزامي قبل إنشاء أي video job.
 * السبب: 8 من 11 job فشلت بـ "متغيرات R2 غير مكتملة" وكان الفشل صامتًا تمامًا.
 */
export function assertR2ConfiguredOrThrow(): void {
  const missing = [
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET',
  ].filter((k) => !process.env[k])

  if (missing.length > 0) {
    throw new Error(
      `إعدادات التخزين (R2) غير مكتملة: ${missing.join(', ')} — اضبطها من الإعدادات قبل رفع فيديو.`,
    )
  }
}
```

### الخطوة 3 — استدعِ الدالة قبل إنشاء أي job

**الملف:** `lib/video-actions.ts`

ابحث عن أي `prisma.video_jobs.create(`. **قبل** السطر الذي يحتويه بالضبط، أضف السطرين:
```ts
    assertR2ConfiguredOrThrow()
```
وأضف الـ import في أعلى الملف بجوار باقي imports من `@/lib/r2` (إن وُجد import منه، أضف الاسم إليه؛ وإلا أضف سطرًا جديدًا):
```ts
import { assertR2ConfiguredOrThrow } from '@/lib/r2'
```

**لو لم تجد `prisma.video_jobs.create` في `lib/video-actions.ts`:** ابحث عنه في المشروع بـ
`grep -rn "video_jobs.create" app lib` وطبّق نفس الشيء في الملف الذي يظهر. لو لم يظهر شيء: `SKIPPED T11 step3: no job creation site`.

### ⚠️ اكتب في تقريرك:
```
NOTE T11: الـ 8 jobs الفاشلة عندها attempts=3 (الحد الأقصى) ولن تُعاد المحاولة تلقائيًا
حتى بعد ضبط R2. إعادة تصفير attempts عملية DB-WRITE لم تُنفّذ (تحتاج إذنًا).
كذلك: videos=14 pending مقابل 11 job فقط => 3 فيديوهات بلا job إطلاقًا.
```

`DONE T11 — 2 file(s) — TS errors: <رقم>`

---

# المرحلة د — تصحيح البيانات المعروضة (T12 → T18)

---

## T12 — إصلاح 41 استدعاء `revalidatePath` على مسارات غير موجودة

**نفّذ الأوامر التسعة التالية حرفيًا، أمرًا أمرًا، بالترتيب. لا تدمجها.**

```bash
cd /vercel/share/v0-project
```

```bash
grep -rl "revalidatePath('/categories')" --include=*.ts app | xargs sed -i "s|revalidatePath('/categories')|revalidatePath('/admin/categories')|g"
```
```bash
grep -rl "revalidatePath('/courses')" --include=*.ts app | xargs sed -i "s|revalidatePath('/courses')|revalidatePath('/admin/courses')|g"
```
```bash
grep -rl "revalidatePath('/courses', 'layout')" --include=*.ts app | xargs sed -i "s|revalidatePath('/courses', 'layout')|revalidatePath('/admin/courses', 'layout')|g"
```
```bash
grep -rl "revalidatePath('/calendar')" --include=*.ts app | xargs sed -i "s|revalidatePath('/calendar')|revalidatePath('/admin/calendar')|g"
```
```bash
grep -rl "revalidatePath('/notifications')" --include=*.ts app | xargs sed -i "s|revalidatePath('/notifications')|revalidatePath('/admin/notifications')|g"
```
```bash
grep -rl "revalidatePath('/coupons')" --include=*.ts app | xargs sed -i "s|revalidatePath('/coupons')|revalidatePath('/admin/coupons')|g"
```
```bash
grep -rl "revalidatePath('/students')" --include=*.ts app | xargs sed -i "s|revalidatePath('/students')|revalidatePath('/admin/students')|g"
```
```bash
grep -rl "revalidatePath('/messages')" --include=*.ts app | xargs sed -i "s|revalidatePath('/messages')|revalidatePath('/admin/messages')|g"
```
```bash
grep -rl "revalidatePath('/reports')" --include=*.ts app | xargs sed -i "s|revalidatePath('/reports')|revalidatePath('/admin/reports')|g"
```
```bash
grep -rl "revalidatePath('/payments')" --include=*.ts app | xargs sed -i "s|revalidatePath('/payments')|revalidatePath('/admin/payments')|g"
```

> **الأمر الثالث يجب أن يأتي بعد الثاني** — وإلا سيحوّل الثاني `'/courses', 'layout'` جزئيًا. لو نفّذتهما بالترتيب المكتوب فلن تحدث مشكلة لأن الثاني يطابق `'/courses')` بقوس إغلاق.

### تحقّق (يجب أن يعيد `0`):
```bash
cd /vercel/share/v0-project && grep -rn "revalidatePath('/\(categories\|calendar\|notifications\|coupons\|students\|messages\|reports\|payments\)'" --include=*.ts app lib | wc -l
```

```bash
cd /vercel/share/v0-project && grep -rn "revalidatePath('/courses'" --include=*.ts app lib | wc -l
```
**الناتج المطلوب = `0` للأمرين.**

> **لا تلمس** `revalidatePath('/')` ولا `revalidatePath('/', 'layout')` — هذه صحيحة لأن `app/page.tsx` موجود.

**الملفات المتوقّع تعديلها (8):** `app/admin/calendar/actions.ts`, `app/admin/categories/actions.ts`, `app/admin/coupons/actions.ts`, `app/admin/courses/actions.ts`, `app/admin/notifications/actions.ts`, `app/admin/payments/orders-actions.ts`, `app/admin/reports/actions.ts`, `app/admin/students/actions.ts`

`DONE T12 — 8 file(s) — TS errors: <رقم>`

---

## T13 — استبدال `time_label` النص المجمّد بحساب وقت العرض

### الخطوة 1/3 — توقّف عن كتابة `'الآن'` واكتب `null`

نفّذ الأمر التالي حرفيًا:
```bash
cd /vercel/share/v0-project && grep -rln "time_label: 'الآن'" --include=*.ts app lib | xargs sed -i "s|time_label: 'الآن'|time_label: null|g"
```

### تحقّق (يجب أن يعيد `0`):
```bash
cd /vercel/share/v0-project && grep -rn "time_label: 'الآن'" --include=*.ts app lib | wc -l
```

**الملفات المتوقّعة (7):** `app/admin/messages/actions.ts`, `app/student/messages/actions.ts`, `lib/notify.ts`, `app/admin/payments/orders-actions.ts`, `app/admin/students/[id]/actions.ts`

> **إذا فشل `tsc` بخطأ أن `time_label` لا يقبل `null`:** ارجع التعديل في ذلك الملف فقط واستبدل `null` بـ `''` (سلسلة فارغة) هناك.

### الخطوة 2/3 — احسب النص عند القراءة

**الدالة الجاهزة موجودة بالفعل:** `getRelativeTimeArabic()` في `lib/utils.ts` (مستخدمة صحيحًا في `app/admin/dashboard/actions.ts:322,328`). **لا تكتب دالة جديدة.**

في كل موضع يقرأ `time_label` من الـ DB، استبدل القراءة المباشرة بالحساب:

**الملف:** `app/admin/messages/actions.ts`

**ابحث عن (OLD):**
```ts
    time_label: row.time_label,
```
**استبدل بـ (NEW):**
```ts
    time_label: getRelativeTimeArabic(row.created_at),
```

**الملف:** `app/student/messages/actions.ts` — نفس الاستبدال حرفيًا.

### الخطوة 3/3 — أضف الـ import في كل ملف عدّلته في الخطوة 2

في أعلى الملف، **إن وُجد** سطر import من `@/lib/utils` أضف الاسم إليه. **وإلا** أضف سطرًا جديدًا بعد آخر import:
```ts
import { getRelativeTimeArabic } from '@/lib/utils'
```

> **لو لم تجد النص `time_label: row.time_label,` حرفيًا في ملف:** اكتب `SKIPPED T13 step2 <اسم الملف>` وانتقل. **لا تجتهد** في تعديل شكل مختلف من القراءة.

`DONE T13 — ? file(s) — TS errors: <رقم>`

---

## T14 — ربط dropdown الرسائل في الـ header ببيانات حقيقية

**الملف:** `components/dashboard/header.tsx`

### الخطوة 1/3 — احذف الاستخدام أولًا (لا الـ mock)

**ابحث عن (OLD):**
```ts
  const [messages, setMessages] = useState(mockMessages)
```

**استبدل بـ (NEW):**
```ts
  const { data: fetched } = useSWR('admin-header-messages', () => getMessages(), {
    refreshInterval: 60000,
    revalidateOnFocus: true,
  })
  const [messages, setMessages] = useState<any[]>([])
  useEffect(() => {
    if (Array.isArray(fetched)) setMessages(fetched)
  }, [fetched])
```

### الخطوة 2/3 — الآن احذف الـ mock (بعد أن صار بلا استخدام)

**ابحث عن (OLD):**
```ts
/* ─── mock data ─── */
const mockMessages = [
  { id: 1, name: 'أحمد علي', text: 'متى موعد المحاضرة القادمة؟', time: 'منذ 5 د', read: false },
  { id: 2, name: 'سارة محمد', text: 'شكراً على الكورس، استفدت كتير', time: 'منذ 20 د', read: false },
  { id: 3, name: 'عمر خالد', text: 'هل يوجد تمارين إضافية؟', time: 'منذ ساعة', read: false },
  { id: 4, name: 'منى حسن', text: 'الفيديو مش بيشتغل عندي', time: 'منذ 3 س', read: true },
  { id: 5, name: 'يوسف إبراهيم', text: 'تم الاشتراك في الكورس الجديد', time: 'أمس', read: true },
]
```

**استبدل بـ (NEW):** — سطر فارغ واحد (احذف الكتلة بالكامل).

### الخطوة 3/3 — أضف الـ import

**ابحث عن (OLD):**
```ts
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '@/app/admin/notifications/actions'
```

**استبدل بـ (NEW):**
```ts
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '@/app/admin/notifications/actions'
import { getMessages } from '@/app/admin/messages/actions'
```

### تحقّق إلزامي:
```bash
cd /vercel/share/v0-project && grep -n "^export" app/admin/messages/actions.ts
```
**لو الدالة المصدّرة اسمها ليس `getMessages` بالضبط:** استخدم الاسم الصحيح الظاهر في الناتج في **الخطوتين 1 و3**. لو لم توجد دالة قراءة رسائل إطلاقًا: ارجع كل تعديلات T14 واكتب `SKIPPED T14: no server action`.

```bash
cd /vercel/share/v0-project && grep -c "mockMessages" components/dashboard/header.tsx
```
**الناتج المطلوب = `0`.**

> **لا تلمس** `NotificationsDropdown` في نفس الملف — إشعاراته حقيقية بالفعل وتعمل صحيحًا.
> **الشكل المتوقّع للحقول:** الكومبوننت يستخدم `name` و`text` و`time` و`read`. لو أسماء حقول الـ server action مختلفة، اعمل mapping داخل الـ `useEffect` فقط، ولا تعدّل الـ JSX.

`DONE T14 — 1 file(s) — TS errors: <رقم>`

---

## T15 — إزالة الصور الثابتة في بيانات الداشبورد

**الملف:** `app/admin/dashboard/actions.ts`

**ابحث عن (OLD):**
```ts
      image: '/courses/python.png',
```
**استبدل بـ (NEW):**
```ts
      image: null,
```

**ابحث عن (OLD):**
```ts
      image: '/courses/javascript.png',
```
**استبدل بـ (NEW):**
```ts
      image: null,
```

> لو المسافات البادئة مختلفة، طابق النص بدون المسافات البادئة: `image: '/courses/python.png',`.
> **الكومبوننتس المستقبِلة** (`top-courses.tsx`, `latest-lessons.tsx`) تتعامل مع props وعندها defaults — لكن **تحقّق** أنها تحتمل `image === null`. لو الـ JSX يستخدم `src={item.image}` مباشرة، غلّفه: `{item.image ? <Image src={item.image} ... /> : null}`.

`DONE T15 — ? file(s) — TS errors: <رقم>`

---

## T16 — حذف 5 كومبوننتس داشبورد ميتة + استعلاماتها

**الملف:** `components/dashboard/dashboard-shell.tsx`

### الخطوة 1/2 — تأكّد أنها غير مرندرة (إلزامي قبل الحذف):
```bash
cd /vercel/share/v0-project && grep -n "<ExamPerformanceChart\|<PassFailChart\|<ScoreDistributionChart\|<PaymentMethodsChart\|<PaymentStatusChart" components/dashboard/dashboard-shell.tsx
```
**الناتج المطلوب: لا شيء (0 سطر).** لو ظهر أي سطر: `SKIPPED T16: components are rendered` وتوقّف.

### الخطوة 2/2 — احذف الـ imports الخمسة

**ابحث عن (OLD):**
```ts
import { ExamPerformanceChart } from './exam-performance-chart'
import { PassFailChart } from './pass-fail-chart'
import { ScoreDistributionChart } from './score-distribution-chart'
import { PaymentMethodsChart } from './payment-methods-chart'
import { PaymentStatusChart } from './payment-status-chart'
```

**استبدل بـ (NEW):** — احذف الأسطر الخمسة بالكامل (لا تضع شيئًا مكانها).

> **لا تحذف ملفات الكومبوننتس نفسها** من القرص — `PaymentStatusChart` مستخدم في `app/admin/reports/page.tsx`.

### ⚠️ اكتب في تقريرك:
```
NOTE T16: الاستعلامات examScores / passFailData / scoreDistribution / paymentMethods /
paymentStatus لا تزال تُحسب في app/admin/dashboard/actions.ts وتُرسل في الـ payload بلا مستهلك.
حذفها يتطلب التأكد أنها غير مستخدمة في reports/page.tsx أيضًا — قرار لم يُنفّذ في T16.
```

`DONE T16 — 1 file(s) — TS errors: <رقم>`

---

## T17 — إزالة `initialData` الوهمي من كومبوننتس التقارير

**الملفات (5):**
- `components/reports/category-distribution-chart.tsx`
- `components/reports/course-performance-table.tsx`
- `components/reports/reports-stats.tsx`
- `components/reports/revenue-report-chart.tsx`
- `components/reports/students-growth-chart.tsx`

**في كل ملف من الخمسة، بالترتيب، طبّق التالي:**

### الخطوة 1 — اقرأ الملف:
```bash
cd /vercel/share/v0-project && cat -n components/reports/<اسم الملف>
```

### الخطوة 2 — اعرف اسم الـ prop الذي يأخذ الـ default

ابحث عن نمط شبيه بـ `= initialData` أو `?? initialData` أو `|| initialData` في تعريف الـ props.

### الخطوة 3 — استبدل الـ default الوهمي بمصفوفة/كائن فارغ

- لو النمط `{ data = initialData }` ⟶ اجعله `{ data = [] }`
- لو النمط `data ?? initialData` ⟶ اجعله `data ?? []`
- لو الـ default كائن (مثل stats) ⟶ اجعله `{}` أو `null` حسب ما يقبله الـ type.

### الخطوة 4 — احذف الـ import **فقط بعد** أن يصبح `initialData` بلا استخدام في الملف:
```bash
cd /vercel/share/v0-project && grep -c "initialData" components/reports/<اسم الملف>
```
**لو الناتج `1`** (الـ import وحده) ⟶ احذف سطر الـ import من `@/lib/reports-data`.
**لو الناتج أكبر من `1`** ⟶ لا تحذف الـ import، وأكمل استبدال الاستخدامات الباقية.

### الخطوة 5 — تحقّق نهائي (يجب أن يعيد `0`):
```bash
cd /vercel/share/v0-project && grep -rn "reports-data" components/reports | wc -l
```

### الخطوة 6 — الآن احذف ملف الـ mock:
```bash
cd /vercel/share/v0-project && grep -rn "reports-data" app lib components | wc -l
```
**فقط إذا كان الناتج `0`** احذف الملف `lib/reports-data.ts`. غير ذلك اتركه واكتب `NOTE T17: reports-data still referenced`.

`DONE T17 — 5 file(s) — TS errors: 0`

---

## T18 — منع تكرار الطلبات المجانية (idempotency)

**الملف:** `app/cart-actions.ts`

### الخطوة 1 — اقرأ منطقة الإنشاء:
```bash
cd /vercel/share/v0-project && sed -n '90,135p' app/cart-actions.ts
```

### الخطوة 2 — قبل `prisma.orders.create` في المسار المجاني، أضف فحص وجود مسبق

**قبل السطر الذي يحتوي `prisma.orders.create(` في المسار المجاني، أضف الكتلة التالية حرفيًا** (عدّل `lectureId` إن كان اسم المتغيّر في السياق مختلفًا — استخدم الاسم الظاهر في الكود):

```ts
    // T18: منع تكرار الطلبات المجانية — لوحظ 3 طلبات لنفس المحاضرة لنفس الطالب
    const existingFree = await prisma.order_items.findFirst({
      where: {
        lecture_id: lectureId,
        orders: { student_id: user.id, status: 'approved' },
      },
      select: { id: true },
    })
    if (existingFree) {
      return { success: true, alreadyOwned: true }
    }
```

> **لو اسم العلاقة في Prisma ليس `orders`:** نفّذ `grep -n "model order_items" -A 25 prisma/schema.prisma` واستخدم اسم العلاقة الصحيح الظاهر هناك.
> **لو `lectureId` غير معرّف في ذلك النطاق:** اكتب `SKIPPED T18: variable not in scope` ولا تخترع اسمًا.

`DONE T18 — 1 file(s) — TS errors: 0`

---

# المرحلة هـ — أخطاء TypeScript الـ 31 (T19)

---

## T19 — إصلاح أخطاء TS الحقيقية

**⚠️ لا تحذف** `ignoreBuildErrors: true` من `next.config.mjs` في هذه المهمة. حذفه هو **آخر خطوة** بعد وصول العدّاد إلى `0`.

### الخطوة 1 — اطبع قائمة الأخطاء الكاملة:
```bash
cd /vercel/share/v0-project && npx tsc --noEmit 2>&1 | grep "error TS"
```

### T19-a — `app/admin/courses/actions.ts` (خطأان `TS2322` — **bug حقيقي**)

المشكلة: `Date | null` مسنّد إلى `string | null` في `releaseDate`.

**ابحث عن** كل موضع يسنّد قيمة إلى `releaseDate` وأصلحه بالنمط:
```ts
releaseDate: <القيمة> ? new Date(<القيمة>).toISOString() : null,
```
حيث `<القيمة>` هو التعبير الأصلي كما هو. **لا تغيّر أي شيء آخر في السطر.**

### T19-b — `lib/notify.ts` (خطأ `TS2322` — **bug حقيقي**)

**ابحث عن (OLD):**
```ts
    const row: Record<string, any> = {
      code: genCode(),
      type: input.type,
      title: input.title,
```

**استبدل بـ (NEW):**
```ts
    const row: Prisma.notificationsCreateInput = {
      code: genCode(),
      type: input.type,
      title: input.title,
```

وأضف في أعلى الملف:
```ts
import type { Prisma } from '@prisma/client'
```

> **إن ظهرت أخطاء جديدة** بسبب `row.student_id = ...` وما بعده (لأن النوع صار صارمًا)، فهذا **متوقّع ومفيد** — أصلح كل إسناد ليطابق النوع. لو تعدّى الأمر 10 أخطاء جديدة: ارجع التعديل واكتب `REVERTED T19-b`.

### T19-c — `app/admin/coupons/actions.ts` (خطأان `TS2322`)

نفس منهج `T19-a`: طابق النوع المتوقّع الظاهر في رسالة الخطأ حرفيًا. **لا تستخدم `as any`.**

### T19-d — `app/admin/reports/page.tsx` (11 خطأ `TS2339`)

السبب الجذري: `getAdvancedAnalytics()` ترجع `{}` في أحد مساراتها.

**الملف:** `app/admin/reports/actions.ts` — ابحث عن `getAdvancedAnalytics` وعن كل `return {}` داخلها.

**استبدل كل `return {}`** بكائن كامل يحتوي **كل** المفاتيح الـ 11 بقيم فارغة:
```ts
    return {
      views_data: [],
      exam_insights: [],
      top_students: [],
      notifications_engagement: [],
      refunds_analysis: [],
      payment_trends: [],
      coupon_performance: [],
      dropoff_points: [],
      time_to_completion: [],
      course_completion: [],
      peak_times: [],
    }
```

> **إن كان أحد هذه المفاتيح كائنًا وليس مصفوفة** في مسار النجاح، استخدم `{}` بدل `[]` لذلك المفتاح فقط. اعرف ذلك من مسار النجاح في نفس الدالة.

### T19-e — `lib/curriculum.ts` (13 خطأ `TS7006`/`TS7031` — `any` ضمني)

**هذه هي الأخطاء الأخطر — أهم ملف في بناء شجرة المحتوى بلا type safety.**

لكل خطأ، أضف نوعًا صريحًا للـ parameter. **ممنوع `: any`.** استخدم النوع المستنتج من الاستعلام:
```ts
// مثال للنمط الصحيح:
.map((row: { id: string; title: string; slug: string }) => …)
```
اقرأ الـ `select` الخاص بالاستعلام السابق واستخدم حقوله بالضبط.

**لو تعذّر استنتاج نوع في موضع معيّن:** اكتب `SKIPPED T19-e line <رقم>` واتركه. **لا تكتب `any`.**

### T19-f — `scripts/check-slugs.ts` (خطأان `TS2339`)

ملف سكريبت غير مستخدم في الـ runtime. **لا تعدّله.** اكتب `SKIPPED T19-f: script file, not runtime`.

### الخطوة الأخيرة — فقط إذا وصل العدّاد إلى `0`:

```bash
cd /vercel/share/v0-project && npx tsc --noEmit 2>&1 | grep -c "error TS"
```

**إن كان `0` بالضبط**، عدّل `next.config.mjs`:

**ابحث عن (OLD):**
```js
  typescript: {
    ignoreBuildErrors: true,
  },
```
**استبدل بـ (NEW):**
```js
  typescript: {
    ignoreBuildErrors: false,
  },
```

**إن لم يكن `0`: لا تلمس `next.config.mjs` إطلاقًا** واكتب `NOTE T19: <رقم> errors remain, ignoreBuildErrors kept true`.

`DONE T19 — ? file(s) — TS errors: <رقم>`

---

# المرحلة و — نظافة (T20 → T23)

---

## T20 — استبدال 21 عبارة `console.log('[v0] ...')`

**⚠️ لا تحذفها بـ `sed`** — معظمها في مسارات `catch` وحذف السطر يتركك بكتلة `catch` فارغة تخفي الأخطاء.

### الخطوة 1 — أنشئ ملف تسجيل موحّد

**الملف (جديد):** `lib/logger.ts`

```ts
/**
 * تسجيل موحّد. في التطوير يظهر في الطرفية، وفي الإنتاج يُرسل للـ stderr فقط
 * دون تسريب بنية البيانات في اللوجز العامة.
 */
const isDev = process.env.NODE_ENV !== 'production'

export function logError(scope: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[${scope}] ${message}`)
}

export function logDebug(scope: string, payload?: unknown): void {
  if (!isDev) return
  console.log(`[${scope}]`, payload ?? '')
}
```

### الخطوة 2 — بدّل كل عبارة، ملفًا ملفًا (11 ملفًا)

**القاعدة الحرفية:**
- عبارة داخل `catch` تسجّل خطأ ⟶ `logError('<الوصف>', <متغيّر الخطأ>)`
- عبارة تشخيصية تطبع بيانات ⟶ `logDebug('<الوصف>', <البيانات>)`

**قائمة المواضع الكاملة (21):**

| الملف | العبارة | التحويل |
|---|---|---|
| `app/admin/categories/actions.ts` | `cleanupStageMedia error:` | `logError` |
| `app/admin/categories/actions.ts` | `cleanupBranchMedia error:` | `logError` |
| `app/admin/categories/actions.ts` | `cleanupCourseMedia error:` | `logError` |
| `app/admin/courses/actions.ts` | `cleanupLectureMedia error:` | `logError` |
| `app/admin/courses/actions.ts` | `cleanupLessonMedia error:` | `logError` |
| `app/admin/settings/danger-actions.ts` | `wipeAllData error:` | `logError` |
| `app/admin/students/actions.ts` | `createStudent auth error:` | `logError` |
| `app/admin/students/actions.ts` | `createStudent error:` | `logError` |
| `app/admin/students/actions.ts` | `deleteStudent auth delete threw:` | `logError` |
| `app/admin/students/actions.ts` | `deleteStudent error:` | `logError` |
| `app/student/exams/actions.ts` | `submitExam error:` | `logError` |
| `app/student/presence-actions.ts` | `pingPresence exception:` | `logError` |
| `lib/curriculum.ts` | `getCurriculum unexpected error:` | `logError` |
| `lib/curriculum.ts` | `getStageBySlug: looking for slug=...` | **`logDebug`** |
| `lib/curriculum.ts` | `getFreeLectureBySlug:` | **`logDebug`** |
| `lib/curriculum.ts` | `getCourseBySlug result:` | **`logDebug`** |
| `lib/curriculum.ts` | `lecture find result:` | **`logDebug`** |
| `lib/free-lecture-data.ts` | `getFreeLectureWatch lessons error:` | `logError` |
| `lib/notify.ts` | `createNotification threw:` | `logError` |
| `lib/site-content.ts` | `getSiteContent unexpected error:` | `logError` |
| `lib/video-actions.ts` | `saveStreamingSettings error:` | `logError` |

**مثالان حرفيان:**

`lib/notify.ts` — **OLD:**
```ts
    console.log('[v0] createNotification threw:', e?.message)
```
**NEW:**
```ts
    logError('notify.createNotification', e)
```

`lib/curriculum.ts` — **OLD:**
```ts
  console.log('[v0] getStageBySlug: looking for slug="%s" in stages=[%s]', slug, all.map((s) => s.id).join(', '))
```
**NEW:**
```ts
  logDebug('curriculum.getStageBySlug', { slug, count: all.length })
```
> **مهم:** لا تطبع `all.map((s) => s.id)` — كان هذا يسرّب كل الـ ids في كل طلب على صفحة عامة.

### الخطوة 3 — أضف الـ import في كل ملف من الـ 11:
```ts
import { logError, logDebug } from '@/lib/logger'
```
> أضف **فقط** الأسماء التي استخدمتها فعليًا في ذلك الملف، وإلا سيشتكي الـ linter.

### تحقّق (يجب أن يعيد `0`):
```bash
cd /vercel/share/v0-project && grep -rn "console.log('\[v0\]" --include=*.ts --include=*.tsx app lib components | wc -l
```

`DONE T20 — 12 file(s) — TS errors: <رقم>`

---

## T21 — حذف ملفات mock الميتة و`.bak`

### الخطوة 1 — تحقّق من عدم الاستخدام (كل أمر يجب أن يعيد `0`):
```bash
cd /vercel/share/v0-project && grep -rn "dashboard-data" app lib components | wc -l
```
```bash
cd /vercel/share/v0-project && grep -rn "courses-data'" app lib components | grep -v "student-courses-data" | wc -l
```

### الخطوة 2 — احذف **فقط** إذا كان كل ناتج أعلاه `0`:
- `lib/dashboard-data.ts`
- `lib/courses-data.ts`
- `lib/media-cleanup.ts.bak`
- `lib/media-migrate.ts.bak`

### ⛔ **لا تحذف** `lib/student-courses-data.ts`

هذا الملف **مستورد في 3 ملفات** ويصدّر **types فقط** (عليه `@deprecated no mock data`). حذفه سيكسر البناء.

**البديل المطلوب:** أعد تسميته توضيحًا للغرض:
```bash
cd /vercel/share/v0-project && git mv lib/student-courses-data.ts lib/student-types.ts
```
ثم صحّح المسار في الملفات الثلاثة:
```bash
cd /vercel/share/v0-project && grep -rl "student-courses-data" app lib components | xargs sed -i "s|student-courses-data|student-types|g"
```
### تحقّق:
```bash
cd /vercel/share/v0-project && grep -rn "student-courses-data" app lib components | wc -l
```
**الناتج المطلوب = `0`.**

> **لا تلمس** `top-courses.tsx` ولا `latest-lessons.tsx` ولا `continue-learning.tsx` — هذه لا تستورد أي mock، كلها props مع defaults سليمة و`continue-learning.tsx` عنده empty state صحيح.

`DONE T21 — ? file(s) — TS errors: <رقم>`

---

## T22 — نقل 26 ملف SQL إلى مجلد مؤرشف

```bash
cd /vercel/share/v0-project && mkdir -p prisma/sql/legacy && git mv scripts/*.sql prisma/sql/legacy/ 2>&1 | tail -3 && ls prisma/sql/legacy | wc -l
```

**الملف (جديد):** `prisma/sql/legacy/README.md`

```markdown
# سكريبتات SQL تاريخية (غير مُدارة)

هذه الملفات نُفّذت يدويًا على القاعدة بدون آلية migration. **لا تُشغّلها.**

## سبب أرشفتها
المشروع لا يحتوي على `prisma/migrations/` — الـ schema مأخوذ بـ `prisma db pull`
من قاعدة موجودة. لذلك لا توجد طريقة لمعرفة أي من هذه الملفات طُبّق على أي بيئة.

هذا هو السبب الجذري لوجود شجرتين متوازيتين للمحتوى في نفس الـ schema
(انظر البند P1-1 و T08 في `docs/AUDIT_FULL_REPORT.md`): الشجرة الجديدة
`stages/branches/terms/monthly_courses/lectures/lessons` أُضيفت بـ SQL يدوي،
والقديمة `courses/course_sections/course_lessons/enrollments` لم تُحذف أبدًا.

## الخطوة التالية (قرار بشري)
تبنّي `prisma migrate` ببدء baseline من الحالة الحالية للقاعدة.
```

`DONE T22 — ? file(s)`

---

## T23 — التحقّق النهائي

نفّذ الأوامر التالية بالترتيب وسجّل ناتج كل أمر:

```bash
cd /vercel/share/v0-project && npx tsc --noEmit 2>&1 | grep -c "error TS"
```
```bash
cd /vercel/share/v0-project && git ls-files | grep -E "\.(sql|csv|log)$" | grep -v "^prisma/" | wc -l
```
```bash
cd /vercel/share/v0-project && grep -c "granted.has" middleware.ts
```
```bash
cd /vercel/share/v0-project && grep -rn "revalidatePath('/\(categories\|courses\|calendar\|notifications\|coupons\|students\|messages\|reports\|payments\)'" --include=*.ts app lib | wc -l
```
```bash
cd /vercel/share/v0-project && grep -rn "console.log('\[v0\]" --include=*.ts --include=*.tsx app lib components | wc -l
```
```bash
cd /vercel/share/v0-project && grep -rn "time_label: 'الآن'" --include=*.ts app lib | wc -l
```
```bash
cd /vercel/share/v0-project && grep -c "mockMessages" components/dashboard/header.tsx
```
```bash
cd /vercel/share/v0-project && grep -rn "reports-data" app lib components | wc -l
```
```bash
cd /vercel/share/v0-project && npx next build 2>&1 | tail -25
```

**جدول القيم المطلوبة:**

| الأمر | القيمة المطلوبة |
|---|---|
| 1 — أخطاء TS | `0` (أو أقل من `31` مع NOTE) |
| 2 — ملفات حسّاسة على git | `0` |
| 3 — `granted.has` | `0` |
| 4 — revalidatePath غلط | `0` |
| 5 — لوجز `[v0]` | `0` |
| 6 — `time_label: 'الآن'` | `0` |
| 7 — `mockMessages` | `0` |
| 8 — `reports-data` | `0` |
| 9 — البناء | ينجح بلا خطأ |

**لو أي قيمة لا تطابق: لا تُخفِ ذلك.** اكتب `FAILED CHECK <رقم>: got <القيمة الفعلية>, want <المطلوب>`.

---

# قالب التقرير النهائي — اكتبه بهذا الشكل حرفيًا

```
BASELINE: commit=<sha> TS_errors=31

DONE T01 — ? file(s) — TS errors: 31
DONE T02 — 1 file(s) — TS errors: ?
DONE T03 — 1 file(s) — TS errors: ?
DONE T04 — 1 file(s) — TS errors: ?
BLOCKED T05: DB write not authorized
BLOCKED T06: needs product owner
BLOCKED T07: DB write not authorized
BLOCKED T08: needs product owner
DONE T09 — ...
... (بقية المهام)

FINAL CHECKS:
1 TS errors: ?
2 sensitive files: ?
... (التسعة)

NOTES:
<كل سطر NOTE أو ACTION REQUIRED جمعته أثناء التنفيذ>

SKIPPED:
<كل سطر SKIPPED>
```

---

## خلاصة الحصر

| الفئة | العدد | المهام |
|---|---|---|
| أمنية — نفّذها فورًا | 4 | T01, T02, T03, T04 |
| قيود DB — تحتاج إذنًا | 3 | T05, T06, T07 |
| قرار بشري — لا تنفّذها | 2 | T06, T08 |
| وظيفية | 3 | T09, T10, T11 |
| بيانات معروضة | 7 | T12 → T18 |
| TypeScript | 1 (6 أجزاء) | T19 |
| نظافة | 3 | T20, T21, T22 |
| تحقّق | 1 | T23 |

**المشاكل التي لا يمكن إصلاحها برمجيًا وتحتاج قرارًا:** `T06` (7 طلبات مدفوعة بلا محتوى) و`T08` (الشجرتان المتوازيتان). **كل ما تحت الدرجة الأولى معطّل حتى تُحسم `T08`.**
