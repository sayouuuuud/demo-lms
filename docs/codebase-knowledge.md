# Codebase Knowledge — Demo LMS

> آخر تحديث: 2026-07-31
> الغرض: مرجع سريع قبل تنفيذ أي خطة — عشان متقرأش نفس الملفات تاني

---

## 1. Stack

- **Next.js 16** (App Router, Turbopack)
- **Prisma** (`@prisma/client`) — ORM على **Supabase Postgres**
  - `DATABASE_URL` = pooled (port 6543) — استخدمه في Prisma datasource
  - `DIRECT_URL` = direct (port 5432) — استخدمه في migrations فقط
- **NextAuth v5** — يحتاج `AUTH_SECRET`
- **Tailwind v4** — لا يوجد `tailwind.config.js`، الثيم في `globals.css` داخل `@theme {}`
- **shadcn/ui** — مكوّنات في `components/ui/`
- **RTL / عربي** بالكامل

---

## 2. هيكل المجلدات المهم

```
app/
  admin/
    assignments/          ← الخطة 02 ستُنشئ هذا المجلد (غير موجود بعد)
    courses/actions.ts    ← يحتوي على CRUD كامل للـ assignments (createAssignment, updateAssignment, deleteAssignment, gradeAssignment)
    exams/                ← المرجع الأقرب لـ assignments hub
      page.tsx
      actions.ts
      [id]/page.tsx
      [id]/actions.ts
    students/[id]/actions.ts ← يحتوي على استعلام assignments للطالب + derivation المنطق
    payments/orders-actions.ts
  student/
    actions/
      exams-assignments.ts  ← getMyAssignments + submitAssignment
      notifications.ts
      profile.ts
components/
  dashboard/
    sidebar.tsx             ← يحتوي على قائمة nav + permission checks
    permissions-context.tsx ← context يُعطي permissions للـ client components
  exams/                    ← المرجع البصري والمنطقي للـ assignments
    exams-page-header.tsx
    exams-stats.tsx
    exams-table.tsx
    exam-charts.tsx
    exam-details-header.tsx
    exam-stats.tsx
    exam-submissions-table.tsx
    exam-questions-list.tsx
    grade-submission.tsx
    builder/exam-builder.tsx
  student/assignments/student-assignments-page.tsx
  ui/
    chart.tsx, donut-chart.tsx, pagination.tsx, modal.tsx
    table.tsx, tabs.tsx, select.tsx, badge.tsx, card.tsx
    input.tsx, button.tsx, skeleton.tsx
  settings/
    assistants-tab.tsx
    settings-panel.tsx
lib/
  prisma.ts               ← export اسمه `prisma` (PrismaClient singleton)
  permissions.ts          ← كل الـ permissions + canUser()
  auth-guard.ts           ← requireAdmin(), requirePermission()
  audit-log.ts            ← logActivity()
  export-csv.ts           ← generateCsv()
  exams-data.ts           ← getExams(), getExamById() — النمط المتبع لـ assignments-data
  students-data.ts        ← getStudents(), getStudentById()
  student-types.ts        ← Student type + helpers
  student-profile-data.ts ← StudentProfileData type
  whatsapp.ts             ← sendWhatsAppText(), paymentApprovedText() (أُضيف في الخطة 01)
  phone.ts                ← normalizeEgyptPhone(), maskPhone() (أُضيف في الخطة 01)
prisma/
  schema.prisma           ← ~1530 سطر
  sql/                    ← migration scripts يدوية (W01_whatsapp_messages.sql)
middleware.ts             ← NextAuth middleware
```

---

## 3. Prisma Schema — النماذج المهمة

### `assignments`
```
id, title, description?, instructions?, lecture_id (FK→lectures), due_date?,
max_grade (default 100), allow_late (default false),
created_at, updated_at
```

### `assignment_submissions`
```
id, assignment_id (FK→assignments), student_id (FK→students),
content?, file_url?, submitted_at (default now),
grade?, feedback?, graded_at?, graded_by?
status: 'submitted' | 'graded' | 'late'
```

### `assignments` ← مربوط بـ `lectures` ← مربوط بـ `courses`
```
courses → stages → branches → lectures → assignments
```

### `students`
```
id (uuid), user_id (FK→auth.users), name, phone, email, ...
```
> تنبيه: `orders.student_id` يشير لـ `auth.users.id`، لكن `students.id` != `auth.users.id`.
> للربط بين الاثنين: `students.user_id = auth.users.id`

### `whatsapp_messages` (أُضيف في الخطة 01)
```
id, to_phone, template, body, status, provider_message_id,
error, student_id (FK→students.id), created_at, sent_at
```

### `stages`
```
id, slug, title, sort_order
```

### `branches`
```
id, stage_id (FK→stages), title, slug
```

### `lectures`
```
id, branch_id (FK→branches), title, ...
```

---

## 4. Permissions System

**الملف:** `lib/permissions.ts`

```ts
// الدالة الرئيسية
canUser(userRole, permission): boolean

// الـ permissions المتاحة (موجودة في PermissionKey)
'view_assignments', 'grade_assignments', 'manage_assignments'
// + كل باقي permissions الموجودة
```

**الملف:** `lib/auth-guard.ts`
```ts
requireAdmin()          // يُعيد session أو يعمل redirect
requirePermission(key)  // يُعيد session أو يعمل redirect + يتحقق من permission
```

**الملف:** `components/dashboard/permissions-context.tsx`
- Context اسمه `PermissionsContext`
- يُستخدم في client components عبر `usePermissions()`

---

## 5. Sidebar — كيف تُضيف Link جديد

**الملف:** `components/dashboard/sidebar.tsx`

```ts
// النمط الموجود
{ label: 'الامتحانات', href: '/admin/exams', icon: FileText, permission: 'view_exams' }

// لإضافة assignments
{ label: 'الواجبات', href: '/admin/assignments', icon: ClipboardList, permission: 'view_assignments' }
```

الـ sidebar يفلتر الـ links بناءً على `session.user.role` و`canUser()`.

---

## 6. نمط الـ Admin Pages (مرجع: exams)

### Server Component Page (`app/admin/exams/page.tsx`)
```ts
// 1. requirePermission('view_exams')
// 2. getExams(filters) من lib/exams-data.ts
// 3. يمرر البيانات لـ client components
export default async function ExamsPage({ searchParams }) {
  const session = await requirePermission('view_exams')
  const data = await getExams({ ...filters })
  return (
    <>
      <ExamsPageHeader />
      <ExamsStats stats={data.stats} />
      <ExamsTable exams={data.exams} total={data.total} />
    </>
  )
}
```

### Actions File (`app/admin/exams/actions.ts`)
```ts
'use server'
// validateInput → prisma query → revalidatePath → logActivity → return { success, data? }
```

### Data Fetching (`lib/exams-data.ts`)
```ts
// Single query مع includes — لا N+1
// يُعيد { exams, stats, total }
// Filters: stageId, branchId, search, page, pageSize
```

---

## 7. Assignment CRUD — موجود في courses/actions.ts

```ts
// الـ actions الموجودة
createAssignment(lectureId, input)   // سطر ~760
updateAssignment(id, input)          // سطر ~800
deleteAssignment(id)                 // سطر ~840
gradeAssignment(submissionId, input) // سطر ~860
```

**AssignmentInput type:**
```ts
{
  title: string
  description?: string
  instructions?: string
  due_date?: Date
  max_grade?: number
  allow_late?: boolean
}
```

---

## 8. Student Assignments — الـ Bug المذكور في الخطة 02

**الملف:** `app/student/actions/exams-assignments.ts`

الـ bug: دالة `getMyAssignments` تجيب assignments بدون filter على `student_id` أو `course_id` الصح.  
الـ fix المطلوب حسب الخطة: إضافة فلتر على الـ lectures المتاحة للطالب فقط (من خلال `order_items` المدفوعة).

---

## 9. Derivation منطق Assignment Status

**الملف:** `app/admin/students/[id]/actions.ts` (سطر ~350–470)

```ts
// المنطق:
// - لا يوجد submission → 'pending'
// - submission.status === 'graded' → 'graded'
// - submission موجود + due_date فات → 'late'
// - submission موجود + due_date لسه → 'submitted'
// - due_date فات بدون submission → 'overdue'
```

---

## 10. Export CSV

**الملف:** `lib/export-csv.ts`

```ts
generateCsv(rows: Record<string, unknown>[], filename: string): Response
// يُستخدم في Route Handler: GET /api/admin/assignments/export
```

---

## 11. Chart Components

- `components/ui/donut-chart.tsx` — DonutChart مع legend
- `components/ui/chart.tsx` — Recharts wrapper (ChartContainer, ChartTooltip)
- نمط الاستخدام في `components/exams/exam-charts.tsx`

---

## 12. Audit Log

**الملف:** `lib/audit-log.ts`

```ts
logActivity({
  action: string,       // 'grade_assignment', 'bulk_grade', ...
  resource: string,     // 'assignments'
  targetId?: string,
  targetLabel?: string,
})
```

---

## 13. ما تحتاجه الخطة 02 ولم يُنفَّذ بعد

### SQL جديد مطلوب (Milestone 1)
```sql
-- لا شيء — الجداول assignments و assignment_submissions موجودة في الـ schema
-- فقط SQL لـ RLS policies إذا لزم
```

### Permissions جديدة مطلوبة
```ts
// في lib/permissions.ts أضف:
'view_assignments'    // للـ sidebar + page guard
'grade_assignments'   // لتصحيح الواجبات
'manage_assignments'  // للحذف والتعديل
```

### ملفات جديدة تُنشأ
```
lib/assignments-data.ts                    ← data fetching layer (مثل exams-data.ts)
lib/assignments-shared.ts                  ← deriveAssignmentStatus() + types
app/admin/assignments/page.tsx             ← صفحة hub الرئيسية
app/admin/assignments/loading.tsx          ← skeleton
app/admin/assignments/actions.ts           ← bulkGrade, exportCsv, toggleStatus
app/admin/assignments/[id]/page.tsx        ← تفاصيل واجب واحد
app/admin/assignments/[id]/actions.ts      ← gradeSubmission, returnSubmission
components/assignments/
  assignments-page-header.tsx
  assignments-stats.tsx
  assignments-table.tsx
  assignment-detail-header.tsx
  assignment-submissions-table.tsx
  assignment-grade-form.tsx
  assignments-charts.tsx
```

### ملفات تُعدّل
```
lib/permissions.ts                         ← إضافة 3 permissions
components/dashboard/sidebar.tsx           ← إضافة link الواجبات
app/student/actions/exams-assignments.ts   ← fix bug الـ filter
```

---

## 14. نمط تشغيل SQL Migrations يدويًا

```js
// .v0-apply-XXX.mjs
import { createRequire } from 'module'
import { readFileSync } from 'fs'
const require = createRequire(import.meta.url)
const { Client } = require('pg')
const sql = readFileSync('./prisma/sql/XXX.sql', 'utf8')
const client = new Client({ connectionString: process.env.DIRECT_URL })
await client.connect()
await client.query(sql)
await client.end()

// تشغيل:
// node --env-file-if-exists=.env.development.local .v0-apply-XXX.mjs
```

---

## 15. ملاحظات عامة

- **لا تستخدم `localStorage`** — كل البيانات من DB عبر Prisma
- **`prisma` singleton** exported from `lib/prisma.ts`
- **`revalidatePath`** بعد كل server action
- **`void someAsyncFn()`** للـ fire-and-forget (مثل WhatsApp notifications)
- الـ schema يستخدم `@@schema("public")` و `@@schema("auth")` (multiSchema)
- كل UUIDs من نوع `@db.Uuid`
- `gen_random_uuid()` للـ default id
