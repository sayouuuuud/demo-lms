# خطة 3 — بنك الأسئلة الاحترافي (`/admin/question-bank`)

> **STATUS: غير منفّذ — 0/8 milestones**
>
> **موجّهة للموديل المنفّذ:** اقرأ الملف كله قبل ما تكتب أي سطر. نفّذ Milestone واحد في المرة وبالترتيب. بعد كل Milestone شغّل `npx tsc --noEmit` ولازم ينجح قبل ما تكمل. **كل القرارات المعمارية متاخدة هنا — نفّذ حرفيًا ومتخترعش حاجة من دمّك.**

---

## 0) قواعد إلزامية (ممنوع تخالفها)

1. **ممنوع** `prisma migrate` / `prisma db push` / تشغيل أي SQL على القاعدة. المشروع مالوش `prisma/migrations/` والسكيما متعمولة `db pull` من Supabase.
2. أي تغيير DB يتكتب في **ملف SQL جديد** تحت `prisma/sql/` وصاحب المشروع هو اللي يشغّله يدوي. بعدها **إنت** تضيف الـ `model` blocks بإيدك في `prisma/schema.prisma` مطابقة 1:1 للـ SQL، وبعدها `npx prisma generate` **بس**.
3. **ممنوع** تعديل أو حذف أي سلوك موجود في: `app/admin/exams/actions.ts` (دالة `saveExam` تتوسّع بحقل اختياري فقط)، `lib/exam-builder.ts` (إضافة فقط)، `components/exams/builder/*` (إضافة أزرار ومودالات فقط). الاختبارات القديمة لازم تفضل تشتغل بالحرف.
4. كل المسارات **absolute** من `/vercel/share/v0-project/`. كل تعديل بأدوات Edit/Write.
5. RTL + عربي مصري. **ممنوع** إيموجي في JSX. **ممنوع** ألوان مباشرة (`text-white`, `bg-black`) — استخدم التوكنز: `bg-card`, `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary`, `text-destructive`, `bg-secondary/50`, `bg-muted`.
6. مكونات الـ UI المتاحة **فقط** اللي موجودة في `components/ui/`:
   `attachments-upload-field, avatar, badge, button, card, chart, confirm-dialog, donut-chart, image-upload-field, input, modal, pagination, select, separator, skeleton, table, tabs, video-upload-field`.
   **ممنوع** تستورد أي مكوّن shadcn مش موجود، و**ممنوع** تضيف أي مكتبة npm جديدة.
7. الحقول النصية في الفورمز: استخدم نفس `fieldCls` المستخدم في `components/exams/builder/exam-builder.tsx`:
   `'w-full rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card'`
   حُطّه في ملف مشترك مرة واحدة (Milestone 5) ومتكرّروش.
8. الـ toasts بـ `sonner`: `import { toast } from 'sonner'`.

---

## 1) السياق الحالي (حقائق متأكد منها — متفحصش تاني)

### الاختبارات الحالية
- **البناء:** `app/admin/exams/create/page.tsx` → `components/exams/builder/exam-builder.tsx` (client) → `saveExam()` من `app/admin/exams/actions.ts`.
- `lib/exam-builder.ts` فيه الأنواع اللي الـ builder شغّال بيها:
  ```ts
  type QuestionType = 'mcq' | 'essay' | 'file'
  type QuestionContentMode = 'text' | 'image'
  type McqOption = { id: string; text: string }
  type Question = {
    id, type, contentMode, text, imageUrl, points,
    options: McqOption[], correctOptionId: string | null, multipleAnswers: boolean,
    modelAnswer: string, wordLimit: number | null,
    allowedTypes: string[], maxFileSizeMb: number, required: boolean
  }
  type ExamMeta = { title, course, description, duration, passMark, shuffle, stageId, branchId }
  ```
  وفيه `createQuestion(type)`, `createOption(text)`, `questionTypeMeta`, `fileTypeOptions`, و`uid(prefix)` (داخلي، مش مُصدَّر).
- **`SaveExamPayload.questions[]`** بياخد بس: `type, contentMode, text, imageUrl, points, options, correctOptionId, modelAnswer`. (باقي حقول `Question` مش بتتخزّن حاليًا — **مش مشكلتك، متغيّرهاش**.)
- **جدول `exam_questions`** (السكيما، سطر 845): `id, exam_id, question_text, options Json?, correct_answer String?, points Int, question_type String default 'mcq', content_mode String default 'text', image_url, model_answer, order_index Int`.
  - في `saveExam` الـ MCQ بتتخزّن `options = q.options.map(o => o.text)` (مصفوفة نصوص جوّه JSON) و`correct_answer = نص الخيار الصحيح`. **حافظ على نفس الشكل ده بالحرف** في أي كود بيولّد أسئلة من البنك، عشان صفحة الطالب والتصحيح ما يتكسروش.
- **`exams`** (سطر 887): `id, code unique, title, course, duration, questions Int, participants, avg_score, status ('منشور'|'مسودة'), pass_mark, description, shuffle, branch_id, stage_id`.
- **`exam_answers`** (سطر 825): `submission_id, question_id → exam_questions.id, awarded_points, is_correct, needs_manual`. ← ده مصدر إحصائيات صعوبة السؤال فعليًا.

### شجرة المحتوى (مصدر التصنيف)
```
stages (السنة)  →  branches (الفرع)  →  monthly_courses (الكورس الشهري)  →  monthly_course_sections  →  lectures (المحاضرة)  →  lessons
```
- `lectures`: `id, branch_id (NOT NULL), monthly_course_id?, monthly_course_section_id?, title, slug`.
- `branches.stage_id` → `stages.id`. `stages`: `id, slug unique, title, sort_order`.
- **مهم:** من `lecture_id` لوحده تقدر تستنتج `monthly_course_id` و`branch_id` و`stage_id` بـ join واحد. **دي هي "الطريقة اللي تسهّل الموضوع"** المطلوبة في الطلب: المدرس يختار المحاضرة والنظام يستنتج الباقي أوتوماتيك.
- الشجرة القديمة (`courses`/`course_sections`/`course_lessons`) **متستخدمهاش** في الخطة دي إطلاقًا.

### الصلاحيات والـ sidebar
- `lib/permissions.ts`: `ResourceKey` union + `RESOURCES[]` (المفتاح، الليبل، الـ href) + `mapPathToResource()` (بياخد أول segment بعد `/admin` ويقارنه بالمفاتيح) + `satisfies()`.
- `lib/auth-guard.ts`: `hasResourceAccess(key, level?)` — `level` افتراضي `'view'`.
- `components/dashboard/sidebar.tsx`: بيبني العناصر ويفلترها بـ `PermissionMap`.
- `middleware.ts` بيستعمل `mapPathToResource()` — فمعنى كده إن **أي مسار `/admin/<seg>` لازم يكون `<seg>` مفتاح مورد معروف**، وإلا الـ middleware هيرجّع `null` (اتأكد من سلوكه لما تضيف المفتاح).
- نمط الأكشنز: أول سطر جوّه أكشن كتابة:
  `if (!(await hasResourceAccess('question_bank', 'manage'))) return { error: 'غير مسموح. لازم تكون أدمن.' }`
  وللقراءة `hasResourceAccess('question_bank')`. وبعد الكتابة `logActivity({...}).catch(() => {})` + `revalidatePath(...)`.

> ⚠️ **تنبيه على مفتاح المورد:** `mapPathToResource` بيقارن بأول segment من الـ URL. عشان كده مفتاح المورد لازم يساوي الـ segment **بالحرف**. المسار المتفق عليه `/admin/question-bank` → يبقى المفتاح **`'question-bank'`** (بشرطة، مش underscore). استخدم `'question-bank'` في كل حاجة: `ResourceKey`، `RESOURCES`، `hasResourceAccess`، و`assistant_permissions.resource`.

---

## 2) القرارات النهائية (متسألش عنها تاني)

| البند | القرار |
|---|---|
| مسار الصفحة | `/admin/question-bank` |
| مفتاح المورد | `'question-bank'` (جديد في `lib/permissions.ts`، بعد `'exams'`) |
| مكان الـ sidebar | بعد "الاختبارات" مباشرة، ليبل **"بنك الأسئلة"**، أيقونة `Library` من lucide |
| أنواع الأسئلة | نفس الثلاثة الموجودين بالحرف: `mcq` / `essay` / `file`. **ممنوع** تضيف نوع جديد. |
| الصعوبة | 3 مستويات ثابتة: `easy` / `medium` / `hard` (عربي: سهل / متوسط / صعب) |
| الصعوبة التلقائية | عمود محسوب `auto_difficulty` بيتحدّث من نسبة الإجابات الصحيحة (`exam_answers`) عبر أكشن يدوي "تحديث إحصائيات البنك". الصعوبة اليدوية هي المعتمدة دايمًا للفلترة؛ التلقائية للعرض/الاقتراح فقط. |
| الربط بالمحتوى | جدول ربط **many-to-many متعدد المستويات**: `question_bank_scopes(question_id, scope_type, scope_id)` بـ `scope_type ∈ ('stage','branch','monthly_course','lecture')`. السؤال يقدر يكون مربوط بأكتر من نطاق ومستوى في نفس الوقت. |
| تسهيل الربط | المدرس يختار **المحاضرة** بس → الأكشن يستنتج ويكتب صفوف `lecture` + `monthly_course` + `branch` + `stage` أوتوماتيك (`autoExpandScopes`). ولو اختار كورس شهري → يستنتج `branch` + `stage`. ولو اختار فرع → يستنتج `stage`. |
| الوسوم (المواضيع) | `question_bank_topics(id, title unique, created_at)` + `question_bank_question_topics(question_id, topic_id)`. الوسوم حرة يكتبها المدرس ويتم إنشاؤها لو مش موجودة (get-or-create). |
| تخزين السؤال | جدول واحد `question_bank_questions` + الخيارات في عمود `options jsonb` بنفس شكل `exam_questions.options` (**مصفوفة نصوص**) + `correct_answer text` (نص الخيار الصحيح). **ما فيش جدول خيارات منفصل** — عشان التوافق الكامل مع `saveExam`. |
| الحذف | **Soft delete** بعمود `archived_at`. الأسئلة المستخدمة في اختبارات ما تتحذفش أبدًا (الاختبار عنده نسخته الخاصة في `exam_questions`). |
| علاقة الاختبار بالبنك | عمود جديد `exam_questions.bank_question_id uuid NULL` (بدون FK صارم؟ **لأ — بـ FK `ON DELETE SET NULL`**) لتتبّع الاستخدام وحساب الإحصائيات. |
| نسخ لا مراجع | لما تسحب سؤال من البنك للاختبار، بيتعمل **نسخة (snapshot)** في `exam_questions`. تعديل السؤال في البنك بعد كده **مش** بيغيّر الاختبارات القديمة. ده مقصود. |
| التوليد التلقائي | أكشن `generateExamQuestions({ scope, counts: {easy, medium, hard}, types, topicIds, excludeIds })` بيرجّع أسئلة عشوائية مطابقة. العشوائية من DB بـ `ORDER BY random()`. |
| استبدال سؤال | أكشن `pickReplacementQuestion({ questionId, scope, difficulty, type, excludeIds })` بيرجّع سؤال واحد بديل بنفس المعايير. |
| الاختيار اليدوي | مودال "اسحب من البنك" جوّه الـ builder فيه نفس فلاتر صفحة البنك + checkboxes + زرار "أضف المحدد". |
| الإدخال المجمّع | محلّل نص (`parseBulkQuestions`) بصيغة ثابتة موصوفة في Milestone 6. |
| أرشفة أسئلة اختبار موجود | أكشن `importQuestionsFromExam(examId, scopeInput)` بينسخ أسئلة اختبار قديم للبنك. |
| الترقيم | 20 سؤال في الصفحة، `components/ui/pagination.tsx`، pagination على السيرفر (`skip`/`take`). |
| الصور | `components/ui/image-upload-field.tsx` (نفس ما يستخدمه `question-card.tsx`). |

---

## Milestone 1 — ملف الـ SQL (اكتبه بس، متشغّلوش)

**أنشئ:** `/vercel/share/v0-project/prisma/sql/Q01_question_bank.sql`

```sql
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
```

**بعد ما تكتب الملف:** اكتب في الشات للمستخدم بالنص:
> جاهز. شغّل `prisma/sql/Q01_question_bank.sql` على القاعدة وقولّي "اتطبق" أكمل.

**ومتكمّلش لـ Milestone 2 غير بعد ما يقول اتطبق.**

---

## Milestone 2 — موديلات Prisma

**عدّل:** `/vercel/share/v0-project/prisma/schema.prisma`

1. أضف الموديلات دي في آخر الملف **قبل** أول `enum` (يعني قبل `enum aal_level` سطر ~1505):

```prisma
model question_bank_questions {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  question_text   String   @default("")
  question_type   String   @default("mcq")
  content_mode    String   @default("text")
  image_url       String?
  options         Json     @default("[]")
  correct_answer  String?
  model_answer    String?
  points          Int      @default(1)
  difficulty      String   @default("medium")
  auto_difficulty String?
  usage_count     Int      @default(0)
  last_used_at    DateTime? @db.Timestamptz(6)
  answers_count   Int      @default(0)
  correct_count   Int      @default(0)
  notes           String?
  created_by      String?  @db.Uuid
  archived_at     DateTime? @db.Timestamptz(6)
  created_at      DateTime @default(now()) @db.Timestamptz(6)
  updated_at      DateTime @default(now()) @db.Timestamptz(6)

  scopes          question_bank_scopes[]
  question_topics question_bank_question_topics[]
  exam_questions  exam_questions[]

  @@index([archived_at, created_at(sort: Desc)], map: "idx_qbq_active")
  @@index([difficulty], map: "idx_qbq_difficulty")
  @@index([question_type], map: "idx_qbq_type")
  @@schema("public")
}

model question_bank_scopes {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  question_id String   @db.Uuid
  scope_type  String
  scope_id    String   @db.Uuid
  created_at  DateTime @default(now()) @db.Timestamptz(6)

  question    question_bank_questions @relation(fields: [question_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@unique([question_id, scope_type, scope_id], map: "uq_qbs_unique")
  @@index([scope_type, scope_id], map: "idx_qbs_lookup")
  @@schema("public")
}

model question_bank_topics {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  title           String   @unique(map: "uq_qbt_title")
  created_at      DateTime @default(now()) @db.Timestamptz(6)
  question_topics question_bank_question_topics[]

  @@schema("public")
}

model question_bank_question_topics {
  question_id String @db.Uuid
  topic_id    String @db.Uuid

  question    question_bank_questions @relation(fields: [question_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  topic       question_bank_topics    @relation(fields: [topic_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@id([question_id, topic_id])
  @@index([topic_id], map: "idx_qbqt_topic")
  @@schema("public")
}
```

2. عدّل موديل `exam_questions` (سطر ~845) — **إضافة سطرين فقط، متلمسش أي سطر تاني:**

```prisma
  bank_question_id String?  @db.Uuid
  bank_question    question_bank_questions? @relation(fields: [bank_question_id], references: [id], onDelete: SetNull, onUpdate: NoAction)
```
وأضف كمان:
```prisma
  @@index([bank_question_id], map: "idx_exam_questions_bank")
```

3. شغّل **بس**:
```bash
cd /vercel/share/v0-project && npx prisma generate
```
4. `npx tsc --noEmit`

**✅ معيار النجاح:** `npx prisma generate` نجح، و`prisma.question_bank_questions` متاح في الـ types.

---

## Milestone 3 — طبقة الأنواع والمساعدات (لا DB)

**أنشئ:** `/vercel/share/v0-project/lib/question-bank.ts`

الملف ده **shared (client + server)** — **ممنوع** أي `import 'server-only'` أو `@/lib/prisma` جوّاه.

```ts
import type { Question, QuestionType } from '@/lib/exam-builder'
```

المحتوى المطلوب بالحرف (المنطق، مش شكل الكود):

1. الأنواع:
```ts
export type Difficulty = 'easy' | 'medium' | 'hard'
export type ScopeType = 'stage' | 'branch' | 'monthly_course' | 'lecture'

export type BankScope = { scopeType: ScopeType; scopeId: string; label?: string }

export type BankQuestion = {
  id: string
  type: QuestionType
  contentMode: 'text' | 'image'
  text: string
  imageUrl: string
  options: string[]          // مصفوفة نصوص — نفس شكل exam_questions.options
  correctAnswer: string | null
  modelAnswer: string
  points: number
  difficulty: Difficulty
  autoDifficulty: Difficulty | null
  usageCount: number
  lastUsedAt: string | null
  answersCount: number
  correctCount: number
  successRate: number | null // correctCount / answersCount، null لو answersCount = 0
  notes: string
  topics: { id: string; title: string }[]
  scopes: BankScope[]
  createdAt: string
}
```

2. ثوابت العرض:
```ts
export const DIFFICULTY_META: Record<Difficulty, { label: string; badgeCls: string }> = {
  easy:   { label: 'سهل',   badgeCls: 'bg-primary/10 text-primary' },
  medium: { label: 'متوسط', badgeCls: 'bg-secondary text-foreground' },
  hard:   { label: 'صعب',   badgeCls: 'bg-destructive/10 text-destructive' },
}
export const SCOPE_TYPE_LABEL: Record<ScopeType, string> = {
  stage: 'سنة', branch: 'فرع', monthly_course: 'كورس', lecture: 'محاضرة',
}
export const DIFFICULTY_VALUES: Difficulty[] = ['easy', 'medium', 'hard']
```

3. تطبيع + تحقق (لازم يتنادوا في الأكشنز كذلك):
```ts
export function normalizeDifficulty(v: unknown): Difficulty   // أي حاجة غير easy/hard → 'medium'
export function normalizeScopeType(v: unknown): ScopeType | null
export function isValidQuestionType(v: unknown): v is QuestionType
```

4. `computeAutoDifficulty(answersCount, correctCount): Difficulty | null`
   - لو `answersCount < 10` → `null` (بيانات مش كفاية).
   - `rate = correctCount / answersCount`
   - `rate >= 0.75` → `'easy'` ، `rate >= 0.45` → `'medium'` ، غير كده → `'hard'`.

5. **المحوّل الأهم** — من سؤال بنك لسؤال builder:
```ts
export function bankQuestionToBuilderQuestion(bq: BankQuestion): Question
```
التنفيذ الإلزامي:
- ابدأ من `createQuestion(bq.type)` من `@/lib/exam-builder` (عشان تضمن كل الحقول الافتراضية موجودة).
- `contentMode = bq.contentMode`، `text = bq.text`، `imageUrl = bq.imageUrl`، `points = bq.points || 1`، `modelAnswer = bq.modelAnswer`.
- لو `type === 'mcq'`: `options = bq.options.map(t => createOption(t))` (بـ `createOption` من `exam-builder` عشان الـ ids تكون فريدة)، و`correctOptionId = ` id الخيار اللي نصّه `=== bq.correctAnswer` (بمقارنة بعد `trim()`)، ولو ملقيتوش → `options[0]?.id ?? null`.
- **مهم:** ما تعيدش استخدام `bq.id` كـ `Question.id`. الـ builder محتاج id فريد لكل صف. خزّن الأصل في حقل جديد.
- عشان نعرف نتتبّع المصدر، **وسّع** `Question` في `lib/exam-builder.ts` بحقل اختياري واحد فقط:
  ```ts
  /** id السؤال في بنك الأسئلة لو السؤال مسحوب من البنك */
  bankQuestionId?: string | null
  ```
  وفي `createQuestion` ضيف `bankQuestionId: null` للـ base. **ده التعديل الوحيد المسموح في `lib/exam-builder.ts`.**

6. `bulkQuestionsFromText(raw: string)` — انقله لـ Milestone 6 (متعملوش هنا).

**✅ معيار النجاح:** `npx tsc --noEmit` نجح، والملف مفيهوش أي import من prisma.

---

## Milestone 4 — أكشنز السيرفر

**أنشئ:** `/vercel/share/v0-project/app/admin/question-bank/actions.ts`

أول الملف:
```ts
'use server'

import { prisma } from '@/lib/prisma'
import { hasResourceAccess } from '@/lib/auth-guard'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/audit-log'
import { auth } from '@/auth'
import {
  computeAutoDifficulty, normalizeDifficulty, normalizeScopeType,
  type BankQuestion, type Difficulty, type ScopeType,
} from '@/lib/question-bank'
```

### 4.1 خرائط الشجرة (للفلاتر والربط)
```ts
export type TreeStage = {
  id: string; title: string
  branches: { id: string; title: string
    monthlyCourses: { id: string; title: string
      lectures: { id: string; title: string }[] }[]
    looseLectures: { id: string; title: string }[]   // محاضرات الفرع اللي مالهاش monthly_course_id
  }[]
}
export async function getContentTree(): Promise<TreeStage[]>
```
- guard: `if (!(await hasResourceAccess('question-bank'))) return []`
- اجلب بـ 4 استعلامات مسطّحة (**مش** nested include عميق): `stages` (order `sort_order`, `title`)، `branches`، `monthly_courses`، `lectures` (select `id, title, branch_id, monthly_course_id`, order `course_sort_order`, `sort_order`).
- ابنِ الشجرة في الميموري بـ `Map`. المحاضرة اللي `monthly_course_id === null` تروح `looseLectures` بتاعة فرعها.
- **حصّن:** `monthly_courses` لازم يكون عندها عمود ربط بالفرع؛ لو الشكل مختلف، اربط المحاضرات بالكورس عن طريق `lectures.monthly_course_id` بس، وحدّد فرع الكورس من أول محاضرة تابعة له. **متفترضش أعمدة مش شايفها — اقرأ `model monthly_courses` في السكيما (سطر ~1059) قبل ما تكتب الاستعلام.**

### 4.2 توسيع النطاقات أوتوماتيك
```ts
type ScopeInput = { scopeType: ScopeType; scopeId: string }
async function autoExpandScopes(inputs: ScopeInput[]): Promise<ScopeInput[]>
```
المنطق الإلزامي:
- ابدأ بـ `Set` من `` `${scopeType}:${scopeId}` `` من المدخلات.
- لكل `lecture`: اجلب `lectures.findUnique({ where: { id }, select: { branch_id, monthly_course_id, branches: { select: { stage_id: true } } } })` → ضيف `monthly_course` (لو موجود) + `branch` + `stage`.
- لكل `monthly_course` مدخّل أصلًا: اجلب فرعه (من أول محاضرة تابعة له لو مفيش عمود مباشر) → ضيف `branch` + `stage`.
- لكل `branch`: اجلب `stage_id` → ضيف `stage`.
- ارجع مصفوفة مفلترة من التكرار. **الدالة دي private (مش exported).**

### 4.3 CRUD
```ts
export type SaveBankQuestionInput = {
  id?: string | null
  type: 'mcq' | 'essay' | 'file'
  contentMode: 'text' | 'image'
  text: string
  imageUrl: string
  options: string[]
  correctAnswer: string | null
  modelAnswer: string
  points: number
  difficulty: Difficulty
  notes: string
  topics: string[]          // عناوين نصية — get-or-create
  scopes: ScopeInput[]
}

export async function saveBankQuestion(input: SaveBankQuestionInput)
```
1. guard `manage` → `{ error: 'غير مسموح. لازم تكون أدمن.' }`
2. تحقق (وارجع `{ error }` عربي واضح لكل حالة):
   - `contentMode === 'text'` → `text.trim()` مش فاضي، وإلا `'اكتب نص السؤال'`.
   - `contentMode === 'image'` → `imageUrl.trim()` مش فاضي، وإلا `'ارفع صورة السؤال'`.
   - `type === 'mcq'` → `options` بعد التنقية (trim + إزالة الفاضي) عددها `>= 2`، وإلا `'لازم خيارين على الأقل'`؛ و`correctAnswer` لازم يكون واحد من `options`، وإلا `'حدّد الإجابة الصحيحة'`.
   - `points` بين 1 و100، وإلا `'الدرجة لازم بين 1 و100'`.
3. في `prisma.$transaction`:
   - upsert السؤال: لو `input.id` موجود → `update` (**وحدّث `updated_at: new Date()`**)، وإلا `create` مع `created_by: session.user.id`.
     - للـ non-mcq: `options: []` و`correct_answer: null`.
     - للـ non-essay: `model_answer: null`.
     - للـ `contentMode === 'text'`: `image_url: null`.
   - المواضيع: لكل عنوان بعد `trim()` (اتجاهل الفاضي، والتكرار حساس-غير-حساس بـ lowercase) اعمل `prisma.question_bank_topics.upsert({ where: { title }, create: { title }, update: {} })`، وبعدين `deleteMany` لروابط السؤال ثم `createMany` بالروابط الجديدة (`skipDuplicates: true`).
   - النطاقات: `const expanded = await autoExpandScopes(input.scopes)` → `deleteMany({ where: { question_id } })` ثم `createMany` (`skipDuplicates: true`).
4. `logActivity({ action: input.id ? 'update' : 'create', resource: 'question-bank', targetId: q.id, targetLabel: 'سؤال في بنك الأسئلة' }).catch(() => {})`
5. `revalidatePath('/admin/question-bank')` → `return { success: true, id: q.id }`
6. غلّف كله في try/catch وارجع `{ error: 'تعذّر حفظ السؤال. حاول تاني.' }`.

```ts
export async function archiveBankQuestions(ids: string[])    // set archived_at = now()
export async function restoreBankQuestions(ids: string[])    // set archived_at = null
export async function deleteBankQuestions(ids: string[])
```
- الثلاثة: guard `manage` + `ids` مش فاضية.
- `deleteBankQuestions` **بيحذف نهائي فقط الأسئلة اللي مش مستخدمة**: أول حاجة اعمل
  `const used = await prisma.exam_questions.findMany({ where: { bank_question_id: { in: ids } }, select: { bank_question_id: true } })`
  → الأسئلة المستخدمة **تتأرشف** بدل الحذف، وارجع
  `{ success: true, deleted: n, archived: m, message: 'اتحذف n سؤال. m سؤال مستخدم في اختبارات فاتّأرشف بدل الحذف.' }`

### 4.4 القائمة والفلترة
```ts
export type BankListFilters = {
  search?: string
  difficulty?: Difficulty | 'all'
  type?: 'mcq' | 'essay' | 'file' | 'all'
  scopeType?: ScopeType | 'all'
  scopeId?: string | null
  topicId?: string | null
  archived?: boolean          // false = النشط (default)
  page?: number               // 1-based
  perPage?: number            // default 20، max 100
}
export async function getBankQuestions(filters: BankListFilters): Promise<{
  items: BankQuestion[]; total: number; page: number; perPage: number
}>
```
- guard قراءة → لو مرفوض ارجع `{ items: [], total: 0, page: 1, perPage: 20 }`.
- `where` بيتبني كالتالي:
  - `archived_at: filters.archived ? { not: null } : null`
  - search: `question_text: { contains: search.trim(), mode: 'insensitive' }` (بس لو الطول `>= 2`)
  - difficulty/type: بس لو مش `'all'`
  - scope: لو `scopeId` موجود → `scopes: { some: { scope_type: scopeType, scope_id: scopeId } }`
  - topic: `question_topics: { some: { topic_id: topicId } }`
- `include: { scopes: true, question_topics: { include: { topic: true } } }`
- `orderBy: [{ created_at: 'desc' }]`، `skip: (page-1)*perPage`, `take: perPage`
- `total` من `prisma.question_bank_questions.count({ where })` في نفس `Promise.all`.
- **تسميات النطاقات:** بعد جلب الصفحة، جمّع `scope_id`s حسب النوع واعمل 4 استعلامات `findMany({ where: { id: { in } }, select: { id, title } })` وابنِ `Map` للليبلات، وحطّها في `BankScope.label`. لو الليبل مش موجود (نطاق يتيم) استخدم `'(محذوف)'`.
- حوّل الصفوف لـ `BankQuestion` بمحوّل private `toBankQuestion(row, labels)`:
  - `options` من `Json` → `Array.isArray(row.options) ? row.options.map(String) : []`
  - `successRate = row.answers_count > 0 ? row.correct_count / row.answers_count : null`
  - التواريخ → `.toISOString()`

```ts
export async function getBankTopics(): Promise<{ id: string; title: string; count: number }[]>
export async function getBankStats(): Promise<{
  total: number; byDifficulty: Record<Difficulty, number>;
  byType: Record<'mcq'|'essay'|'file', number>;
  archived: number; unscoped: number; unused: number
}>
```
- `unscoped` = أسئلة نشطة `scopes: { none: {} }`. `unused` = `usage_count: 0`.
- استخدم `groupBy` مرة واحدة لكل تجميعة، كله جوّه `Promise.all`.

### 4.5 التوليد والاستبدال والاستيراد
```ts
export type GenerateInput = {
  scope?: { scopeType: ScopeType; scopeId: string } | null
  counts: { easy: number; medium: number; hard: number }
  types?: ('mcq' | 'essay' | 'file')[]
  topicIds?: string[]
  excludeIds?: string[]
}
export async function generateExamQuestions(input: GenerateInput): Promise<{
  questions: BankQuestion[]; shortage: Partial<Record<Difficulty, number>>; error?: string
}>
```
- guard قراءة.
- المجموع المطلوب `> 0` و`<= 100`، وإلا `{ questions: [], shortage: {}, error: 'حدّد عدد أسئلة بين 1 و100' }`.
- **لكل مستوى صعوبة على حدة** نفّذ استعلام raw عشان العشوائية:
  ```ts
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT q.id FROM public.question_bank_questions q
    WHERE q.archived_at IS NULL
      AND q.difficulty = ${difficulty}
      ${/* شروط إضافية تتبني بـ Prisma.sql fragments */''}
    ORDER BY random() LIMIT ${n}
  `
  ```
  **إلزامي:** ابنِ الشروط الاختيارية بـ `Prisma.sql` / `Prisma.join` من `import { Prisma } from '@prisma/client'` — **ممنوع** أي string concatenation في SQL (SQL injection).
  الشروط: `type IN (...)` لو `types` محدد، `NOT (q.id = ANY(...))` للـ `excludeIds`، و`EXISTS (SELECT 1 FROM question_bank_scopes s WHERE s.question_id = q.id AND s.scope_type = ... AND s.scope_id = ...)` للنطاق، و`EXISTS` مشابه للمواضيع.
- بعدها اجلب الأسئلة كاملة بـ `getBankQuestions`-style include بـ `where: { id: { in: allIds } }` وحوّلها لـ `BankQuestion` بنفس المحوّل، ورتّبها بترتيب المستويات (`easy` ثم `medium` ثم `hard`).
- `shortage[difficulty] = requested - returned` لو أقل.

```ts
export async function pickReplacementQuestion(input: {
  difficulty: Difficulty
  type?: 'mcq' | 'essay' | 'file' | null
  scope?: { scopeType: ScopeType; scopeId: string } | null
  excludeIds: string[]
}): Promise<{ question: BankQuestion | null; error?: string }>
```
- نفس منطق `generateExamQuestions` بس `LIMIT 1`. لو مفيش نتيجة: `{ question: null, error: 'مفيش سؤال بديل بنفس المواصفات في البنك' }`.

```ts
export async function importQuestionsFromExam(examId: string, scopes: ScopeInput[])
```
- guard `manage`. اجلب `exam_questions` بتاعة الاختبار (`where: { exam_id: examId }`).
- **اتجاهل** اللي `bank_question_id` بتاعها مش null (متكرّرش الاستيراد).
- لكل سؤال أنشئ صف بنك (`difficulty: 'medium'`, `notes: 'مستورد من اختبار ' + exam.code`) + النطاقات بعد `autoExpandScopes`، وبعدها `prisma.exam_questions.update({ where: { id }, data: { bank_question_id: created.id } })`.
- ارجع `{ success: true, imported: n, skipped: m }`.

```ts
export async function bulkUpdateBankQuestions(input: {
  ids: string[]
  difficulty?: Difficulty | null
  addTopics?: string[]
  addScopes?: ScopeInput[]
  removeScopes?: ScopeInput[]
}): Promise<{ success?: true; updated?: number; error?: string }>
```
- guard `manage`. `ids.length` بين 1 و500.
- الصعوبة بـ `updateMany`. المواضيع/النطاقات بـ get-or-create + `createMany({ skipDuplicates: true })` لكل الأسئلة (مع `autoExpandScopes` على `addScopes`).
- ده اللي بيخلّي "أنا مش هقعد أدد كل سؤال بتاع إيه" ممكن: تحديد 50 سؤال مرة واحدة وربطهم بمحاضرة/كورس/سنة بضغطة.

```ts
export async function refreshBankQuestionStats(): Promise<{ success: true; updated: number }>
```
- guard `manage`.
- استعلام raw واحد بيحدّث الكل:
  ```sql
  UPDATE public.question_bank_questions q SET
    answers_count = COALESCE(a.total, 0),
    correct_count = COALESCE(a.correct, 0),
    usage_count   = COALESCE(u.uses, 0),
    last_used_at  = u.last_used
  FROM (SELECT 1) dummy
  LEFT JOIN LATERAL (...) ...
  ```
  **مطلوب صياغة آمنة:** استخدم CTEs:
  ```sql
  WITH uses AS (
    SELECT bank_question_id AS qid, count(*) AS uses, max(created_at) AS last_used
    FROM public.exam_questions WHERE bank_question_id IS NOT NULL GROUP BY 1
  ),
  ans AS (
    SELECT eq.bank_question_id AS qid,
           count(*) AS total,
           count(*) FILTER (WHERE ea.is_correct IS TRUE) AS correct
    FROM public.exam_answers ea
    JOIN public.exam_questions eq ON eq.id = ea.question_id
    WHERE eq.bank_question_id IS NOT NULL
    GROUP BY 1
  )
  UPDATE public.question_bank_questions q
  SET usage_count   = COALESCE(uses.uses, 0),
      last_used_at  = uses.last_used,
      answers_count = COALESCE(ans.total, 0),
      correct_count = COALESCE(ans.correct, 0)
  FROM (SELECT q2.id FROM public.question_bank_questions q2) ids
  LEFT JOIN uses ON uses.qid = ids.id
  LEFT JOIN ans  ON ans.qid  = ids.id
  WHERE q.id = ids.id;
  ```
- بعد التحديث اقرأ `id, answers_count, correct_count` للكل واحسب `computeAutoDifficulty` واعمل `updateMany` لكل مستوى (3 استعلامات) على مجموعات الـ ids.
- `revalidatePath('/admin/question-bank')`.

**✅ معيار النجاح:** `npx tsc --noEmit` نجح. كل أكشن كتابة عنده guard `manage` كأول سطر. مفيش أي string concat في SQL.

---

## Milestone 5 — صفحة بنك الأسئلة

### 5.1 الصلاحيات والـ sidebar
**عدّل:** `/vercel/share/v0-project/lib/permissions.ts`
- في `ResourceKey` ضيف `| 'question-bank'` بعد `'exams'`.
- في `RESOURCES` ضيف بعد عنصر exams:
  `{ key: 'question-bank', label: 'بنك الأسئلة', href: '/admin/question-bank' }`
- **متلمسش** `mapPathToResource` — هي هتشتغل لوحدها لأن المفتاح = الـ segment.

**عدّل:** `/vercel/share/v0-project/components/dashboard/sidebar.tsx`
- ضيف عنصر بنفس شكل عنصر "الاختبارات" الموجود: `href: '/admin/question-bank'`, label `'بنك الأسئلة'`, `icon: Library` (استورد `Library` من `lucide-react` وضيفه لقائمة الاستيراد الموجودة).
- **اقرأ الملف الأول** وقلّد الشكل الموجود بالحرف (نفس الـ shape للعنصر ونفس مفتاح الصلاحية).

**عدّل:** `/vercel/share/v0-project/app/admin/settings/actions.ts` + `components/settings/settings-panel.tsx`
- تبويب "المساعدون" بيعرض قائمة الموارد من `RESOURCES`؟ **افحص الأول.** لو بيعرضها من `RESOURCES` → مفيش تعديل مطلوب، المورد الجديد هيظهر لوحده. لو فيه قائمة مكتوبة بالإيد → ضيف `'question-bank'` فيها. **مش مسموح** تعمل تعديل تاني في التبويب.

### 5.2 الصفحة
**أنشئ:** `/vercel/share/v0-project/app/admin/question-bank/page.tsx` (server component)
```tsx
export default async function QuestionBankPage() {
  const [tree, topics, stats] = await Promise.all([getContentTree(), getBankTopics(), getBankStats()])
  return (
    <div className="space-y-6">
      <QuestionBankHeader stats={stats} />
      <QuestionBankStats stats={stats} />
      <QuestionBankBrowser tree={tree} topics={topics} />
    </div>
  )
}
```
قلّد `app/admin/exams/page.tsx` بالحرف في التنظيم (server → Promise.all → Header/Stats/Table).

### 5.3 المكوّنات
**أنشئ الملفات دي تحت** `/vercel/share/v0-project/components/question-bank/`:

| الملف | النوع | المسؤولية |
|---|---|---|
| `field-styles.ts` | shared | يصدّر `export const fieldCls = '...'` (نفس القيمة من قاعدة #7) وبس |
| `question-bank-header.tsx` | client | العنوان + وصف + أزرار: "سؤال جديد"، "إدخال مجمّع"، "تحديث الإحصائيات" |
| `question-bank-stats.tsx` | server-safe (بدون state) | 4 كروت: الإجمالي، حسب الصعوبة (`donut-chart`)، غير مربوطة (`unscoped`) بتحذير، غير مستخدمة |
| `question-bank-filters.tsx` | client | فلاتر: بحث، صعوبة، نوع، موضوع، + **منتقي النطاق المتسلسل** (سنة → فرع → كورس → محاضرة) |
| `question-bank-browser.tsx` | client | الحالة الكاملة: الفلاتر + الجدول + الترقيم + التحديد المتعدد + شريط العمليات المجمّعة + المودالات |
| `question-bank-table.tsx` | client | جدول بـ `components/ui/table.tsx`: checkbox، نص السؤال (مقطوع بـ `line-clamp-2`)، النوع، الصعوبة (`badge`)، النطاقات (badges)، المواضيع، الاستخدام، نسبة النجاح، أزرار تعديل/أرشفة |
| `question-editor-modal.tsx` | client | فورم إنشاء/تعديل سؤال واحد |
| `bulk-import-modal.tsx` | client | الإدخال المجمّع (Milestone 6) |
| `bulk-actions-bar.tsx` | client | شريط يظهر لما يكون فيه محدد: تغيير صعوبة، إضافة موضوع، ربط بنطاق، أرشفة، حذف |
| `scope-picker.tsx` | client | منتقي النطاق المتسلسل — **مُعاد استخدامه** في الفلاتر والمحرّر وشريط العمليات |

قواعد إلزامية للمكوّنات:
- `question-bank-browser.tsx` هو **المالك الوحيد** للـ state. أي مكوّن تاني بياخد props + callbacks. **ممنوع** state مكرّر.
- تحميل الداتا: `useTransition` + استدعاء `getBankQuestions(filters)` مباشر (server action) وتخزين النتيجة في state. **ممنوع** `useEffect` للفetch الأولي؛ اعمل التحميل الأولي في الـ server component وابعته prop `initialData` (نادِ `getBankQuestions({ page: 1 })` في `page.tsx` وضيفه للـ `Promise.all`).
- عند تغيير أي فلتر → `setPage(1)` **دايمًا** ثم أعد التحميل.
- البحث بـ debounce 350ms بـ `setTimeout` جوّه `useEffect` على قيمة البحث بس (ده الاستثناء الوحيد المسموح لـ `useEffect`)، مع `clearTimeout` في الـ cleanup.
- التحديد المتعدد: `Set<string>` في state. **يتفضّى** عند تغيير الصفحة أو الفلاتر.
- الحذف يتأكد بـ `components/ui/confirm-dialog.tsx`.
- `scope-picker.tsx`: 4 `select`s متسلسلة. اختيار أي مستوى يفضّي المستويات الأدنى. له وضعين بـ prop `mode`:
  - `'filter'` → يرجّع `{ scopeType, scopeId } | null` (أعمق مستوى متحدد).
  - `'assign'` → يرجّع نفس الحاجة، والمحرّر هو اللي يضيفها للقائمة كـ chip قابل للحذف، والباك إند هو اللي بيوسّعها للأعلى.
- كل جدول لازم يكون فيه حالة فاضية واضحة: `'مفيش أسئلة بالمواصفات دي'` + زرار "امسح الفلاتر".

**✅ معيار النجاح:** الصفحة تفتح، الفلاتر تشتغل، الترقيم يشتغل، إنشاء/تعديل/أرشفة سؤال يشتغل، `npx tsc --noEmit` نجح، ومفيش أي `useEffect` بيعمل fetch (غير debounce البحث).

---

## Milestone 6 — الإدخال المجمّع

**أضف في** `/vercel/share/v0-project/lib/question-bank.ts`:
```ts
export type ParsedBulkQuestion = {
  text: string
  type: 'mcq' | 'essay'
  options: string[]
  correctAnswer: string | null
  points: number
  difficulty: Difficulty
  errors: string[]
}
export function parseBulkQuestions(raw: string): ParsedBulkQuestion[]
```

**الصيغة المدعومة (وثّقها في الـ UI بالنص العربي ده حرفيًا):**
```
س: ما هو ناتج 2 + 2؟ | صعوبة: سهل | درجة: 2
- 3
* 4
- 5
- 6

س: اشرح قانون نيوتن الأول.
نوع: مقالي
```
قواعد المحلّل (نفّذها بالحرف):
1. اقسم النص على سطر فاضي واحد أو أكتر: `raw.split(/\n\s*\n+/)`.
2. في كل بلوك: أول سطر يبدأ بـ `س:` أو `س.` أو `سؤال:` → نص السؤال (شيل البادئة و`trim`). لو مفيش بادئة، خُد أول سطر زي ما هو.
3. من سطر السؤال، اقرأ المفاتيح المفصولة بـ `|`: `صعوبة: سهل|متوسط|صعب` و`درجة: <رقم>`. شيلهم من نص السؤال.
4. السطور اللي تبدأ بـ `-` أو `*` = خيارات. اللي بـ `*` = الإجابة الصحيحة. أكتر من `*` → خُد الأول واضف خطأ `'أكتر من إجابة صحيحة — اتاخد الأول'`.
5. سطر `نوع: مقالي` → `type = 'essay'` والخيارات تتجاهل.
6. لو مفيش خيارات و`type` مش محدد → `type = 'essay'`.
7. `type === 'mcq'` والخيارات أقل من 2 → `errors.push('لازم خيارين على الأقل')`.
8. `type === 'mcq'` ومفيش `*` → `errors.push('مفيش إجابة صحيحة محددة')`.
9. `points` افتراضي 1، `difficulty` افتراضي `'medium'`.
10. تجاهل البلوكات الفاضية تمامًا.

**أنشئ:** `components/question-bank/bulk-import-modal.tsx`
- `textarea` كبير (`rows={14}`, `dir="rtl"`, `className={cn(fieldCls, 'resize-y leading-relaxed font-mono')}`).
- تحت الـ textarea: مثال الصيغة في `<pre className="...whitespace-pre-wrap...">` (احترس: `-` و`*` عادية، لكن أي `<` أو `>` لو موجود لفّه في string).
- معاينة حيّة: `useMemo(() => parseBulkQuestions(raw), [raw])` → عدد الصالح/عدد فيه أخطاء + قائمة أول 10 مشاكل بأرقام البلوكات.
- منتقي نطاق واحد (`scope-picker` mode `assign`) + منتقي مواضيع → **بيتطبّق على كل الأسئلة المستوردة**.
- زرار "استيراد" مقفول لو مفيش أي سؤال صالح.

**أضف في** `app/admin/question-bank/actions.ts`:
```ts
export async function bulkCreateBankQuestions(input: {
  questions: { text: string; type: 'mcq'|'essay'; options: string[]; correctAnswer: string|null; points: number; difficulty: Difficulty }[]
  scopes: ScopeInput[]
  topics: string[]
}): Promise<{ success?: true; created?: number; failed?: number; error?: string }>
```
- guard `manage`. `questions.length` بين 1 و200، وإلا خطأ عربي.
- `autoExpandScopes` مرة واحدة + get-or-create للمواضيع مرة واحدة **قبل** اللوب.
- `createMany` للأسئلة **مش** كفاية (محتاج الـ ids للروابط) → اعمل `create` في لوب جوّه `$transaction` واحدة بـ `timeout: 30000`. لو أي سؤال فشل، عدّه في `failed` وكمّل (**متبطّلش** الترانزاكشن كلها — استخدم `$transaction` لكل سؤال منفصل بدل واحدة كبيرة لو الترانزاكشن الواحدة هتفشل بالكامل).
- `logActivity` + `revalidatePath`.

**✅ معيار النجاح:** لصق المثال اللي فوق يستورد سؤالين صح: MCQ بـ 4 خيارات وإجابة `4` وصعوبة `easy` ودرجة 2، ومقالي.

---

## Milestone 7 — ربط البنك ببنّاء الاختبار

**متلمسش** أي منطق موجود. الإضافات بس:

### 7.1 المودالات الجديدة
**أنشئ:** `/vercel/share/v0-project/components/exams/builder/bank-picker-modal.tsx` (client)
- props: `{ open, onClose, onPick: (questions: Question[]) => void, excludeIds: string[], tree: TreeStage[], topics: {id,title}[] }`
- جوّه: `scope-picker` + فلاتر صعوبة/نوع/بحث + قائمة نتائج بـ checkboxes (نفس `getBankQuestions`, `perPage: 10`, ترقيم) + زرار "أضف المحدد (n)".
- عند الإضافة: `onPick(selected.map(bankQuestionToBuilderQuestion))` ثم `onClose()`.
- **استثنِ** أي سؤال `id` موجود في `excludeIds` من العرض (فلترة في الكلاينت على النتايج + تمرير `excludeIds` للأكشن).

**أنشئ:** `/vercel/share/v0-project/components/exams/builder/auto-generate-modal.tsx` (client)
- props: `{ open, onClose, onGenerate: (questions: Question[]) => void, excludeIds, tree, topics }`
- حقول: `scope-picker`، 3 حقول رقمية (سهل/متوسط/صعب)، checkboxes للأنواع (mcq/essay/file — الثلاثة مفعّلين افتراضيًا)، منتقي مواضيع (اختياري).
- ملخص حيّ: "هيتم توليد N سؤال".
- عند الضغط: نادِ `generateExamQuestions(...)`.
  - لو `error` → `toast.error(error)`.
  - لو `shortage` فيه أي قيمة > 0 → `toast.warning('البنك مفيهوش عدد كفاية: ناقص X سهل، Y متوسط، Z صعب. اتضاف اللي متاح.')` (اكتب بس المستويات اللي فيها نقص).
  - `onGenerate(questions.map(bankQuestionToBuilderQuestion))` ثم `onClose()`.

### 7.2 تعديل `exam-builder.tsx`
**التعديلات المسموحة بالحرف — مفيش غيرها:**
1. props: `export function ExamBuilder({ stages = [], tree = [], topics = [] }: { stages?: StageWithBranches[]; tree?: TreeStage[]; topics?: { id: string; title: string }[] })`
2. state جديد: `const [bankOpen, setBankOpen] = useState(false)` و`const [genOpen, setGenOpen] = useState(false)` و`const [replacing, setReplacing] = useState<string | null>(null)`.
3. `const bankIds = useMemo(() => questions.map(q => q.bankQuestionId).filter(Boolean) as string[], [questions])`
4. في شريط رأس قسم "الأسئلة" (جنب زرار "إضافة سؤال") ضيف زرارين `variant="outline"`:
   - `<Button variant="outline" onClick={() => setBankOpen(true)}><Library className="size-4" />من بنك الأسئلة</Button>`
   - `<Button variant="outline" onClick={() => setGenOpen(true)}><Wand2 className="size-4" />توليد تلقائي</Button>`
   لفّ الأزرار الثلاثة في `<div className="flex flex-wrap items-center gap-2">`.
5. handlers:
   ```ts
   const addFromBank = (picked: Question[]) => setQuestions(qs => [...qs, ...picked])
   ```
6. **الاستبدال:** مرّر prop جديد اختياري لـ `QuestionCard`:
   `onReplace?: () => void` — يظهر كزرار "استبدال من البنك" **بس** لو `question.bankQuestionId` موجود. عند الضغط:
   ```ts
   const handleReplace = async (q: Question) => {
     setReplacing(q.id)
     try {
       const res = await pickReplacementQuestion({
         difficulty: 'medium', // ⚠️ لازم تبعت صعوبة السؤال الأصلي — شوف الملاحظة تحت
         type: q.type,
         scope: null,
         excludeIds: bankIds,
       })
       if (!res.question) { toast.error(res.error || 'مفيش بديل متاح'); return }
       const next = bankQuestionToBuilderQuestion(res.question)
       setQuestions(qs => qs.map(item => item.id === q.id ? { ...next, id: item.id } : item))
       toast.success('تم استبدال السؤال')
     } finally { setReplacing(null) }
   }
   ```
   **⚠️ ملاحظة إلزامية:** عشان الاستبدال يجيب سؤال بنفس الصعوبة، لازم الـ builder يعرف صعوبة السؤال المسحوب. ضيف حقل اختياري تاني في `Question` في `lib/exam-builder.ts`:
   ```ts
   /** صعوبة السؤال في البنك (لو مسحوب من البنك) — للاستبدال بنفس المستوى */
   bankDifficulty?: 'easy' | 'medium' | 'hard' | null
   ```
   وحدّث `bankQuestionToBuilderQuestion` تحطّها، و`createQuestion` تحطّها `null`. **الحقلين دول (`bankQuestionId`, `bankDifficulty`) هما التعديل الكامل والوحيد المسموح في `lib/exam-builder.ts`.**
   وفي `handleReplace` ابعت `difficulty: q.bankDifficulty ?? 'medium'` و`scope` من نفس النطاق اللي اتولّد بيه (خزّنه في state `lastScope` عند التوليد/السحب).
7. في `handleSave` ضيف `bankQuestionId: q.bankQuestionId ?? null` في map الأسئلة.
8. المودالات الجديدة تتحط جنب `<Modal>` الموجود في آخر الـ JSX.

### 7.3 توسيع `saveExam`
**عدّل:** `/vercel/share/v0-project/app/admin/exams/actions.ts`
1. في `SaveExamPayload.questions[]` ضيف `bankQuestionId?: string | null`.
2. في بناء `rows` ضيف `bank_question_id: q.bankQuestionId || null`.
3. **بعد** `createMany` للأسئلة، ضيف تحديث الاستخدام (fire-and-forget، لازم متكسرش الحفظ):
   ```ts
   const usedBankIds = questions.map(q => q.bankQuestionId).filter(Boolean) as string[]
   if (usedBankIds.length > 0) {
     prisma.question_bank_questions.updateMany({
       where: { id: { in: usedBankIds } },
       data: { usage_count: { increment: 1 }, last_used_at: new Date() },
     }).catch(() => {})
   }
   ```
4. **متغيّرش** أي سطر تاني في الدالة.

### 7.4 تمرير الداتا للصفحة
**عدّل:** `/vercel/share/v0-project/app/admin/exams/create/page.tsx`
- ضيف `getContentTree()` و`getBankTopics()` للـ `Promise.all` الموجود (لو مفيش `Promise.all` اعمله) ومرّرهم لـ `<ExamBuilder tree={tree} topics={topics} ... />`.
- **الاستيراد من** `@/app/admin/question-bank/actions`.

**✅ معيار النجاح:** تقدر تفتح `/admin/exams/create` → "توليد تلقائي" → تحدد نطاق و3 أعداد → تتضاف أسئلة → تستبدل واحد منهم → تنشر → الاختبار يظهر في `/admin/exams` بعدد أسئلة صح، و`usage_count` في البنك زاد.

---

## Milestone 8 — الأرشفة العكسية + الصيانة + التحقق النهائي

1. **زرار "أرشفة أسئلة الاختبار في البنك"** في `app/admin/exams/[id]/page.tsx`:
   - مكوّن جديد `components/exams/archive-to-bank-button.tsx` (client) بـ `confirm-dialog` → ينادي `importQuestionsFromExam(examId, scopes)` مع `scope-picker` اختياري.
   - رسالة النجاح: `'اتضاف N سؤال للبنك (M متكرر واتّجاهل).'`
   - **متلمسش** أي حاجة تانية في الصفحة.
2. **زرار "تحديث الإحصائيات"** في `question-bank-header.tsx` → `refreshBankQuestionStats()` + toast.
3. **صيانة النطاقات اليتيمة:** في `question-bank-header.tsx` ضيف زرار تحت قائمة (أو جنب التحديث) `'تنظيف الروابط المعطوبة'` ينادي أكشن جديد:
   ```ts
   export async function cleanupOrphanScopes() // guard manage → prisma.$executeRaw`SELECT public.qb_cleanup_orphan_scopes()`
   ```
4. **تبويب المؤرشف** في `question-bank-browser.tsx` بـ `components/ui/tabs.tsx`: "النشطة" / "المؤرشفة" → `filters.archived`. في المؤرشفة تظهر أزرار "استرجاع" و"حذف نهائي".

### قائمة تحقق نهائية (اعملها كلها وقول النتيجة)
- [ ] `npx tsc --noEmit` نجح بدون أي خطأ.
- [ ] `npx prisma generate` نجح.
- [ ] مفيش أي `prisma migrate` / `db push` اتشغّل.
- [ ] `/admin/question-bank` تفتح وتعرض إحصائيات وجدول.
- [ ] إنشاء سؤال MCQ بـ 4 خيارات + ربطه بمحاضرة → **يظهر في الجدول بـ 4 badges نطاق** (محاضرة + كورس + فرع + سنة) — ده دليل إن `autoExpandScopes` شغّال.
- [ ] الإدخال المجمّع بالمثال الموثّق يستورد صح.
- [ ] تحديد 3 أسئلة → عملية مجمّعة "ربط بسنة" → الثلاثة اتربطوا.
- [ ] `/admin/exams/create` → "من بنك الأسئلة" يضيف أسئلة بخياراتها وإجابتها الصحيحة سليمة.
- [ ] "توليد تلقائي" بأعداد أكبر من المتاح يطلّع تحذير النقص ويضيف المتاح.
- [ ] "استبدال من البنك" يجيب سؤال مختلف ومش موجود في الاختبار.
- [ ] نشر اختبار من أسئلة بنك → الاختبار يفتح عند الطالب عادي، والتصحيح التلقائي بيشتغل (لأن `options`/`correct_answer` بنفس الشكل القديم).
- [ ] اختبار قديم (متعمول قبل البنك) لسه بيفتح ويتصحّح عادي.
- [ ] "تحديث الإحصائيات" يحدّث `usage_count` و`auto_difficulty`.
- [ ] أرشفة سؤال مستخدم في اختبار → الاختبار ما اتأثّرش.
- [ ] مساعد بصلاحية `view` على `question-bank` يشوف الصفحة ومش قادر يحفظ.
- [ ] مساعد بدون صلاحية → الـ middleware يمنعه والعنصر مش ظاهر في الـ sidebar.

---

## ملاحظات للمنفّذ (اقرأها قبل ما تبدأ)

1. **الفرق بين نسخة الاختبار وسؤال البنك هو أهم فكرة في الخطة.** `exam_questions` = نسخة مجمّدة. `question_bank_questions` = المصدر الحيّ. تعديل المصدر **مش** بيغيّر الاختبارات. لو حسّيت إنك بتعمل reference بدل snapshot — إنت غلط، ارجع للجدول في القسم 2.
2. **`options` لازم تفضل مصفوفة نصوص** في الاتنين. أي محاولة تخزّن `{id,text}` هتكسر التصحيح الحالي.
3. **`autoExpandScopes` هي الميزة اللي المستخدم طلبها بالنص** ("مش هقعد أدد كل سؤال بتاع إيه"). لو نفّذت الربط بمستوى واحد بس، الخطة فشلت.
4. لو أي عمود أو علاقة في السكيما مختلفة عن اللي مكتوب هنا (خصوصًا `monthly_courses`)، **اقرأ السكيما وعدّل الاستعلام**، وسيب باقي التصميم زي ما هو، واكتب في الشات إيه اللي اختلف.
5. لو أي Milestone احتاج تغيير DB إضافي: **متشغّلوش**. اكتب ملف SQL جديد `Q02_...sql` واطلب من المستخدم يشغّله.
