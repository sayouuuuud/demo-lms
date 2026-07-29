-- Coupon scoping: a coupon can apply to the whole cart (scope='all') or only
-- to a chosen set of lectures (scope='lectures'). Also records the applied
-- discount on orders. Idempotent.

-- 1) Scope flag on coupons (defaults to 'all' = existing behaviour).
alter table public.coupons
  add column if not exists scope text not null default 'all'
  check (scope in ('all','lectures'));

-- 2) Join table: which lectures a 'lectures'-scoped coupon covers.
create table if not exists public.coupon_lectures (
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  primary key (coupon_id, lecture_id)
);

-- 3) Discount bookkeeping on orders.
alter table public.orders add column if not exists subtotal numeric not null default 0;
alter table public.orders add column if not exists discount numeric not null default 0;
alter table public.orders add column if not exists coupon_code text;

-- ---- RLS --------------------------------------------------------------------
-- Coupons must be READABLE by authenticated students so the cart can validate a
-- code (admin-only previously). Keep admin full management.
alter table public.coupons enable row level security;
drop policy if exists "coupons_select_auth" on public.coupons;
create policy "coupons_select_auth" on public.coupons
  for select using (auth.role() = 'authenticated');

alter table public.coupon_lectures enable row level security;
drop policy if exists "coupon_lectures_select_auth" on public.coupon_lectures;
create policy "coupon_lectures_select_auth" on public.coupon_lectures
  for select using (auth.role() = 'authenticated');
drop policy if exists "coupon_lectures_admin_all" on public.coupon_lectures;
create policy "coupon_lectures_admin_all" on public.coupon_lectures
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- Usage increment (SECURITY DEFINER) -------------------------------------
-- Lets a student checkout bump a coupon's used counter even though coupons are
-- admin-only for writes under RLS.
create or replace function public.increment_coupon_used(p_code text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.coupons set used = used + 1 where code = p_code;
$$;
grant execute on function public.increment_coupon_used(text) to authenticated;
