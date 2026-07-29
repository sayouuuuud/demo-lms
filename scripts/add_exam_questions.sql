-- Create exam_questions table
create table if not exists public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  question_text text not null,
  options jsonb not null,
  correct_answer text not null,
  points integer not null default 1,
  created_at timestamptz not null default now()
);

-- RLS for exam_questions
alter table public.exam_questions enable row level security;
create policy "exam_questions_admin_all" on public.exam_questions for all using (public.is_admin()) with check (public.is_admin());
create policy "exam_questions_student_select" on public.exam_questions for select using (true); -- allowed for now so students can view exams

-- Seed data for EXM-001
DO $$
DECLARE
  exm001_id uuid;
BEGIN
  SELECT id INTO exm001_id FROM public.exams WHERE code = 'EXM-001' LIMIT 1;
  
  IF exm001_id IS NOT NULL THEN
    INSERT INTO public.exam_questions (exam_id, question_text, options, correct_answer, points)
    VALUES 
      (exm001_id, 'ما هو حل المعادلة 2س + 5 = 15؟', '["5", "10", "15", "20"]'::jsonb, '5', 2),
      (exm001_id, 'إذا كانت س = 3، فما قيمة س^2 + 4؟', '["7", "10", "13", "16"]'::jsonb, '13', 2),
      (exm001_id, 'في المثلث القائم، إذا كان طول الضلعين 3 و 4، فما طول الوتر؟', '["5", "6", "7", "8"]'::jsonb, '5', 2),
      (exm001_id, 'ما هو ناتج تفاضل الدالة ص = 3س^2 + 2س؟', '["6س + 2", "3س + 2", "6س", "س^2"]'::jsonb, '6س + 2', 3),
      (exm001_id, 'أوجد المشتقة الأولى للدالة الجيبية جا(س)', '["جتا(س)", "-جا(س)", "-جتا(س)", "قا(س)"]'::jsonb, 'جتا(س)', 3)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Seed data for EXM-002
DO $$
DECLARE
  exm002_id uuid;
BEGIN
  SELECT id INTO exm002_id FROM public.exams WHERE code = 'EXM-002' LIMIT 1;
  
  IF exm002_id IS NOT NULL THEN
    INSERT INTO public.exam_questions (exam_id, question_text, options, correct_answer, points)
    VALUES 
      (exm002_id, 'ما هي مساحة المربع الذي طول ضلعه 5 سم؟', '["20 سم مربع", "25 سم مربع", "10 سم مربع", "15 سم مربع"]'::jsonb, '25 سم مربع', 2),
      (exm002_id, 'قيمة الدالة اللوغاريتمية لو(100) للأساس 10 هي:', '["1", "2", "10", "100"]'::jsonb, '2', 2),
      (exm002_id, 'حل المتباينة س - 3 > 5 هو:', '["س > 2", "س < 8", "س > 8", "س < 2"]'::jsonb, 'س > 8', 2)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
