-- Idempotent demo seed: gives the linked demo student real content so the
-- student portal (courses / exams / assignments / grades / schedule) shows data.
-- Safe to re-run: uses stable codes + ON CONFLICT / NOT EXISTS guards.

do $$
declare
  v_student uuid;
  v_course record;
  v_section uuid;
  v_enroll uuid;
  v_lesson uuid;
  v_asg uuid;
  i int;
  done_count int;
  course_idx int := 0;
begin
  -- The demo student (first students row linked to an auth user).
  select id into v_student from public.students where user_id is not null order by created_at limit 1;
  if v_student is null then
    raise notice 'no linked student found; skipping seed';
    return;
  end if;

  -- For the first 3 courses: build sections + lessons, enroll the student,
  -- and mark a varying number of lessons complete.
  for v_course in
    select id, title from public.courses order by created_at limit 3
  loop
    course_idx := course_idx + 1;

    -- One section per course (idempotent by title+course).
    select id into v_section from public.course_sections
      where course_id = v_course.id and title = 'الوحدة الأولى';
    if v_section is null then
      insert into public.course_sections (course_id, title, position)
        values (v_course.id, 'الوحدة الأولى', 0)
        returning id into v_section;
    end if;

    -- 5 lessons in that section.
    for i in 1..5 loop
      select id into v_lesson from public.course_lessons
        where section_id = v_section and position = i;
      if v_lesson is null then
        insert into public.course_lessons (section_id, title, type, duration, position)
          values (v_section, 'الدرس ' || i, 'فيديو', '10:00', i);
      end if;
    end loop;

    -- Enroll the student (unique student+course).
    select id into v_enroll from public.enrollments
      where student_id = v_student and course_id = v_course.id;
    if v_enroll is null then
      insert into public.enrollments (student_id, course_id)
        values (v_student, v_course.id)
        returning id into v_enroll;
    end if;

    -- Mark the first (course_idx) lessons complete -> varying progress.
    done_count := least(course_idx, 5);
    for v_lesson in
      select cl.id from public.course_lessons cl
      where cl.section_id = v_section
      order by cl.position
      limit done_count
    loop
      insert into public.lesson_progress (enrollment_id, lesson_id, completed, completed_at)
        values (v_enroll, v_lesson, true, now())
        on conflict (enrollment_id, lesson_id) do update set completed = true;
    end loop;
  end loop;

  -- Assignments for the FIRST enrolled course: one quiz (اختبار) + one submission (تسليم).
  select course_id into v_course from public.enrollments where student_id = v_student order by enrolled_at limit 1;

  -- Quiz assignment.
  if not exists (select 1 from public.assignments where code = 'ASG-DEMO-Q1') then
    insert into public.assignments (code, course_id, type, title, description, due_date, points)
      values ('ASG-DEMO-Q1', v_course.course_id, 'اختبار', 'اختبار الوحدة الأولى',
              'اختبار قصير على الوحدة الأولى', to_char(now() + interval '7 days', 'YYYY-MM-DD'), 10)
      returning id into v_asg;
    insert into public.assignment_questions (assignment_id, question, options, correct_index, position) values
      (v_asg, 'ما ناتج ٢ + ٢؟', array['٣','٤','٥','٦'], 1, 0),
      (v_asg, 'ما ناتج ٣ × ٣؟', array['٦','٧','٩','١٢'], 2, 1);
  end if;

  -- Submission assignment.
  if not exists (select 1 from public.assignments where code = 'ASG-DEMO-S1') then
    insert into public.assignments (code, course_id, type, title, description, due_date, points)
      values ('ASG-DEMO-S1', v_course.course_id, 'تسليم', 'واجب الوحدة الأولى',
              'حل تمارين الوحدة الأولى وسلّمها', to_char(now() + interval '3 days', 'YYYY-MM-DD'), 20);
  end if;

  -- A graded submission for the quiz so the student has a recent grade.
  select id into v_asg from public.assignments where code = 'ASG-DEMO-Q1';
  insert into public.assignment_submissions (assignment_id, student_id, status, score, submitted_at)
    values (v_asg, v_student, 'مصحّح', 8, now() - interval '1 day')
    on conflict (assignment_id, student_id) do nothing;

  raise notice 'seed complete for student %', v_student;
end $$;
