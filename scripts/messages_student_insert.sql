-- Allow a student to start a conversation (insert a messages row for themselves).
drop policy if exists "messages_student_insert" on public.messages;
create policy "messages_student_insert" on public.messages
  for insert with check (student_id = auth.uid());
