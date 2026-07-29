create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.settings enable row level security;
create policy "settings_admin_all" on public.settings
  for all using (public.is_admin()) with check (public.is_admin());
