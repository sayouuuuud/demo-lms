-- Create student_devices table
create table if not exists public.student_devices (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  browser text not null default 'Chrome',
  os text not null default 'Windows 11',
  device_type text not null default 'كمبيوتر مكتبي',
  ip text not null default '192.168.1.1',
  city text not null default 'القاهرة',
  country text not null default 'مصر',
  last_active timestamptz not null default now(),
  sessions integer not null default 1,
  created_at timestamptz not null default now(),
  unique (student_id)
);

-- RLS for student_devices
alter table public.student_devices enable row level security;
create policy "devices_admin_all" on public.student_devices for all using (public.is_admin()) with check (public.is_admin());
create policy "devices_student_own" on public.student_devices for select using (
  student_id in (select id from public.students where user_id = auth.uid())
);

-- Create exam_submissions table
create table if not exists public.exam_submissions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  score integer not null,
  total integer not null,
  status text not null check (status in ('ناجح', 'راسب')),
  submitted_at timestamptz not null default now(),
  unique (exam_id, student_id)
);

-- RLS for exam_submissions
alter table public.exam_submissions enable row level security;
create policy "exam_submissions_admin_all" on public.exam_submissions for all using (public.is_admin()) with check (public.is_admin());
create policy "exam_submissions_student_own" on public.exam_submissions for select using (
  student_id in (select id from public.students where user_id = auth.uid())
);

-- Seed some dummy data for existing students so the profile page looks good
insert into public.student_devices (student_id, browser, os, device_type, ip, city, country, sessions)
select id, 'Chrome 126', 'Windows 11', 'كمبيوتر مكتبي', '156.200.1.45', 'القاهرة', 'مصر', 45
from public.students
on conflict (student_id) do nothing;

-- Ensure there's an exam to submit to
insert into public.exams (code, title, course, duration, questions, participants, avg_score, status)
values ('EXM-001', 'امتحان أساسيات البرمجة', 'مقدمة في البرمجة', 60, 20, 150, 85.5, 'منشور')
on conflict (code) do nothing;

insert into public.exams (code, title, course, duration, questions, participants, avg_score, status)
values ('EXM-002', 'اختبار قواعد البيانات', 'قواعد البيانات العلائقية', 45, 15, 120, 75.0, 'منشور')
on conflict (code) do nothing;

-- Seed exam submissions
insert into public.exam_submissions (exam_id, student_id, score, total, status)
select e.id, s.id, 18, 20, 'ناجح'
from public.students s
join public.exams e on e.code = 'EXM-001'
on conflict do nothing;

insert into public.exam_submissions (exam_id, student_id, score, total, status)
select e.id, s.id, 9, 15, 'راسب'
from public.students s
join public.exams e on e.code = 'EXM-002'
where s.code = 'STD-1043'
on conflict do nothing;
