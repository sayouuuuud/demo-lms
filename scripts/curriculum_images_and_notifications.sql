-- ──────────────────────────────────────────────────────────────────────────
-- Curriculum images + notifications enhancements
-- Idempotent: safe to re-run. Run this in the Supabase SQL editor.
-- ──────────────────────────────────────────────────────────────────────────

-- 1) Lecture artwork. Lectures previously had no image column; the student
--    portal fell back to /lessons/<slug>.png. Add an explicit image column so
--    the admin can control each lecture's artwork (uploaded via UploadThing).
alter table public.lectures add column if not exists image text;

-- 2) Notifications: allow targeting a notification to a whole grade (stage)
--    in addition to a single student or a global broadcast. NULL grade means
--    "not grade-scoped" (works with the existing student_id / broadcast logic).
alter table public.notifications add column if not exists grade text;

-- 3) Per-student read tracking for broadcast/grade notifications.
--    The notifications.read flag is global; for broadcasts we need per-student
--    read state. This table records which student dismissed/read which notif.
create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, student_id)
);
alter table public.notification_reads enable row level security;

drop policy if exists "notif_reads_own" on public.notification_reads;
create policy "notif_reads_own" on public.notification_reads
  for all using (
    student_id in (select id from public.students where user_id = auth.uid())
  ) with check (
    student_id in (select id from public.students where user_id = auth.uid())
  );

drop policy if exists "notif_reads_admin" on public.notification_reads;
create policy "notif_reads_admin" on public.notification_reads
  for all using (public.is_admin()) with check (public.is_admin());

-- 4) Let students READ grade-targeted notifications too (in addition to their
--    own student_id and global broadcasts). Recreate the select policy.
drop policy if exists "notifications_student" on public.notifications;
create policy "notifications_student" on public.notifications for select using (
  student_id in (select id from public.students where user_id = auth.uid())
  or student_id is null
);
