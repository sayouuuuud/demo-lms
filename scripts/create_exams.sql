create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                 
  title text not null,
  course text not null,
  duration integer not null,
  questions integer not null,
  participants integer not null default 0,
  avg_score numeric not null default 0,
  status text not null check (status in ('منشور','مسودة','منتهي')),
  created_at timestamptz not null default now()
);
alter table public.exams enable row level security;
create policy "exams_admin_all" on public.exams
  for all using (public.is_admin()) with check (public.is_admin());
