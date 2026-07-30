# Assignments Hub — Codebase Context (اقرأ ده بدل ما تقرأ الكود كله تاني)

> ده ملخص كل اللي اتقرأ عشان تنفيذ خطة `02-assignments-hub-plan.md`.
> لو اتطلب منك نفس التاسك، اقرأ الملف ده + الخطة بس، ومتعيدش قراية كل الملفات دي تاني إلا لو محتاج تفاصيل دقيقة جدًا.

---

## 1) الخطة نفسها (02-assignments-hub-plan.md) — ملخص

الهدف: صفحة أدمن "مركز الواجبات" على `/admin/assignments` + إصلاح bug في صفحة الطالب.

### Milestones
1. **Permissions**: إضافة permission جديدة `assignments` (SQL seed + `lib/permissions.ts` + sidebar nav item).
2. **`lib/assignments-shared.ts`**: طبقة status مشتركة (derive assignment status من الـ submissions + due_date).
3. **`app/admin/assignments/actions.ts`**: server actions (list, detail, grade, stats).
4. **Page + components**: `app/admin/assignments/page.tsx` + `components/assignments/*` (header, widgets, explorer, detail).
5. **Fix student assignments bug**: في `app/student/actions/exams-assignments.ts`.
6. **Verify**: `npx tsc --noEmit` + `npx prisma generate` + التأكد إن مفيش N+1.

---

## 2) Prisma / DB

- Schema في `prisma/schema.prisma` (~1520 سطر). الـ enums في الآخر (من ~1490).
- SQL migrations اليدوية في `prisma/sql/` (مثال: `W01_whatsapp_messages.sql`).
- Models مهمة للواجبات:
  - `assignments` — id, title, description, due_date, max_score, lecture_id, stage_id, branch_id, is_published, created_at...
  - `assignment_questions` — assignment_id, question_text, question_type, options (json), correct_answer, points, sort_order.
  - `assignment_submissions` — assignment_id, student_id, answers (json), score, graded_at, submitted_at, status.
  - `students` — id, user_id (بيشاور على auth.users), name, phone, stage_id, branch_id...
  - `stages` — id, slug, title, sort_order.
  - `branches` — id, stage_id, title.
  - `lectures` — id, title, stage_id, branch_id.
- **مهم**: `orders.student_id` بيشاور على `auth.users.id` (مش `public.students.id`). عشان تجيب صف الطالب استخدم `students.findFirst({ where: { user_id } })`.
- Prisma client بيتعمله generate بـ `npx prisma generate`. الـ datasource بيستخدم `DATABASE_URL` (pooled 6543) و `DIRECT_URL` (direct 5432) — الاتنين لازم يكونوا في env.

---

## 3) Auth & Permissions

### `lib/auth-guard.ts`
- `requireAdmin()` — بيرمي error لو مش أدمن.
- `requirePermission(permission)` — بيرمي لو المستخدم ماعندوش الـ permission.
- `getSessionUser()` — بيرجع المستخدم الحالي أو null.
- الـ session من NextAuth v5 (`auth.ts` في root). مفيش `secret` في الكود → بيعتمد على env `AUTH_SECRET`.

### `lib/permissions.ts`
- `Permission` type union بكل الـ permissions الحالية: `'dashboard' | 'students' | 'courses' | 'exams' | 'payments' | 'settings' | ...`
- `PERMISSIONS` array: كل permission ليها `{ key, label, description }`.
- `DEFAULT_PERMISSIONS` و role-based maps.
- **لإضافة `assignments`**: ضيفها في الـ union + في `PERMISSIONS` + في الـ defaults المناسبة.

### `components/dashboard/permissions-context.tsx`
- `PermissionsProvider` + `usePermissions()` hook → بيرجع `{ hasPermission, permissions, ... }`.

### `components/dashboard/sidebar.tsx`
- Nav items array: `{ href, label, icon, permission }`.
- بيستخدم `usePermissions()` عشان يخبي/يظهر items.
- **لإضافة assignments**: ضيف `{ href: '/admin/assignments', label: 'الواجبات', icon: <Icon>, permission: 'assignments' }`.

### `middleware.ts`
- NextAuth middleware بيحمي `/admin/*` و `/student/*`.

---

## 4) Server Actions Pattern

### `app/admin/exams/actions.ts` (المرجع الأساسي)
```ts
'use server'
import { requirePermission } from '@/lib/auth-guard'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/audit-log'

export async function getExams(...) {
  await requirePermission('exams')
  // prisma queries...
}
export async function someMutation(...) {
  await requirePermission('exams')
  // mutate...
  logActivity({ action: '...', resource: 'exams', targetId, targetLabel }).catch(() => {})
  revalidatePath('/admin/exams')
  return { success: true }
}
```
- `logActivity` من `lib/audit-log.ts`: `{ action, resource, targetId?, targetLabel? }` — بتتسجل fire-and-forget (`.catch(() => {})`).
- UUID validation regex موجود في `app/admin/courses/actions.ts` (~سطر 620): `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`.

### `app/admin/courses/actions.ts` — Assignment CRUD موجود بالفعل
- `createAssignment`, `updateAssignment`, `deleteAssignment` (~سطر 700-900).
- Types: `AssignmentInput`, `AssignmentQuestionInput` (~سطر 80-260).
- **يعني الإنشاء/التعديل موجود — الهب الجديد للعرض والتصحيح بس.**

### `app/admin/exams/[id]/actions.ts` — Detail actions (المرجع للـ detail)
- `getExamDetail(id)`, `gradeSubmission(...)`, إلخ.

---

## 5) Page & Components Pattern

### `app/admin/exams/page.tsx` (المرجع للـ list page)
- Server component: auth guard → fetch → render.
- بيستخدم `<Suspense>` حوالين الأقسام.
- بيركب: PageHeader + Stats + Charts + Table.

### `app/admin/exams/[id]/page.tsx` (المرجع للـ detail page)
- نفس الفكرة: header + stats + submissions table + questions list.

### Components المرجعية (components/exams/)
- `exams-page-header.tsx` — client: عنوان + وصف + أزرار actions.
- `exams-stats.tsx` — grid of stat cards.
- `exam-charts.tsx` — recharts جوه `ChartContainer` (من `components/ui/chart.tsx`).
- `exams-table.tsx` — جدول list.
- `exam-submissions-table.tsx` — جدول submissions مع grading.
- `exam-details-header.tsx`, `exam-stats.tsx`, `exam-questions-list.tsx` — للـ detail.
- `grade-submission.tsx` — dialog التصحيح.
- `builder/exam-builder.tsx` — **فيه cascading selects stage → branch** (المرجع للفلاتر المتسلسلة).

### `components/students/students-table.tsx` (المرجع للجدول الكامل)
- Search + filters + pagination + export CSV — كلهم في client component واحد.

---

## 6) UI Primitives (components/ui/) — كلها موجودة

- `card.tsx` — `Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter`.
- `button.tsx` — `Button` مع variants (default, outline, ghost, destructive...) و sizes.
- `input.tsx` — `Input`.
- `badge.tsx` — `Badge` مع variants.
- `table.tsx` — `Table, TableHeader, TableBody, TableRow, TableHead, TableCell`.
- `tabs.tsx` — `Tabs, TabsList, TabsTrigger, TabsContent`.
- `select.tsx` — `Select, SelectTrigger, SelectValue, SelectContent, SelectItem`.
- `modal.tsx` — `Modal` (مش Dialog من shadcn — custom modal).
- `skeleton.tsx` — `Skeleton`.
- `pagination.tsx` — `Pagination` component جاهز.
- `donut-chart.tsx` — `DonutChart` component.
- `chart.tsx` — shadcn chart: `ChartContainer, ChartTooltip, ChartTooltipContent, ...` (بيستخدم recharts).

---

## 7) Helpers (lib/)

- `lib/prisma.ts` — `export const prisma = new PrismaClient()` (singleton).
- `lib/export-csv.ts` — `exportToCsv(filename, rows)` helper.
- `lib/exams-data.ts` — exam types/helpers.
- `lib/students-data.ts` — student types/helpers.
- `lib/student-types.ts` — student type definitions.
- `lib/student-profile-data.ts` — profile types.
- `lib/phone.ts` — `normalizeEgyptPhone`, `maskPhone`, `maskEmail`.
- `lib/whatsapp.ts` — `sendWhatsAppText`, `paymentApprovedText`, `checkWhatsAppConnection`, `isWhatsAppConfigured`.

---

## 8) Student Side

### `app/student/actions/exams-assignments.ts`
- Queries للامتحانات والواجبات بتاعة الطالب.
- **فيه bug (Milestone 5)** — الخطة بتحدده. اقرأ الملف ده لما توصل للـ milestone ده.

### `components/student/assignments/student-assignments-page.tsx`
- UI صفحة واجبات الطالب.

### `app/student/actions/notifications.ts`
- Notification targeting pattern (إزاي بيتم استهداف طلاب معينين).

---

## 9) Derived Assignment Status (المنطق الموجود حاليًا)

### `app/admin/students/[id]/actions.ts` (~سطر 350-500)
- فيه منطق بيشتق حالة الواجب من الـ submissions + due_date:
  - لو فيه submission متصححة → graded
  - لو فيه submission مش متصححة → submitted/pending
  - لو مفيش submission وعدّى الـ due_date → overdue/missed
  - لو مفيش submission ولسه → pending/upcoming
- **ده المرجع لـ `lib/assignments-shared.ts` (Milestone 2)** — المفروض يتنقل/يتعمم هناك.

---

## 10) Settings / Assistants

### `components/settings/settings-panel.tsx`
- Tabs pattern (~سطر 300-360).

### `components/settings/assistants-tab.tsx`
- إدارة المساعدين مع permissions checkboxes — **لما تضيف permission جديدة (`assignments`) ممكن تحتاج تضيفها هنا** عشان تظهر في واجهة المساعدين.

---

## 11) Loading Pattern

### `app/admin/dashboard/loading.tsx`
- Skeleton loading pattern — اعمل نسخة لـ `app/admin/assignments/loading.tsx`.

---

## 12) ملاحظات تنفيذية مهمة

- **ممنوع N+1**: استخدم `include`/`select` مع aggregations بدل loops فيها queries.
- **RTL**: الواجهة عربية — كل النصوص بالعربي، والاتجاه RTL.
- **revalidatePath** بعد كل mutation.
- **logActivity** بعد كل mutation (fire-and-forget).
- **requirePermission('assignments')** في أول كل action جديدة.
- الصفحة الجديدة تحت `/admin` محمية بالـ middleware تلقائيًا.
- بعد أي تعديل في schema: `npx prisma generate` وبعدين `npx tsc --noEmit`.

---

## 13) خريطة الملفات اللي هتتعمل/تتعدل (حسب الخطة)

**جديدة:**
- `prisma/sql/A01_assignments_permission.sql` (أو اسم مشابه — seed للـ permission)
- `lib/assignments-shared.ts`
- `app/admin/assignments/actions.ts`
- `app/admin/assignments/page.tsx`
- `app/admin/assignments/loading.tsx`
- `app/admin/assignments/[id]/page.tsx` (لو فيه detail)
- `components/assignments/assignments-page-header.tsx`
- `components/assignments/assignments-widgets.tsx` (stats/charts)
- `components/assignments/assignments-explorer.tsx` (table/filters)
- `components/assignments/assignment-detail.tsx` (أو مكونات detail منفصلة)

**معدّلة:**
- `lib/permissions.ts` (إضافة 'assignments')
- `components/dashboard/sidebar.tsx` (nav item)
- `components/settings/assistants-tab.tsx` (checkbox للـ permission الجديدة — لو applicable)
- `app/student/actions/exams-assignments.ts` (fix bug — Milestone 5)
