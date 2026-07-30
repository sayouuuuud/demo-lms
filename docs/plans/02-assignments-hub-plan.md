# خطة 2 — مركز الواجبات في لوحة الإدارة (`/admin/assignments`)

> **STATUS: غير منفّذ — 0/6 milestones**
>
> **موجّهة للموديل المنفّذ:** نفّذ Milestone واحد في المرة وبالترتيب. بعد كل Milestone شغّل `npx tsc --noEmit`. كل القرارات متاخدة — نفّذ حرفيًا.

---

## 0) قواعد إلزامية

1. **ممنوع** أي `prisma migrate` / `db push` / تشغيل SQL. أي SQL يتكتب في `prisma/sql/` وصاحب المشروع يشغّله.
2. **ممنوع** حذف أو تعديل صفحة الواجبات بتاعة الطالب (`app/student/assignments/**`) ولا مودال الواجب في المحاضرة (`components/courses/assignment-editor-modal.tsx`). الخطة دي **إضافة** صفحة إدارية جديدة.
3 كل الملفات بمسارات absolute من `/vercel/share/v0-project/`.
4. RTL + عربي مصري. **ممنوع** إيموجي في JSX. **ممنوع** ألوان مباشرة (`text-white`, `bg-black`) — استخدم توكنز التصميم الموجودة (`bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-destructive`, `bg-secondary/50`).
5. مكونات الـ UI المتاحة **فقط** في `components/ui/`: `button, card, badge, input, select, table, tabs, modal, pagination, confirm-dialog, separator, skeleton, avatar, chart, donut-chart`. **متستوردش** أي مكوّن shadcn غير موجود ومتضيفش مكتبات.
6. الرسوم بـ `recharts` عبر `components/ui/chart.tsx` أو `donut-chart.tsx` زي `components/exams/exam-charts.tsx`.

---

## 1) السياق الحالي (حقائق متأكد منها)

### المشكلة اللي بنحلّها
مفيش صفحة أدمن للواجبات خالص. الواجبات بتتعمل **جوّه صفحة المحاضرة** (`/admin/courses/[id]`) عبر `createAssignment/updateAssignment/deleteAssignment` في `app/admin/courses/actions.ts` (سطور 771–850)، ومفيش أي مكان بيعرض **التسليمات** مجمّعة، ولا نسب التسليم، ولا تصحيح.
(الطالب عنده صفحة `/student/assignments` وفي الـ sidebar بتاعه — دي موجودة وشغّالة.)

### شكل الداتا (مهم جدًا — اقراه كويس)

**فيه شجرتين محتوى في نفس القاعدة** (موثّق في `prisma/sql/legacy/README.md`):
- **الشجرة الجديدة (المستخدمة فعليًا):** `stages` → `branches` → `monthly_courses` (اختياريًا تحت `terms`) → `monthly_course_sections` → `lectures` → `lessons`.
- **الشجرة القديمة (شبه ميتة):** `courses` → `course_sections` → `course_lessons` + `enrollments` + `lesson_progress`.

جدول `assignments` بيوصل للاتنين:
```
assignments.lecture_id  -> lectures.id     (الشجرة الجديدة)  ← المسار الأساسي
assignments.course_id   -> courses.id      (الشجرة القديمة)  ← legacy
assignments.section_id  -> course_sections.id (legacy)
```
`lectures.branch_id` → `branches.stage_id` → `stages` = ده مصدر "السنة" و"الفرع".
`lectures.monthly_course_id` → `monthly_courses.title` = ده مصدر "الكورس".

**أعمدة مهمة:**
- `assignments`: `id, code (unique), type ('تسليم'|'اختبار'), title, description, instructions text[], due_date (date), points, sort_order, created_at, lecture_id, course_id, section_id`.
- `assignment_questions`: `id, assignment_id, question, options text[], correct_index, position, kind ('mcq'|...)`.
- `assignment_submissions`: `id, assignment_id, student_id, status (default 'لم يبدأ'), score, attachment_url, submitted_at` + `@@unique([assignment_id, student_id])`.
- `students`: `id, code, name, stage_id, status, user_id, phone, email`.

**قيم `status` الموجودة فعليًا في الكود** (لازم تدعمهم كلهم):
`'لم يبدأ'`, `'قيد التنفيذ'`, `'تم التسليم'`, `'مصحّح'` — وفي `app/student/actions/exams-assignments.ts` فيه mapping لمرادفات إنجليزية (`submitted`, `graded`, `pending`) ومرادف `'مصحح'` بدون شدّة. **استخدم نفس دالة التطبيع** (هتنقلها لـ lib في Milestone 2).
كمان `app/admin/students/[id]/actions.ts` (سطور 482–484) بيقارن بـ `'متأخر'` و`'لم يسلّم'` — دول **مشتقّة** مش مخزّنة: "متأخر" = سلّم بعد `due_date`، "لم يسلّم" = مفيش صف تسليم و`due_date` فات.

### نمط الصفحات الإدارية (اتبعه بالحرف)
- `app/admin/exams/page.tsx`: server component، `Promise.all` لجلب الداتا، وبعدين `<Header/> <Stats/> <Table/>`.
- الأكشنز في `app/admin/<resource>/actions.ts` بـ `'use server'`، أول سطر جوّه كل أكشن كتابة:
  `if (!(await hasResourceAccess('<key>', 'manage'))) return { error: 'غير مسموح. لازم تكون أدمن.' }`
  وللقراءة `hasResourceAccess('<key>')`.
- بعد الكتابة: `logActivity({ action, resource, targetId, targetLabel }).catch(() => {})` + `revalidatePath(...)`.
- الـ toasts بـ `sonner` (`import { toast } from 'sonner'`).
- الـ sidebar في `components/dashboard/sidebar.tsx` بيتفلتر بـ `PermissionMap`، والـ middleware بيحدّد المورد بـ `mapPathToResource()` من `lib/permissions.ts`.

---

## 2) القرارات النهائية

| البند | القرار |
|---|---|
| مسار الصفحة | `/admin/assignments` |
| مورد الصلاحيات | مفتاح جديد `assignments` في `lib/permissions.ts` (مش إعادة استخدام `courses`) |
| مكان العنصر في الـ sidebar | بعد "الاختبارات" مباشرة، أيقونة `FileText` |
| التقسيم | تبويبات علوية = **السنوات (stages)** + فلاتر: الفرع، الكورس الشهري، المحاضرة، النوع، الحالة، البحث |
| نطاق الواجبات المعروضة | `assignments` اللي لها `lecture_id` **أو** `course_id`. اللي مالهاش الاتنين تظهر تحت مجموعة "غير مرتبط" |
| المستحقّون للتسليم | طلاب `students` اللي `stage_id` = ستيج المحاضرة. لو المحاضرة مالهاش ستيج → إجمالي الطلاب النشطين |
| نسبة التسليم | `(عدد التسليمات بحالة تم التسليم أو مصحّح) / (عدد المستحقّين)` |
| صفحة تفاصيل | `/admin/assignments/[id]` بجدول تسليمات + تصحيح يدوي بدرجة |
| CRUD | **قراءة + تصحيح + تعديل تاريخ التسليم/الدرجة فقط**. الإنشاء/الحذف يفضلوا في صفحة المحاضرة (مصدر واحد للحقيقة) |
| ترقيم الصفحات | client-side على 20 صف بـ `components/ui/pagination.tsx` |

---

## Milestone 1 — الصلاحيات (ملف SQL + `lib/permissions.ts`)

### 1.1 أنشئ `/vercel/share/v0-project/prisma/sql/A01_assignments_resource.sql`

```sql
-- A01: إضافة مورد "assignments" لجدول صلاحيات المساعدين.
-- التشغيل: يدوي. idempotent.
-- كل مساعد موجود ياخد 'none' كديفولت (الأدمن يفتحها له من تبويب المساعدون).

INSERT INTO public.assistant_permissions (profile_id, resource, access_level)
SELECT p.id, 'assignments', 'none'
FROM public.profiles p
WHERE p.role = 'assistant'
ON CONFLICT (profile_id, resource) DO NOTHING;
```

### 1.2 عدّل `/vercel/share/v0-project/lib/permissions.ts`
- في `ResourceKey` أضف `| 'assignments'` **بعد** `'exams'`.
- في مصفوفة `RESOURCES` أضف **بعد** عنصر exams بالضبط:
```ts
{ key: 'assignments', label: 'الواجبات', href: '/admin/assignments' },
```
- **متلمسش** `mapPathToResource` ولا `satisfies` ولا `fullPermissionMap` — هما generic وهيشتغلوا لوحدهم (لأن `mapPathToResource('/admin/assignments')` هترجّع `'assignments'` تلقائيًا بعد إضافة المفتاح).

### 1.3 عدّل `/vercel/share/v0-project/components/dashboard/sidebar.tsx`
- في `navItems` أضف **بعد** عنصر الاختبارات:
```ts
{ label: 'الواجبات', icon: FileText, href: '/admin/assignments', resource: 'assignments' },
```
- ضيف `FileText` لاستيراد `lucide-react` الموجود.

**تحقق Milestone 1:** `npx tsc --noEmit` — لو ظهر خطأ إن `PermissionMap` ناقص مفتاح في مكان ما، صلّحه هناك (المتوقع: `components/settings/assistants-tab.tsx` بيتعامل مع `RESOURCES` ديناميكيًا فمش محتاج تعديل).

---

## Milestone 2 — طبقة الحالة المشتركة `lib/assignments-shared.ts`

**أنشئ:** `/vercel/share/v0-project/lib/assignments-shared.ts` (بدون `server-only` — الكلاينت محتاج الأنواع والألوان)

```ts
export type AssignmentType = 'تسليم' | 'اختبار'

/** الحالات المخزّنة في assignment_submissions.status */
export type StoredSubmissionStatus = 'لم يبدأ' | 'قيد التنفيذ' | 'تم التسليم' | 'مصحّح'

/** الحالة المعروضة في لوحة الإدارة (فيها حالات مشتقّة) */
export type DerivedSubmissionStatus = StoredSubmissionStatus | 'متأخر' | 'لم يسلّم'

/** يطبّع أي قيمة قديمة/إنجليزية لحالة معيارية. */
export function normalizeStatus(raw: string | null | undefined): StoredSubmissionStatus {
  const v = (raw ?? '').trim()
  if (v === 'مصحّح' || v === 'مصحح' || v === 'graded') return 'مصحّح'
  if (v === 'تم التسليم' || v === 'submitted') return 'تم التسليم'
  if (v === 'قيد التنفيذ' || v === 'pending' || v === 'in_progress') return 'قيد التنفيذ'
  return 'لم يبدأ'
}

/** يحسب الحالة المعروضة من الحالة المخزّنة + التواريخ. */
export function deriveStatus(input: {
  stored: StoredSubmissionStatus | null
  submittedAt: Date | null
  dueDate: Date | null
}): DerivedSubmissionStatus {
  const { stored, submittedAt, dueDate } = input
  const past = !!dueDate && dueDate.getTime() < Date.now()
  if (!stored || stored === 'لم يبدأ') return past ? 'لم يسلّم' : 'لم يبدأ'
  if (stored === 'قيد التنفيذ') return past ? 'لم يسلّم' : 'قيد التنفيذ'
  if (submittedAt && dueDate && submittedAt.getTime() > dueDate.getTime()) return 'متأخر'
  return stored
}

/** كلاسات الشارة لكل حالة — توكنز فقط. */
export const statusBadgeClass: Record<DerivedSubmissionStatus, string> = {
  'مصحّح': 'bg-primary/10 text-primary',
  'تم التسليم': 'bg-secondary text-secondary-foreground',
  'متأخر': 'bg-destructive/10 text-destructive',
  'قيد التنفيذ': 'bg-muted text-muted-foreground',
  'لم يبدأ': 'bg-muted text-muted-foreground',
  'لم يسلّم': 'bg-destructive/10 text-destructive',
}

export const SUBMITTED_STATUSES: StoredSubmissionStatus[] = ['تم التسليم', 'مصحّح']
```

---

## Milestone 3 — الأكشنز `app/admin/assignments/actions.ts`

**أنشئ:** `/vercel/share/v0-project/app/admin/assignments/actions.ts` بـ `'use server'` والاستيرادات:
`prisma` من `@/lib/prisma`، `hasResourceAccess` من `@/lib/auth-guard`، `logActivity` من `@/lib/audit-log`، `revalidatePath` من `next/cache`، والأنواع من `@/lib/assignments-shared`.

### 3.1 الأنواع المُصدَّرة (بالحرف)

```ts
export type AssignmentScopeOption = { id: string; title: string }

export type AssignmentsFilters = {
  stages: AssignmentScopeOption[]
  branches: (AssignmentScopeOption & { stageId: string })[]
  courses: (AssignmentScopeOption & { branchId: string })[]
  lectures: (AssignmentScopeOption & { branchId: string; courseId: string | null })[]
}

export type AdminAssignmentRow = {
  id: string
  code: string
  title: string
  type: AssignmentType
  points: number
  dueDate: string | null          // ISO أو null
  dueDateLabel: string            // معروض بالعربي أو '—'
  createdAt: string               // ISO
  questionsCount: number
  // السياق
  stageId: string | null
  stageTitle: string
  branchId: string | null
  branchTitle: string
  courseId: string | null
  courseTitle: string
  lectureId: string | null
  lectureTitle: string
  // الإحصاءات
  eligible: number
  submitted: number
  graded: number
  late: number
  missing: number
  submissionRate: number          // 0..100 مقرّبة
  avgScorePercent: number | null  // null لو مفيش تصحيح
}

export type AssignmentsOverview = {
  totalAssignments: number
  totalSubmissions: number
  overallRate: number
  needsGrading: number
  overdueMissing: number
  avgScorePercent: number
  /** لرسم الأعمدة: نسبة التسليم لكل سنة */
  byStage: { stageId: string; stageTitle: string; assignments: number; rate: number }[]
  /** لرسم الدونات: توزيع الحالات */
  statusBreakdown: { label: string; value: number }[]
  /** آخر 8 تسليمات */
  recent: { id: string; studentName: string; assignmentTitle: string; status: string; at: string }[]
}
```

### 3.2 `getAssignmentsFilters(): Promise<AssignmentsFilters>`
- guard: `if (!(await hasResourceAccess('assignments'))) return { stages: [], branches: [], courses: [], lectures: [] }`.
- استعلام واحد متداخل:
```ts
const stages = await prisma.stages.findMany({
  select: {
    id: true, title: true,
    branches: {
      select: {
        id: true, title: true,
        monthly_courses: { select: { id: true, title: true, sort_order: true }, orderBy: { sort_order: 'asc' } },
        lectures: { select: { id: true, title: true, monthly_course_id: true, sort_order: true }, orderBy: { sort_order: 'asc' } },
      },
      orderBy: { sort_order: 'asc' },
    },
  },
  orderBy: { sort_order: 'asc' },
})
```
- فلطح النتيجة للشكل المطلوب.

### 3.3 `getAssignmentRows(): Promise<AdminAssignmentRow[]>` — **قلب الخطة**
1. guard قراءة → `return []`.
2. جيب كل الواجبات مع سياقها:
```ts
const rows = await prisma.assignments.findMany({
  select: {
    id: true, code: true, title: true, type: true, points: true, due_date: true, created_at: true,
    lecture_id: true, course_id: true,
    _count: { select: { assignment_questions: true } },
    lectures: {
      select: {
        id: true, title: true, monthly_course_id: true,
        monthly_courses: { select: { id: true, title: true } },
        branches: { select: { id: true, title: true, stage_id: true, stages: { select: { id: true, title: true } } } },
      },
    },
    courses: { select: { id: true, title: true, branch_id: true } },
    assignment_submissions: {
      select: { status: true, score: true, submitted_at: true },
    },
  },
  orderBy: [{ due_date: 'desc' }, { created_at: 'desc' }],
})
```
3. جيب أعداد الطلاب لكل ستيج **مرة واحدة**:
```ts
const perStage = await prisma.students.groupBy({
  by: ['stage_id'],
  where: { status: 'نشط' },
  _count: { _all: true },
})
const activeTotal = perStage.reduce((a, r) => a + r._count._all, 0)
const stageCount = new Map(perStage.filter(r => r.stage_id).map(r => [r.stage_id as string, r._count._all]))
```
4. لكل صف احسب:
   - `stageId = row.lectures?.branches?.stage_id ?? null`
   - `eligible = stageId ? (stageCount.get(stageId) ?? 0) : activeTotal` — ولو `eligible === 0` خليه `Math.max(subs.length, 0)` عشان النسبة ما تبقاش 0/0.
   - طبّع كل تسليم بـ `normalizeStatus` واحسب `deriveStatus` بـ `due_date`.
   - `submitted` = عدد اللي حالته المشتقّة في `['تم التسليم','مصحّح','متأخر']`.
   - `graded` = حالته `'مصحّح'`.
   - `late` = `'متأخر'`.
   - `missing = Math.max(eligible - submitted, 0)`.
   - `submissionRate = eligible > 0 ? Math.round((submitted / eligible) * 100) : 0`.
   - `avgScorePercent`: من التسليمات اللي `score != null` و`points > 0`: `Math.round(avg(score/points*100))`، وإلا `null`.
   - `dueDateLabel`: `due_date?.toLocaleDateString('ar-EG', { year:'numeric', month:'short', day:'numeric' }) ?? '—'`.
   - لو مفيش `lectures`: استخدم `courses.title` كـ `courseTitle` و`stageTitle = 'غير مرتبط'`.
5. **ممنوع** أي استعلام جوّه loop (N+1). لو محتاج داتا زيادة، اجمعها بـ استعلام واحد قبل الـ loop.

### 3.4 `getAssignmentsOverview(): Promise<AssignmentsOverview | null>`
- guard قراءة → `null` (زي `getExamsStats`).
- اعتمد على نتيجة `getAssignmentRows()` (نده الدالة جوّه بعضها — مقبول ومفهوم) واحسب المجاميع:
  - `overallRate = round(sum(submitted) / max(sum(eligible),1) * 100)`
  - `needsGrading = sum(submitted - graded)`
  - `overdueMissing = sum(missing لو due_date فات)`
  - `avgScorePercent` = متوسط `avgScorePercent` للواجبات اللي مش null.
  - `byStage`: جمّع بـ `stageId`.
  - `statusBreakdown`: `[{label:'مصحّح'},{label:'تم التسليم'},{label:'متأخر'},{label:'لم يسلّم'}]` بقيمهم.
- `recent`: استعلام منفصل
```ts
prisma.assignment_submissions.findMany({
  where: { submitted_at: { not: null } },
  select: { id: true, status: true, submitted_at: true,
            students: { select: { name: true } },
            assignments: { select: { title: true } } },
  orderBy: { submitted_at: 'desc' },
  take: 8,
})
```

### 3.5 `getAssignmentDetail(assignmentId: string)`
- guard قراءة → `null`. تحقق إن `assignmentId` UUID بنفس الـ regex المستخدمة في `app/admin/courses/actions.ts` سطر 631؛ لو مش UUID → `null`.
- رجّع: بيانات الواجب + أسئلته (`orderBy position asc`) + **صفوف كل الطلاب المستحقّين** (مش التسليمات بس):
  - جيب طلاب الستيج (`students.findMany({ where: { stage_id } })` أو الكل لو مفيش ستيج) `select: { id, code, name, phone, status }`.
  - جيب `assignment_submissions` للواجب ده، واعمل `Map` بـ `student_id`.
  - رجّع صف لكل طالب: `{ studentId, studentCode, studentName, status (derived), score, scorePercent, attachmentUrl, submittedAt (ISO|null) }`.

### 3.6 أكشنز الكتابة
```ts
export async function gradeAssignmentSubmission(input: {
  assignmentId: string
  studentId: string
  score: number
}) { /* ... */ }
```
- guard: `hasResourceAccess('assignments', 'manage')`.
- تحقق: `Number.isFinite(input.score)`, `input.score >= 0`, و`input.score <= assignment.points` — غير كده `{ error: 'الدرجة لازم تكون بين 0 و' + points }`.
- `prisma.assignment_submissions.upsert({ where: { assignment_id_student_id: { assignment_id, student_id } }, update: { score, status: 'مصحّح' }, create: { assignment_id, student_id, score, status: 'مصحّح', submitted_at: new Date() } })`
  > اسم الـ compound key في Prisma = `assignment_id_student_id` (من `@@unique([assignment_id, student_id])`).
- `logActivity({ action: 'update', resource: 'assignments', targetId: assignmentId, targetLabel: \`تصحيح واجب: ${title} — ${studentName}\` }).catch(() => {})`
- `revalidatePath('/admin/assignments')` + `revalidatePath(\`/admin/assignments/${assignmentId}\`)` + `revalidatePath('/student', 'layout')`.

```ts
export async function updateAssignmentDueDate(assignmentId: string, dueDate: string | null)
```
- نفس الـ guard؛ `due_date: dueDate ? new Date(dueDate) : null`؛ logActivity `action:'update'`؛ نفس الـ revalidate.

> **ملاحظة:** `logActivity` بتاخد `resource: ResourceKey` — بعد Milestone 1 المفتاح `'assignments'` بقى صالح. لو الـ types اشتكت، معناها إنك نسيت Milestone 1.2.

---

## Milestone 4 — الصفحة والمكوّنات

### 4.1 `/vercel/share/v0-project/app/admin/assignments/page.tsx`
```tsx
import { AssignmentsPageHeader } from '@/components/assignments/assignments-page-header'
import { AssignmentsOverviewWidgets } from '@/components/assignments/assignments-overview-widgets'
import { AssignmentsExplorer } from '@/components/assignments/assignments-explorer'
import { getAssignmentRows, getAssignmentsOverview, getAssignmentsFilters } from './actions'

export default async function AdminAssignmentsPage() {
  const [rows, overview, filters] = await Promise.all([
    getAssignmentRows(),
    getAssignmentsOverview(),
    getAssignmentsFilters(),
  ])

  return (
    <div className="space-y-6">
      <AssignmentsPageHeader total={rows.length} />
      <AssignmentsOverviewWidgets overview={overview} />
      <AssignmentsExplorer rows={rows} filters={filters} />
    </div>
  )
}
```
كمان أنشئ `/vercel/share/v0-project/app/admin/assignments/loading.tsx` على نمط `app/admin/dashboard/loading.tsx` (اقراه وقلّده بـ `Skeleton`).

### 4.2 `components/assignments/assignments-page-header.tsx` (client)
- قلّد `components/exams/exams-page-header.tsx` بالحرف (اقراه الأول).
- عنوان: "الواجبات" — وصف: "كل الواجبات والتسليمات مقسّمة على السنوات والكورسات."
- زر تصدير CSV يستخدم `lib/export-csv.ts` (اقرا الملف واستخدم نفس الـ signature) — يصدّر الصفوف المفلترة الظاهرة.
- **متضيفش** زر "واجب جديد" — الإنشاء من صفحة المحاضرة (اكتب نص صغير: "الواجبات بتتضاف من داخل المحاضرة." مع لينك `/admin/courses`).

### 4.3 `components/assignments/assignments-overview-widgets.tsx` (client)
6 كروت KPI بنفس ستايل `components/exams/exams-stats.tsx` (اقراه):
1. إجمالي الواجبات
2. إجمالي التسليمات
3. نسبة التسليم العامة (%)
4. محتاج تصحيح
5. متأخر / لم يسلّم
6. متوسط الدرجات (%)

تحت الكروت شبكة `grid gap-4 lg:grid-cols-3`:
- **كارت 1 (يمتد عمودين):** أعمدة نسبة التسليم لكل سنة — `BarChart` من recharts داخل `ChartContainer` (قلّد `components/exams/exam-charts.tsx`).
- **كارت 2:** دونات توزيع الحالات بـ `components/ui/donut-chart.tsx`.
- تحتهم كارت "آخر التسليمات" — لستة من 8 صفوف: اسم الطالب + عنوان الواجب + شارة الحالة + الوقت.
- لو `overview === null` أو كل القيم صفر → اعرض حالة فاضية: كارت واحد بنص "مفيش بيانات واجبات لسه." **متعرضش** رسوم فاضية.

### 4.4 `components/assignments/assignments-explorer.tsx` (client) — أهم مكوّن
- `'use client'` + state:
```ts
const [stageId, setStageId] = useState<string>('all')
const [branchId, setBranchId] = useState<string>('all')
const [courseId, setCourseId] = useState<string>('all')
const [type, setType] = useState<'all' | AssignmentType>('all')
const [health, setHealth] = useState<'all' | 'needs_grading' | 'low_rate' | 'overdue'>('all')
const [query, setQuery] = useState('')
const [page, setPage] = useState(1)
```
- **تبويبات السنوات** فوق: زر "كل السنوات" + زر لكل stage. استخدم `components/ui/tabs.tsx` لو الـ API بيسمح، وإلا أزرار بنفس ستايل التبويبات في `components/settings/settings-panel.tsx` (سطور ~325).
- عند تغيير `stageId` → `setBranchId('all')` و`setCourseId('all')` و`setPage(1)`. نفس الشيء عند تغيير الفرع → صفّر الكورس. (منع فلاتر يتيمة — نفس منطق `exam-builder.tsx`.)
- قوائم الفروع والكورسات مفلترة من `filters` حسب المختار.
- `health`:
  - `needs_grading` → `submitted - graded > 0`
  - `low_rate` → `submissionRate < 50`
  - `overdue` → `missing > 0 && dueDate && new Date(dueDate) < new Date()`
- `query` → مطابقة غير حساسة لحالة الأحرف على `title` و`code` و`lectureTitle`.
- الفلترة كلها بـ `useMemo` على `rows`.
- **العرض:** مجموعات مطويّة (accordion) — كل مجموعة = "السنة › الفرع › الكورس"، عنوان المجموعة فيه: الاسم + عدد الواجبات + متوسط نسبة التسليم كـ progress bar بسيط (`div` بـ `bg-primary` وعرض `style={{ width: \`${rate}%\` }}`).
  - أول مجموعتين مفتوحين افتراضيًا، الباقي مطوي.
  - جوّه المجموعة: `Table` بأعمدة: الواجب (العنوان + الكود تحته `text-xs text-muted-foreground`) | النوع (Badge) | المحاضرة | التسليم (`submitted/eligible` + النسبة) | محتاج تصحيح | متأخر | آخر ميعاد | الدرجات (متوسط %) | إجراء (`Link` لـ `/admin/assignments/[id]` بنص "التفاصيل").
- الترقيم: 20 صف لكل صفحة **على مستوى الصفوف المفلترة قبل التجميع**؛ استخدم `components/ui/pagination.tsx` زي `components/students/students-table.tsx` (اقراه للـ props الصح).
- حالة فاضية: "مفيش واجبات مطابقة للفلاتر." + زر "مسح الفلاتر".

### 4.5 `/vercel/share/v0-project/app/admin/assignments/[id]/page.tsx`
- `export default async function Page({ params }: { params: Promise<{ id: string }> })` — **Next 16: لازم `await params`**.
- `const { id } = await params`؛ `const data = await getAssignmentDetail(id)`؛ لو `!data` → `notFound()` من `next/navigation`.
- يعرض:
  - رأس: عنوان الواجب + كود + شارة النوع + مسار "السنة › الفرع › الكورس › المحاضرة" + الدرجة الكلية + آخر ميعاد (مع تعديل التاريخ inline).
  - 4 كروت KPI: مستحقّين / سلّموا / متأخرين / محتاج تصحيح.
  - كارت الأسئلة (لو `type === 'اختبار'`): لستة الأسئلة + الخيارات مع تمييز الخيار الصح بـ `text-primary`.
  - `components/assignments/assignment-submissions-table.tsx` (client): جدول الطلاب + فلتر حالة + بحث + حقل درجة + زر "حفظ الدرجة" ينده `gradeAssignmentSubmission` جوّه `useTransition` + `toast` + `router.refresh()`. قلّد `components/exams/grade-submission.tsx` (اقراه الأول).
  - لينك المرفق (`attachmentUrl`) يفتح في تاب جديد بـ `rel="noopener noreferrer"` لو موجود.

---

## Milestone 5 — إصلاح باج ربط واجبات الطالب (مطلوب، مش اختياري)

**المشكلة:** في `/vercel/share/v0-project/app/student/actions/exams-assignments.ts` دالة `getStudentAssignments` بتعمل:
```ts
const lectureIds = enrollments.map((e) => e.course_id)   // ← دي courses.id مش lectures.id
const rows = await prisma.assignments.findMany({ where: { lecture_id: { in: lectureIds } } })
```
يعني بتدوّر على `lectures.id` بقيم من الشجرة القديمة `courses.id` → الطالب مبيشوفش واجباته.

**الإصلاح المطلوب (بالحرف، وبدون تغيير شكل الـ return):**
1. استخدم نفس منطق الاستهداف الموجود: `const { stageId, branchIds } = await getStudentTargeting(student)` (مستوردة أصلًا في الملف من `./notifications`).
2. جيب محاضرات الطالب:
```ts
const lectures = await prisma.lectures.findMany({
  where: branchIds.length > 0 ? { branch_id: { in: branchIds } } : { id: '00000000-0000-0000-0000-000000000000' },
  select: { id: true },
})
const lectureIds = lectures.map((l) => l.id)
```
3. الاستعلام يبقى:
```ts
where: {
  OR: [
    ...(lectureIds.length ? [{ lecture_id: { in: lectureIds } }] : []),
    ...(legacyCourseIds.length ? [{ course_id: { in: legacyCourseIds } }] : []),
  ],
}
```
حيث `legacyCourseIds` = `enrollments.map(e => e.course_id)` (نحافظ على التوافق مع الشجرة القديمة).
4. لو `lectureIds.length === 0 && legacyCourseIds.length === 0` → `return []`.
5. **متغيّرش** أي حقل في الكائن المرجّع ولا أسماء الحالات — `components/student/assignments/student-assignments-page.tsx` بيعتمد عليها.
6. استخدم `normalizeStatus` من `@/lib/assignments-shared` بدل السلسلة الشرطية الطويلة الموجودة (نفس النتيجة بالضبط).

---

## Milestone 6 — التحقق

- [ ] `npx tsc --noEmit` نضيف.
- [ ] `/admin/assignments` بتفتح للأدمن وفيها الكروت والرسوم والمجموعات.
- [ ] العنصر ظاهر في الـ sidebar بعد "الاختبارات".
- [ ] مساعد بصلاحية `assignments = none` يتحوّل بعيد عن الصفحة (middleware).
- [ ] مساعد بـ `view` يشوف الصفحة بس `gradeAssignmentSubmission` ترجّع `'غير مسموح. لازم تكون أدمن.'`
- [ ] تصحيح درجة بيغيّر الحالة لـ "مصحّح" وبيظهر للطالب في `/student/assignments`.
- [ ] درجة أكبر من `points` مرفوضة.
- [ ] فلتر السنة بيصفّر الفرع والكورس.
- [ ] الصفحة بتفتح لو مفيش أي واجبات (حالة فاضية مش crash).
- [ ] `npx prisma generate` ناجح ومفيش تعديل على موديلات موجودة.
- [ ] مفيش استعلام Prisma جوّه أي loop.

## فخاخ متقعش فيها

1. **`params` في Next 16 Promise** — لازم `await`.
2. `assignments.due_date` نوعه `@db.Date` مش timestamptz — عند الحفظ استخدم `new Date('YYYY-MM-DD')` وعند المقارنة خُد بالك من التوقيت (قارن بـ نهاية اليوم: `dueDate.setHours(23,59,59,999)` على نسخة من التاريخ).
3. الحالة `'مصحّح'` بشدّة على الصاد — **دايمًا** مرّ على `normalizeStatus`.
4. `assignments.code` عليه `@unique` — متولّدش أكواد في الخطة دي أصلًا (مفيش إنشاء).
5. `_count` على `assignment_questions` اسم الحقل بالجمع زي ما هو في السكيما.
6. **متضيفش** المورد `assignments` لـ `OPEN_ADMIN_PATHS` في `middleware.ts`.
