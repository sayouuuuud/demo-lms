# تقرير تدقيق شامل — منصة demo-lms

> تاريخ التدقيق: 2026-07-29 · الفرع: `arabic-interface` · تم التحقق من كل بند مقابل الكود الفعلي + قاعدة البيانات الحيّة (Prisma) وليس بالقراءة السطحية.

---

## 0. ملخص تنفيذي في 6 أسطر

المنصة **مبنية على شجرتين مختلفتين للبيانات** في نفس الـ schema: شجرة قديمة (`courses → course_sections → course_lessons → enrollments → lesson_progress`) وشجرة حديثة (`stages → branches → terms → monthly_courses → lectures → lessons`). الكود يقرأ ويكتب في الشجرة الحديثة، لكن **البيانات الموجودة فعليًا في القاعدة موزّعة على الشجرتين**، وبعض ملفات الطالب لسه بتقرأ من الشجرة القديمة الميتة. نتيجة ذلك: **مفيش طالب واحد يقدر يفتح محتوى دفع فيه**، لأن `order_items.lecture_id = NULL` في كل الصفوف الموجودة، و`userCanAccessLecture()` بترجّع `false` دايمًا. فوق كده فيه **تعارض هوية** بين `students.id` و`auth user.id` بيخلّي استعلامات الطلبات ترجّع فاضي، و**ثغرة صلاحيات في `middleware.ts`** بتخلي المساعد يدخل صفحات صلاحيتها `none`، و**ملف فيه هاشات باسوردات حقيقية مرفوع على الـ git repo**.

جدول القاعدة الحيّة الآن (عدد الصفوف):

| جدول | صفوف | جدول | صفوف | جدول | صفوف |
|---|---|---|---|---|---|
| `lectures` | **0** | `courses` | **8** | `enrollments` | **0** |
| `lessons` | **0** | `course_lessons` | **15** | `lesson_progress` | **0** |
| `monthly_courses` | **0** | `course_sections` | 3 | `student_content_progress` | 10 |
| `terms` | **0** | `assignments` | 2 | `assignment_submissions` | **0** |
| `orders` | 7 | `order_items` | 7 | `exam_submissions` | **0** |
| `videos` | 25 | `video_jobs` | 11 | `certificates` | **0** |
| `students` | 9 | `User` | 25 | `profiles` | 25 |
| `exams` | 21 | `notifications` | 41 | `reports` | 12 |
| `stages` | 3 | `branches` | 12 | `categories` | 6 |
| `page_views` | 538 | `activity_logs` | 335 | `auth_logs` | 58 |

---

## 1. الحكم على المشاكل العشر اللي أنت بعتها

| # | المشكلة اللي انت قلتها | الحكم | التصحيح / التفصيل |
|---|---|---|---|
| 1 | صفحات الطالب (الواجبات والتقويم) فاضية لأن `enrollments` فيه 0 صفوف | ✅ **صح، وأخطر مما ذكرت** | مش بس `enrollments` فاضي ومفيش أي `create` عليه في المشروع كله، لكن كمان **نوع الـ ID غلط**: `enrollments.course_id` هو FK على `courses.id`، والكود بياخد القيمة دي ويستخدمها كأنها `lectures.id` (`prisma.lectures.findMany({ where: { id: { in: lectureIds } } })`). يعني حتى لو عملت seed لـ `enrollments` النهاردة، الصفحات هتفضل فاضية. → البند 1.2 |
| 2 | صفحة الـ Streaming مكسورة و`video_jobs` فيه 9 صفوف فاشلة سببها R2 | ⚠️ **جزئيًا صح** | الأرقام الحقيقية: `video_jobs` = 11 صف (8 فاشلة بسبب `متغيرات R2 غير مكتملة` + 1 فاشلة بسبب `invalid input syntax for type integer: "116.7"` + 2 `done`)، و`videos` = 25 (14 `pending`, 2 `ready`, 9 `error`). **بس** الجزء اللي قلته عن "8 أسطر كود فاضية" غلط: `app/admin/streaming/page.tsx` هو `redirect('/admin/settings')` مقصود ومكتوب فيه تعليق واضح. وخطأ `116.7` **متصلّح بالفعل** في `services/transcoder/src/db.ts:82` بـ `Math.round()` — الصف الفاشل ده تاريخي. → البند 1.4 |
| 3 | 56 استدعاء `revalidatePath` غلط | ⚠️ **صح المبدأ، الرقم غلط** | العدد الحقيقي للمسارات غير الموجودة = **41** استدعاء: `/categories`×13، `/courses`(+layout)×10، `/calendar`×5، `/notifications`×4، `/coupons`×3، `/students`×2، `/messages`×2، `/reports`×1، `/payments`×1. أما `revalidatePath('/', 'layout')`×17 و`revalidatePath('/')`×13 **دول صح** لأن `app/page.tsx` موجود. → البند 2.4 |
| 4 | داتا وهمية في `header.tsx` + السطور 316 و327 في `dashboard/actions.ts` | ⚠️ **جزئيًا صح** | `components/dashboard/header.tsx:36-42` فيه **5** رسائل hardcoded (مش 3 إشعارات) واسمها `mockMessages` وبتغذّي dropdown الرسائل. أما **الإشعارات في نفس الملف حقيقية** (بتنادي `getNotifications()` من `app/admin/notifications/actions.ts`). وسطور 314-315 في `dashboard/actions.ts` مش داتا وهمية — دي حسابات مشتقة من `_count.order_items`، بس الصورة `image: '/courses/javascript.png'` و`'/courses/python.png'` مكتوبين hardcoded. → البند 2.5 |
| 5 | 5 كومبوننتس (`RevenueChart`, `TopCourses`, `LatestLessons`, `ActivityChart`, `StudentProgress`) imported ومش مرندرين | ❌ **غلط تمامًا — معكوس** | الخمسة اللي ذكرتهم **مرندرين فعلًا** في `dashboard-shell.tsx` (شوف `<RevenueChart data={data.revenueData} />` وغيرهم)، و`StudentProgress` مش موجود في مجلد dashboard خالص. لكن **فيه مشكلة حقيقية بنفس الشكل**: 5 كومبوننتس تانية `imported` ومش مرندرين: `ExamPerformanceChart`, `PassFailChart`, `ScoreDistributionChart`, `PaymentMethodsChart`, `PaymentStatusChart` — وبياناتهم (`examScores`, `passFailData`, `scoreDistribution`, `paymentMethods`, `paymentStatus`) بتتحسب في الـ server action وبتتحمّل على الـ DB وبترمى في الزبالة. → البند 2.6 |
| 6 | `time_label` محسوب وقت الإنشاء مش وقت العرض | ✅ **صح 100%** | 12 موضع بيكتب `time_label: 'الآن'` حرفيًا (`app/admin/messages/actions.ts:91`، `app/student/messages/actions.ts:72,111`، `lib/notify.ts:37`، `app/admin/payments/orders-actions.ts:138`، `app/admin/students/[id]/actions.ts:68,102,115`). والقراءة `row.time_label` مباشرة بدون حساب. → البند 2.7 |
| 7 | 8 تقارير بلا ملف و`mockReportUrl` على السطر 46 | ⚠️ **المشكلة صح، السبب غلط** | `reports` = **12** صف (منهم "قيد التجهيز" كثير و1 "جاهز")، و`generateReport()` في `app/admin/reports/actions.ts:44` بتعمل `create` بـ `status: 'قيد التجهيز'` **ومفيش أي processor/cron/worker/webhook بيحوّلها لـ "جاهز"** — دي صح. **لكن `mockReportUrl` مش موجود في الكود خالص** — دوّرت عليه في كل الملفات. اللي موجود فعلًا: مفيش عمود URL أصلًا في موديل `reports`، ومفيش زر تحميل لتقرير فردي؛ الزر الموجود (`reports-page-header.tsx:32`) بيصدّر CSV مجمّع من الشارتات. → البند 2.8 |
| 8 | 3 ملفات mock ميتة في `lib/` + كومبوننتس بتستورد منهم | ⚠️ **جزئيًا صح** | `lib/dashboard-data.ts` و`lib/courses-data.ts` **ميتين فعلًا** (صفر imports). لكن `lib/student-courses-data.ts` **مستورد** في 3 ملفات وبيصدّر `types` بس (فيه `@deprecated no mock data`). و`top-courses.tsx` / `latest-lessons.tsx` / `continue-learning.tsx` **مش بيستوردوا أي mock** — كلهم بياخدوا props. **بس فيه mock حقيقي فاتك**: `lib/reports-data.ts` مستورد كـ `initialData` في **5** كومبوننتس تقارير. → البند 3.2 |
| 9 | `/admin/streaming` مش في السايدبار ولا `permissions.ts` | ✅ **صح، بس مقصود** | مش موجودة في `components/dashboard/sidebar.tsx` ولا في `RESOURCE_KEYS`. لكن دي مش bug — الصفحة `redirect` مقصود على `/admin/settings` لأن إعدادات الستريمنج انتقلت لتاب في الإعدادات. الـ bug الحقيقي إن `mapPathToResource('/admin/streaming')` بترجّع `null` → مساعد بيتحوّل لـ `/admin/no-access` بدل ما يوصل للإعدادات. → البند 3.3 |
| 10 | `course_lessons` فيه 15 صف والكود بيقرأ من `lectures` اللي فيه 0 | ✅ **صح، ودي أم المشاكل** | مؤكد بالأرقام. و`prisma.courses` **مستخدم صفر مرة** في المشروع كله بينما فيه 8 صفوف — يعني شجرة `courses` كلها orphan. والأنكى: `app/admin/dashboard/actions.ts` بيخلط الشجرتين في نفس الدالة (سطر 17 `prisma.lectures.count()` وسطر 33 `prisma.course_lessons.findMany()`). → البند 1.1 |

**الخلاصة:** 4 صح، 5 جزئيًا صح (بأرقام أو أسباب مختلفة)، 1 غلط تمامًا. لكن التدقيق كشف **11 مشكلة إضافية** أخطر، منها 3 أمنية.

---

## 2. المشاكل مترتبة من حيث الخطورة

### 🔴 الدرجة صفر — أمن وخصوصية (لازم النهاردة)

---

#### [S0-1] هاشات باسوردات حقيقية + إيميلات مرفوعة على الـ Git repo

**الدليل:**
```
$ git ls-files | grep -E "\.(sql|csv)$"
auth_users.csv
auth_users.sql
auth_identities.sql
schema.sql
query.sql
script.sql
shim.sql
supabase_public.sql

$ head -c 300 auth_users.csv
id,email,encrypted_password,email_confirmed_at,raw_user_meta_data,created_at
6acccd5b-...,admin@test.com,$2a$06$RPJM9fVOrUrX3ZLXEKxoPO/vVKW0N0N48a0fZNVyMQZWlW5/rsA4a,...
```

**التأثير:** أي حد عنده read access على الريبو (أو لو الريبو بقى public يومًا) عنده هاشات bcrypt بـ cost factor **06** (ضعيف جدًا — bcrypt الافتراضي 10-12؛ cost 6 يعني كسر بالـ brute force أسرع ~64 مرة) + الإيميلات + `raw_user_meta_data` فيه الأدوار. حساب `admin@test.com` بدور `admin` مكشوف.

**كمان مرفوع:** `restore_warnings.log`, `fix.js`, `fix_admin.js`, `fix_schema.js`, `fix_defaults.js`, `test.js`, `test2.js`, `test_db.js`, `smoke_test.js`, `add_col.mjs`, `migrate.bat`, `migrate_auth.bat`, `fix.ps1` — سكريبتات صيانة بتلمس القاعدة مباشرة، والسكرين شوتس `after-login.png`, `shot-after-login.png`, `shot-courses.png`, `dash-anim.png`.

**الإصلاح:** حذف الملفات + `.gitignore` + **تدوير كل الباسوردات** + رفع bcrypt cost. تفاصيل في المهمة `T01`.

---

#### [S0-2] ثغرة تصعيد صلاحيات في `middleware.ts` — `access_level` متجاهَل تمامًا

**الملف:** `middleware.ts:40-46`
```ts
const granted = new Map(
  permissions.map((p: any) => [p.resource, p.access_level])
)
const resource = mapPathToResource(nextUrl.pathname)
const hasAccess = resource ? granted.has(resource) : false   // ← الـ bug
```

**التأثير:** `Map.has()` بتتحقق من **وجود المفتاح فقط**. مساعد عنده صف في `assistant_permissions` بـ `access_level = 'none'` على `payments` → `granted.has('payments') === true` → **يدخل صفحة الطلبات كاملة**. وده يخالف `lib/auth-guard.ts:71` اللي بيستخدم `satisfies(map[resource], level)` صح. يعني الـ middleware بيسمح والـ server action بيمنع — تجربة مستخدم مكسورة + سطح هجوم.

نفس الـ bug في fallback السطر 49: `RESOURCES.find((r) => granted.has(r.key))`.

**الإصلاح:** استخدم `satisfies()` من `lib/permissions.ts`. تفاصيل في `T02`.

---

#### [S0-3] `getFreeLectureWatch` بترجّع `video_url` الخام لصفحة عامة وبتتجاهل `lessons.is_free`

**الملفات:** `lib/free-lecture-data.ts:35-47` + `lib/curriculum.ts:189`

البوابة في `curriculum.ts:189`:
```ts
if (!lecture || (!lecture.isFree && Number(result.course.price) !== 0)) return undefined
```
البوابة على مستوى **المحاضرة/الكورس** بس. بعدين `free-lecture-data.ts` بترجّع **كل** الدروس اللي تحت المحاضرة دي مع `videoUrl: row.video_url` **الخام**، بدون أي فحص لـ `lessons.is_free` (العمود موجود في الـ schema سطر 982).

**التأثير:** (1) لو كورس واحد سعره 0 وفيه درس مقفول (`is_free = false`)، الـ URL الخام بيتسلّم لصفحة عامة (`/stages` في `PUBLIC_PATHS` في `middleware.ts:8`). (2) الـ URL الخام بيتخطى منظومة `/api/hls` المحمية بالتوكن + `isLatestSession` (single-device enforcement) كليًا — يعني الرابط ينفع يتنسخ ويتوزّع. (3) في حالة عدم وجود فيديو بترجّع `FALLBACK_VIDEO` = فيديو BigBuckBunny من Google — placeholder في production.

---

### 🔴 الدرجة الأولى — الوظيفة الأساسية مكسورة (الفلوس مش بتوصّل محتوى)

---

#### [P1-1] شجرتان متوازيتان للمحتوى: كل بيانات المحتوى في الشجرة الميتة

هيكل الـ schema فيه نموذجين كاملين:

```
الشجرة القديمة (بيانات موجودة، كود صفر):
courses (8) ─→ course_sections (3) ─→ course_lessons (15)
    └─→ enrollments (0) ─→ lesson_progress (0)
    └─→ assignments.course_id (2 صف بيها course_id)

الشجرة الحديثة (كود كامل، بيانات صفر):
stages (3) ─→ branches (12) ─→ terms (0) ─→ monthly_courses (0)
    └─→ lectures (0) ─→ lessons (0) ─→ videos (25)
    └─→ assignments.lecture_id (0 صف بيها lecture_id)
    └─→ student_content_progress (10)
```

**الدليل القاطع:** `grep -rn "prisma\.courses" app lib` → **صفر نتيجة**. و`prisma.lectures` → **26 استخدام** في 12 ملف.

**التأثير المركّب:**
- صفحة `/admin/courses` فاضية (بتقرأ `lectures` = 0) بينما فيه 8 كورسات في القاعدة.
- `/api/hls/[lessonId]` بترجّع 404 دايمًا (`prisma.lessons.findUnique` على جدول فيه 0 صف) → **مفيش فيديو واحد يتشغّل عبر HLS** رغم وجود 25 فيديو و2 منهم `ready`.
- `app/admin/dashboard/actions.ts` بيخلط الشجرتين في نفس الدالة: سطر 17 `coursesCount = prisma.lectures.count()` → 0، سطر 18 `lessonsCount = prisma.lessons.count()` → 0، سطر 33 `latestLessons = prisma.course_lessons.findMany()` → 15. **الداشبورد بيقول "0 محاضرة" وتحتها بيعرض قائمة بآخر 5 دروس.**
- `assignments` عندها **العمودين** `course_id` و`lecture_id`؛ الـ 2 صف الموجودين عندهم `course_id` مليان و`lecture_id = null`، بينما `app/admin/courses/actions.ts:779` بيكتب `lecture_id` والاستعلامات بتفلتر بـ `lecture_id` → الواجبات الموجودة غير مرئية للأبد.

---

#### [P1-2] `order_items.lecture_id = NULL` في **كل** الصفوف → مفيش طالب يقدر يفتح حاجة دفع فيها

**الدليل (من القاعدة الحيّة):**
```
order_items (7 صفوف):
{ item_type: "lecture",       lecture_id: null, monthly_course_id: null, term_id: null, lecture_title: "تست" }
{ item_type: "course_bundle", lecture_id: null, monthly_course_id: null, term_id: null, lecture_title: "تست" }
{ item_type: "lecture",       lecture_id: null, monthly_course_id: null, term_id: null, lecture_title: "القوى والاتزان" }
{ item_type: "lecture",       lecture_id: null, monthly_course_id: null, term_id: null, lecture_title: "النهايات والاتصال" }
{ item_type: "lecture",       lecture_id: null, monthly_course_id: null, term_id: null, lecture_title: "الاعدا المركبه" }
... (كلهم null)
```

`lib/lecture-access.ts` — البوابة الوحيدة للوصول للمحتوى — منطقها بالكامل مبني على المقارنة:
```ts
if (item.lecture_id === lectureId) return true
if (courseId && item.item_type === 'course_bundle' && item.monthly_course_id === courseId) return true
if (termId && item.item_type === 'term_bundle' && item.term_id === termId) return true
return false   // ← دايمًا هنا
```
`null !== <uuid>` ⇒ **`userCanAccessLecture()` بترجّع `false` لكل طالب على كل محاضرة، بلا استثناء.**

الفلوس اتحصّلت: 7 طلبات كلها `status: 'approved'`، اثنان بـ 140 و135 جنيه. **المحتوى صفر.** المحفوظ هو `lecture_title` (string denormalized) بس — يعني مفيش طريقة برمجية موثوقة لاستعادة الربط غير مطابقة العنوان نصيًا.

السبب الجذري متشعّب: `app/cart-actions.ts:119` **بيكتب** `lecture_id: lectureId` صح، و`:396` (`createMany`) بيكتب `lecture_id: item.lectureId` — لكن `item.lectureId` جاي من payload الـ client. فلو الـ cart كان فاضي من `lecture_id` (سطر 205 و233 بيكتبوا `lecture_id: null` بشكل مقصود للـ bundles) أو الـ mapping اتغيّر، الصفوف بتتخلق بـ null. الأولوية: **قيد قاعدة بيانات يمنع الحالة دي من الأساس** قبل أي إصلاح كود.

---

#### [P1-3] تعارض هوية: `orders.student_id` = auth user id، والاستعلامات بتستخدم `students.id`

**الدليل:**
```
students: id = 26c112f2-4ca1-477b-8873-9bc3f6a2e2c5 , user_id = 53f5c74e-d334-4fd0-964d-6074d596715a
orders:   student_id = 83eaa8dc-c843-4edd-b1f6-6aeb6a0aa71f  (كل الـ 7 طلبات)
match مع students.id?  false        match مع user_id?  false
```

`app/cart-actions.ts:99` بيكتب `student_id: user.id` (auth id). لكن:

| ملف | السطر | يستخدم | صح؟ |
|---|---|---|---|
| `lib/lecture-access.ts:35` | `where: { student_id: userId }` | auth id | ✅ |
| `app/student/actions/billing.ts:37` | `where: { student_id: user.id }` | auth id | ✅ |
| `app/student/exams/actions.ts:60` | `where: { student_id: student.id }` | **students PK** | ❌ |
| `app/admin/students/[id]/actions.ts:233` | `student_id: studentUserId` | auth id | ✅ |
| `app/admin/students/[id]/actions.ts:200,353,369,438` | `student_id: studentId` | students PK | (جداول تانية — صح) |

**التأثير:** `canAccessExam()` في `app/student/exams/actions.ts` مسار الـ branch بيرجّع `false` دايمًا → الطلاب مش شايفين الاختبارات المرتبطة بفرع اشتروه. ومفيش FK constraint على `orders.student_id` يمنع الخطأ ده وقت الكتابة.

---

#### [P1-4] خط أنابيب الفيديو معطّل: 8 من 11 job فاشلة، ومفيش أي visibility

**الدليل:**
```
video_jobs: 8× failed  last_error="[transcoder/r2] متغيرات R2 غير مكتملة"  attempts=3
            1× failed  last_error='invalid input syntax for type integer: "116.7"'  attempts=3
            2× done
videos: pending=14, ready=2, error=9
```

- متغيرات `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` **غير مضبوطة**. `lib/r2.ts:58-71` عنده فحص صحّي (`ok: false, message: 'متغيرات R2 غير مكتملة'`) لكنه بيتنادى من تاب الإعدادات فقط، ومش بيمنع إنشاء job جديد.
- `attempts = 3` = الحد الأقصى، **مفيش reset/retry** بعد ما الـ env يتصلّح. الـ 8 jobs دي ميتة للأبد حتى لو ضبطت R2 النهاردة.
- 14 فيديو `pending` مقابل 11 job → **3 فيديوهات مالهم job خالص** (عملية إنشاء الـ job فشلت في النص ومفيش تسوية).
- خطأ `116.7` **متصلّح** في `services/transcoder/src/db.ts:82` (`Math.round(durationSeconds)`) — الصف تاريخي، مش bug حالي.
- الـ worker (`services/transcoder`) عبارة عن خدمة مستقلة بـ Dockerfile خاص و`package.json` منفصل — **مش بتشتغل** في بيئة `next dev`، ومفيش أي تنبيه في الـ UI بيقول كده.

---

#### [P1-5] `lesson_progress` مستحيل يتكتب بحكم الـ schema

`prisma/schema.prisma:976-986`:
```prisma
model lesson_progress {
  enrollment_id  String  @db.Uuid   // FK → enrollments.id  (0 صفوف، مفيش create)
  lesson_id      String  @db.Uuid   // FK → course_lessons.id (الشجرة القديمة)
}
```
`enrollment_id` **مطلوب (NOT NULL)** و`enrollments` فاضي ومفيش create. ⇒ **مستحيل رياضيًا** إدخال صف في `lesson_progress`.

التقدّم الحقيقي بيتسجّل في `student_content_progress` (`user_id` + `item_type` + `item_id`، 10 صفوف) — وده اللي `app/student/actions/progress.ts:73` بيقرأ منه صح.

**لكن** `app/admin/students/[id]/actions.ts:278`:
```ts
where: { enrollments: { student_id: studentId }, completed: true }
```
بيقرأ من `lesson_progress` الميت ⇒ **الأدمن شايف "0 درس مكتمل" لكل طالب** رغم وجود 10 صفوف تقدّم حقيقية.

---

#### [P1-6] `ignoreBuildErrors: true` بيخفي 31 خطأ TypeScript حقيقي

`next.config.mjs`:
```js
typescript: { ignoreBuildErrors: true }
```

توزيع الأخطاء الـ 31:

| ملف | عدد | نوع |
|---|---|---|
| `lib/curriculum.ts` | 13 | `TS7006`/`TS7031` — `any` ضمني (فقدان type safety كامل في أهم ملف بيبني شجرة المحتوى) |
| `app/admin/reports/page.tsx` | 11 | `TS2339` — `Property 'views_data' does not exist on type '{}'` وكذلك `exam_insights`, `top_students`, `notifications_engagement`, `refunds_analysis`, `payment_trends`, `coupon_performance`, `dropoff_points`, `time_to_completion`, `course_completion`, `peak_times` |
| `app/admin/courses/actions.ts` | 2 | `TS2322` — `Date \| null` مسنّد لـ `string \| null` في `releaseDate` (**bug حقيقي**: التاريخ هيظهر كـ `[object Date]` أو يكسر الـ serialization) |
| `app/admin/coupons/actions.ts` | 2 | `TS2322` |
| `lib/notify.ts` | 1 | `TS2322` — `Record<string, any>` ناقص `code`, `type`, `title` المطلوبين في `notificationsCreateInput` (**bug حقيقي**: إشعار ممكن يفشل runtime) |
| `scripts/check-slugs.ts` | 2 | `TS2339` |

الـ 11 خطأ في `reports/page.tsx` معناها إن `getAdvancedAnalytics()` بترجّع `{}` في مسار من مساراتها والصفحة بتقرأ منها 11 خاصية غير موجودة ⇒ **11 كومبوننت تقرير بتستقبل `undefined`**.

---

### 🟠 الدرجة الثانية — بيانات مغلوطة تُعرض للمستخدم

---

#### [P2-1] ~41 استدعاء `revalidatePath` على مسارات غير موجودة

App Router عنده `/admin/*`, `/student/*`, `/stages/*`, `/auth/*`, `/` فقط. الاستدعاءات الغلط:

| المسار | عدد | المسار الصحيح |
|---|---|---|
| `'/categories'` | 13 | `/admin/categories` |
| `'/courses'` + `'/courses','layout'` | 4 + 6 | `/admin/courses` |
| `'/calendar'` | 5 | `/admin/calendar` |
| `'/notifications'` | 4 | `/admin/notifications` |
| `'/coupons'` | 3 | `/admin/coupons` |
| `'/students'` | 2 | `/admin/students` |
| `'/messages'` | 2 | `/admin/messages` |
| `'/reports'` | 1 | `/admin/reports` |
| `'/payments'` | 1 | `/admin/payments` |
| **المجموع** | **41** | |

الصحيح والمتروك على حاله: `'/'`×13، `'/', 'layout'`×17، وكل `'/admin/...'` و`'/student/...'`.

**التأثير:** الأدمن بيحفظ تعديل ⟶ الصفحة اللي هو فيها **مش بتتحدّث** (كاشها مالوش invalidation) ⟶ يشك إن الحفظ فشل ⟶ يحفظ تاني. + `revalidatePath` على مسار غير موجود مش بيرمي error فبيفضل مستور للأبد.

---

#### [P2-2] `time_label` نص مجمّد في القاعدة

12 موضع بيكتب `time_label: 'الآن'`. القراءة مباشرة (`app/admin/messages/actions.ts:20`, `app/student/messages/actions.ts:42`). ⇒ رسالة عمرها 3 شهور لسه مكتوب جمبها "الآن". نفس المشكلة في `chat_history` JSON — بيتخزّن جواه `time` كنص.

**اللافت:** الحل موجود بالفعل في المشروع: `getRelativeTimeArabic()` في `lib/utils.ts`، ومستخدم صح في `app/admin/dashboard/actions.ts:322,328`. المطلوب توحيد الاستخدام.

---

#### [P2-3] `reports` بلا معالج — 12 صف عالقين، ومفيش تحميل لتقرير فردي

`app/admin/reports/actions.ts:37-58`: `generateReport()` بتعمل `create` بـ `status: 'قيد التجهيز'` + `logActivity` + `revalidatePath('/reports')` (مسار غلط — بند P2-1) وخلاص. **مفيش worker/cron/webhook/queue** بيحوّل الحالة. `reports` model في الـ schema **مالوش عمود `file_url` أو `payload`** أصلًا. زر "تصدير" الموجود في `reports-page-header.tsx:32` بيعمل `downloadReportsCsv(data)` وده CSV للأرقام المجمّعة على الشاشة — مش التقرير المطلوب.

**تصحيح لملاحظتك:** `mockReportUrl` **مش موجود** في أي ملف.

---

#### [P2-4] 5 كومبوننتس داشبورد + بياناتهم بتتحسب وتترمى

`components/dashboard/dashboard-shell.tsx` — `imported` ومش مرندرين:
`ExamPerformanceChart`, `PassFailChart`, `ScoreDistributionChart`, `PaymentMethodsChart`, `PaymentStatusChart`.

بياناتهم بتتحسب في `app/admin/dashboard/actions.ts` وبترجع في الـ payload: `examScores`, `passFailData`, `scoreDistribution`, `paymentMethods`, `paymentStatus` — كلها queries على الـ DB في كل request. ⇒ **حِمل قاعدة بيانات + payload زيادة عالطاير، لصفر عائد بصري.** وفيه فراغ واضح في الـ JSX (سطرين فاضيين قبل "Row 5") مكان الشارتات المحذوفة.

ملاحظة: `PaymentStatusChart` مرندر في `app/admin/reports/page.tsx` — فالكومبوننت نفسه مستخدم، بس النسخة اللي في الداشبورد ميتة.

---

#### [P2-5] بيانات وهمية في `header.tsx` والصور الثابتة في الداشبورد

`components/dashboard/header.tsx:36-42` — **5** رسائل:
```ts
/* ─── mock data ─── */
const mockMessages = [
  { id: 1, name: 'أحمد علي',      text: 'متى موعد المحاضرة القادمة؟',   time: 'منذ 5 د',  read: false },
  { id: 2, name: 'سارة محمد',     text: 'شكراً على الكورس، استفدت كتير', time: 'منذ 20 د', read: false },
  { id: 3, name: 'عمر خالد',      text: 'هل يوجد تمارين إضافية؟',       time: 'منذ ساعة', read: false },
  { id: 4, name: 'منى حسن',       text: 'الفيديو مش بيشتغل عندي',        time: 'منذ 3 س',  read: true },
  { id: 5, name: 'يوسف إبراهيم',  text: 'تم الاشتراك في الكورس الجديد',  time: 'أمس',      read: true },
]
const [messages, setMessages] = useState(mockMessages)   // :58
```
أسماء وهمية في dropdown الرسائل في **كل** صفحة أدمن. `app/admin/messages/actions.ts` عنده الدوال الحقيقية.

**بالمقابل — للإنصاف:** `NotificationsDropdown` في نفس الملف **حقيقي 100%** (`getNotifications()` + polling + toast).

كمان في `app/admin/dashboard/actions.ts`: `image: '/courses/python.png'` (:317) و`image: '/courses/javascript.png'` (:330) — صور ثابتة لكل عنصر بغض النظر عن المحتوى.

---

#### [P2-6] 5 كومبوننتس تقارير بتبدأ ببيانات mock

مستوردين `initialData` من `lib/reports-data.ts`:
`category-distribution-chart.tsx:5`, `course-performance-table.tsx:2`, `reports-stats.tsx:4`, `revenue-report-chart.tsx:14`, `students-growth-chart.tsx:12`

`lib/reports-data.ts:4` مثلًا: `{ key: 'enrollments', label: 'الاشتراكات', value: 3420, ... }` — **3420 اشتراك وهمي** بينما `enrollments` فيه 0.

**التأثير:** لو الـ server action فشل أو رجّع فاضي، الشارت بيعرض أرقام مخترعة بدل empty state — والأدمن مش عارف إن اللي أمامه مزيّف.

---

#### [P2-7] طلبات مجانية بمبالغ صفرية وحالة `approved` تلقائيًا

`orders` = 7 كلهم `approved`، منهم **5 بـ `total: "0"`**. `app/cart-actions.ts:96-121` و`:164-200` بتعمل auto-approve للعناصر المجانية (`status: 'approved'`, `method: 'مجاني'`, `total: 0`). سليم منطقيًا **لكن**: (1) بيلوّث تقارير الإيرادات (`totalRevenue` بيجمع 7 طلبات منهم 5 أصفار)، (2) **مفيش idempotency key** — كل `addToCart` على عنصر مجاني بيخلق `order` جديد ⇒ نفس الطالب عنده 3 طلبات لنفس "الاعدا المركبه"، وده مؤكد في الداتا: `lecture_title: "الاعدا المركبه"` مكرر **3 مرات**.

---

### 🟡 الدرجة الثالثة — جودة وصيانة

---

#### [P3-1] 21 عبارة `console.log('[v0] ...')` تشخيصية في كود production

في 11 ملف: `app/admin/categories/actions.ts`, `app/admin/courses/actions.ts`, `app/admin/settings/danger-actions.ts`, `app/admin/students/actions.ts`, `app/student/exams/actions.ts`, `app/student/presence-actions.ts`, `lib/curriculum.ts`, `lib/free-lecture-data.ts`, `lib/notify.ts`, `lib/site-content.ts`, `lib/video-actions.ts`.

الأخطر: `lib/curriculum.ts:179-187` بيطبع **قائمة كل الـ lecture ids** في كل request على صفحة عامة — تسريب بنية بيانات + ضوضاء لوجز + استهلاك.

---

#### [P3-2] ملفات mock ميتة و`initialData` مضلّل

- `lib/dashboard-data.ts` — **صفر imports** ⇒ حذف.
- `lib/courses-data.ts` — **صفر imports** ⇒ حذف.
- `lib/student-courses-data.ts` — مستورد في 3 ملفات، **بس للـ types فقط** (فيه `@deprecated no mock data — use real DB queries` على السطرين 36 و39). ⇒ **لا تحذفه**، انقل الـ types لـ `lib/student-types.ts`.
- `lib/reports-data.ts` — **حيّ ومؤذي** (بند P2-6).

**تصحيح لملاحظتك:** `top-courses.tsx`, `latest-lessons.tsx`, `continue-learning.tsx` **مش** بيستوردوا mock — كلهم `props` مع defaults (`{ courses = [] }`) و`continue-learning.tsx` عنده empty state سليم.

---

#### [P3-3] `mapPathToResource` بترجّع `null` لمسارات أدمن موجودة

`lib/permissions.ts:49-56` بتاخد أول segment وتطابقه مع `RESOURCE_KEYS`. المسارات اللي بترجّع `null`: `/admin/streaming`, `/admin/search`, `/admin/activity`, `/admin/no-access`.

مع bug `middleware.ts` (بند S0-2): `resource === null` ⇒ `hasAccess = false` ⇒ **المساعد بيتحوّل قسرًا لـ `/admin/no-access` لو حاول يفتح البحث أو سجل النشاط** رغم إن دي وظائف عامة.

---

#### [P3-4] `lib/media-cleanup.ts.bak` و`lib/media-migrate.ts.bak`

ملفات `.bak` جوّه `lib/`. TypeScript مش بيعملها compile فهي غير مؤذية وظيفيًا، بس دي علامة إن migration ماحصلش cleanup — وممكن حد يشيل الـ `.bak` غلط.

---

#### [P3-5] 26 ملف SQL في `scripts/` بدون آلية migration

`scripts/add_course_sections.sql`, `add_enrollment_delete_policy.sql`, `add_lecture_is_free.sql`, `add_monthly_courses.sql`, … كلها `ALTER TABLE` يدوية. مفيش `prisma/migrations/` (الـ schema معمول `db pull` من قاعدة موجودة). ⇒ **مفيش طريقة تعرف بيها إيه اللي اتطبّق على أي بيئة.** ده السبب الجذري لوجود الشجرتين المتوازيتين (بند P1-1): الشجرة الجديدة اتضافت بـ SQL يدوي والقديمة عمرها ما اتشالت.

---

#### [P3-6] Security headers غايبة تمامًا

`next.config.mjs` مالوش `headers()`. مفيش `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `Permissions-Policy`, ولا CSP. المنصة فيها لوحة أدمن + بيانات دفع ⇒ `X-Frame-Options: SAMEORIGIN` ضروري ضد clickjacking.

---

## 3. خرائط الأدلة السريعة

**الأوامر اللي تعيد التحقق من أي بند:**

```bash
# P1-1: الشجرة الميتة
grep -rn "prisma\.courses" app lib components        # → 0 نتيجة
grep -rc "prisma\.lectures" app lib | grep -v ":0"   # → 12 ملف

# P1-2: order_items فاضية
node --env-file-if-exists=/vercel/share/.env.project -e "…prisma.order_items.findMany(…)"

# P2-1: revalidatePath الغلط
grep -rhn "revalidatePath(" app lib | sed -E 's/.*revalidatePath\(//' | sort | uniq -c | sort -rn

# P1-6: أخطاء TS
npx tsc --noEmit 2>&1 | grep -c "error TS"           # → 31

# P3-1: لوجز التشخيص
grep -rn "console.log('\[v0\]" app lib components | wc -l   # → 21

# S0-1: ملفات حسّاسة على git
git ls-files | grep -E "\.(sql|csv|log)$"
```

---

## 4. ترتيب التنفيذ الموصى به

الترتيب مهم — بعض الإصلاحات بتعتمد على اللي قبلها:

| الموجة | البنود | السبب |
|---|---|---|
| **1 — إيقاف النزيف** | S0-1, S0-2, S0-3, P3-6 | أمنية، مستقلة، لا تلمس البيانات |
| **2 — إصلاح الأساس** | P1-1 (قرار الموديل), P1-2 (قيود DB), P1-3 (توحيد الهوية) | كل حاجة تانية مبنية على القرارات دي |
| **3 — استعادة الوظائف** | P1-4, P1-5, P1-6 | تعتمد على الموجة 2 |
| **4 — نظافة العرض** | P2-1 → P2-7 | آمنة ومتوازية |
| **5 — صيانة** | P3-1 → P3-5 | آخر حاجة |

**تحذير:** لا تبدأ الموجة 2 قبل عمل نسخة احتياطية كاملة للقاعدة. بند P1-1 قرار معماري (هل تُهجَّر البيانات من `courses` لـ `lectures`، أم يُعاد الكود لـ `courses`؟) ولازم يتأخد من صاحب المنتج مش من المطوّر.

---

## 5. تعليمات التنفيذ

خطوات التنفيذ الحرفية (أمر بأمر، سطر بسطر، بلا اجتهاد) في:
**`docs/DEEPSEEK_FIX_TASKS.md`**
