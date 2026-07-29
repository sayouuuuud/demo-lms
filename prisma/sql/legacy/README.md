# سكريبتات SQL تاريخية (غير مُدارة)

هذه الملفات نُفّذت يدويًا على القاعدة بدون آلية migration. **لا تُشغّلها.**

## سبب أرشفتها
المشروع لا يحتوي على `prisma/migrations/` — الـ schema مأخوذ بـ `prisma db pull`
من قاعدة موجودة. لذلك لا توجد طريقة لمعرفة أي من هذه الملفات طُبّق على أي بيئة.

هذا هو السبب الجذري لوجود شجرتين متوازيتين للمحتوى في نفس الـ schema
(انظر البند P1-1 و T08 في `docs/AUDIT_FULL_REPORT.md`): الشجرة الجديدة
`stages/branches/terms/monthly_courses/lectures/lessons` أُضيفت بـ SQL يدوي،
والقديمة `courses/course_sections/course_lessons/enrollments` لم تُحذف أبدًا.

## الخطوة التالية (قرار بشري)
تبنّي `prisma migrate` ببدء baseline من الحالة الحالية للقاعدة.
