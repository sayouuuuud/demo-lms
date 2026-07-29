create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                 
  type text not null check (type in ('طالب','دفع','اختبار','كورس','رسالة','نظام')),
  title text not null,
  description text not null default '',
  read boolean not null default false,
  time_label text not null default '',
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create policy "notifications_admin_all" on public.notifications
  for all using (public.is_admin()) with check (public.is_admin());
