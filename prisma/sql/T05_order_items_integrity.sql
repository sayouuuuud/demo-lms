-- T05: قيد سلامة محتوى order_items
-- تحقّق أولًا من عدد الصفوف المعطوبة (يجب معالجتها في T06 قبل VALIDATE):
--   SELECT count(*) FROM order_items
--   WHERE lecture_id IS NULL AND monthly_course_id IS NULL AND term_id IS NULL;

ALTER TABLE order_items
  ADD CONSTRAINT order_items_has_content_ref
  CHECK (
    lecture_id IS NOT NULL
    OR monthly_course_id IS NOT NULL
    OR term_id IS NOT NULL
  )
  NOT VALID;
