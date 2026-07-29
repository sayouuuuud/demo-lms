-- Phase 6 + 8: course content, enrollments, progress, assignments & submissions.
-- These tables back the student portal (courses / exams / assignments / grades)
-- and some admin reports. Idempotent: safe to re-run.

-- courses.image_url: the new student code reads course.image_url; older schema
-- only had `image`. Add a generated-friendly column kept in sync from `image`.
alter table public.courses add column if not exists image_url text;
update public.courses set image_url = coalesce(image_url, image) where image_url is null;

-- ---- Course content ---------------------------------------------------------
create table if not exists public.course_sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.course_sections(id) on delete cascade,
  title text not null,
  type text not null default 'فيديو' check (type in ('فيديو','مقال','تمرين')),
  duration text not null default '',
  video_url text,
  description text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---- Enrollments & progress -------------------------------------------------
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique (student_id, course_id)
);

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  lesson_id uuid not null references public.course_lessons(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  unique (enrollment_id, lesson_id)
);

-- ---- Assignments / quizzes / submissions ------------------------------------
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  course_id uuid references public.courses(id) on delete cascade,
  section_id uuid references public.course_sections(id) on delete set null,
  type text not null check (type in ('تسليم','اختبار')),
  title text not null,
  description text not null default '',
  instructions text[] default '{}',
  due_date text,
  points integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.assignment_questions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  question text not null,
  options text[] not null default '{}',
  correct_index integer not null default 0,
  position integer not null default 0
);

create table if not exists public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status text not null default 'لم يبدأ' check (status in ('لم يبدأ','قيد التنفيذ','تم التسليم','مصحّح')),
  score integer,
  attachment_url text,
  submitted_at timestamptz,
  unique (assignment_id, student_id)
);

-- ---- RLS --------------------------------------------------------------------
alter table public.course_sections enable row level security;
alter table public.course_lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_questions enable row level security;
alter table public.assignment_submissions enable row level security;

-- Content readable by any authenticated user; admin manages.
drop policy if exists "sections_select_auth" on public.course_sections;
create policy "sections_select_auth" on public.course_sections for select using (auth.role()='authenticated');
drop policy if exists "sections_admin_all" on public.course_sections;
create policy "sections_admin_all" on public.course_sections for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "lessons_select_auth" on public.course_lessons;
create policy "lessons_select_auth" on public.course_lessons for select using (auth.role()='authenticated');
drop policy if exists "lessons_admin_all" on public.course_lessons;
create policy "lessons_admin_all" on public.course_lessons for all using (public.is_admin()) with check (public.is_admin());

-- Enrollments: student sees/creates own; admin manages all.
drop policy if exists "enroll_admin_all" on public.enrollments;
create policy "enroll_admin_all" on public.enrollments for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "enroll_select_own" on public.enrollments;
create policy "enroll_select_own" on public.enrollments for select using (
  student_id in (select id from public.students where user_id = auth.uid()));
drop policy if exists "enroll_insert_own" on public.enrollments;
create policy "enroll_insert_own" on public.enrollments for insert with check (
  student_id in (select id from public.students where user_id = auth.uid()));

-- Lesson progress: owned by the enrolling student; admin manages all.
drop policy if exists "progress_admin_all" on public.lesson_progress;
create policy "progress_admin_all" on public.lesson_progress for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "progress_own" on public.lesson_progress;
create policy "progress_own" on public.lesson_progress for all using (
  enrollment_id in (select e.id from public.enrollments e
    join public.students s on s.id = e.student_id where s.user_id = auth.uid()))
  with check (
  enrollment_id in (select e.id from public.enrollments e
    join public.students s on s.id = e.student_id where s.user_id = auth.uid()));

-- Assignments + questions readable by authenticated; admin manages.
drop policy if exists "asg_select_auth" on public.assignments;
create policy "asg_select_auth" on public.assignments for select using (auth.role()='authenticated');
drop policy if exists "asg_admin_all" on public.assignments;
create policy "asg_admin_all" on public.assignments for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "asgq_select_auth" on public.assignment_questions;
create policy "asgq_select_auth" on public.assignment_questions for select using (auth.role()='authenticated');
drop policy if exists "asgq_admin_all" on public.assignment_questions;
create policy "asgq_admin_all" on public.assignment_questions for all using (public.is_admin()) with check (public.is_admin());

-- Submissions: owned by student; admin manages all.
drop policy if exists "sub_admin_all" on public.assignment_submissions;
create policy "sub_admin_all" on public.assignment_submissions for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "sub_own" on public.assignment_submissions;
create policy "sub_own" on public.assignment_submissions for all using (
  student_id in (select id from public.students where user_id = auth.uid()))
  with check (
  student_id in (select id from public.students where user_id = auth.uid()));
