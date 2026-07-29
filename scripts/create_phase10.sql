create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  title text not null,
  issuer text not null default 'منصة تعليمية',
  issued_at date not null default current_date,
  created_at timestamptz not null default now()
);
alter table public.certificates enable row level security;
create policy "cert_own" on public.certificates for select using (
  student_id in (select id from public.students where user_id=auth.uid())
);
create policy "cert_admin_all" on public.certificates for all using (public.is_admin()) with check (public.is_admin());

alter table public.notifications add column if not exists student_id uuid references public.students(id) on delete cascade;

create policy "notifications_student" on public.notifications for select using (
  student_id in (select id from public.students where user_id=auth.uid())
  or student_id is null
);
