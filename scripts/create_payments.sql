create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                 
  student_name text not null,
  student_email text not null,
  student_phone text not null,
  course text not null,
  amount numeric not null,
  method text not null check (method in ('انستاباي','فودافون كاش','بطاقة ائتمان','تحويل بنكي','نقدي')),
  receipt_url text,
  reference text not null,
  submitted_at text not null,
  status text not null check (status in ('قيد المراجعة','مقبول','مرفوض')),
  created_at timestamptz not null default now()
);
alter table public.payments enable row level security;
create policy "payments_admin_all" on public.payments
  for all using (public.is_admin()) with check (public.is_admin());
