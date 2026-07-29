create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  title text not null,
  type text not null check (type in ('مالي','أكاديمي','حضور','نظام')),
  created_by text not null,
  created_at timestamptz not null default now(),
  status text not null check (status in ('جاهز','قيد التجهيز','فشل'))
);
alter table public.reports enable row level security;
create policy "reports_admin_all" on public.reports
  for all using (public.is_admin()) with check (public.is_admin());
