create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text not null default '',
  courses integer not null default 0,
  students integer not null default 0,
  icon text not null default 'Layers',          -- اسم أيقونة Lucide (نص)
  color text not null default 'text-primary',    -- class حرفي
  bg text not null default 'bg-primary/10',       -- class حرفي
  status text not null default 'مفعّل' check (status in ('مفعّل','متوقف')),
  created_at timestamptz not null default now()
);
alter table public.categories enable row level security;
create policy "categories_admin_all" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());
create policy "categories_select_authenticated" on public.categories
  for select using (auth.role() = 'authenticated');
