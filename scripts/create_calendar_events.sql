create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                 
  title text not null,
  event_date date not null,
  event_time text not null,                  
  type text not null check (type in ('محاضرة','اختبار','موعد تسليم','اجتماع','حدث مخصص')),
  course text,
  description text,
  custom boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.calendar_events enable row level security;
create policy "calendar_admin_all" on public.calendar_events
  for all using (public.is_admin()) with check (public.is_admin());
create policy "calendar_select_authenticated" on public.calendar_events
  for select using (auth.role() = 'authenticated');
