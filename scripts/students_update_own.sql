-- Allow a student to update their own students row (name/phone from settings).
-- Restrict the columns at the app layer; RLS just scopes to the owner.
drop policy if exists "students_update_own" on public.students;
create policy "students_update_own" on public.students
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
