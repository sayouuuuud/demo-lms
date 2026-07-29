create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                 
  display_code text unique not null,         
  description text not null default '',
  type text not null check (type in ('نسبة مئوية','مبلغ ثابت')),
  value numeric not null default 0,
  used integer not null default 0,
  "limit" integer not null default 0,
  start_date date not null,
  end_date date not null,
  status text not null check (status in ('نشط','منتهي','متوقف')),
  created_at timestamptz not null default now()
);
alter table public.coupons enable row level security;
create policy "coupons_admin_all" on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());
