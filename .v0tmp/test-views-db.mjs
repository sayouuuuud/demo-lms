import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

function ok(m) { console.log('  PASS  ' + m) }
function bad(m) { console.log('  FAIL  ' + m) }

const tables = ['lecture_views', 'lesson_watch_progress', 'lesson_segment_viewers']

console.log('=== 1. وجود الجداول في قاعدة البيانات ===')
for (const t of tables) {
  const r = await p.$queryRawUnsafe(
    `select to_regclass('public.${t}') is not null as ex`
  )
  r[0].ex ? ok(`${t} موجود`) : bad(`${t} غير موجود`)
}

console.log('\n=== 2. أعمدة lecture_views ===')
const cols = await p.$queryRawUnsafe(
  `select column_name from information_schema.columns where table_name='lecture_views' order by ordinal_position`
)
console.log('  ' + cols.map((c) => c.column_name).join(', '))

console.log('\n=== 3. قيد منع التكرار uq_lecture_views_dedupe ===')
const uq = await p.$queryRawUnsafe(
  `select indexname from pg_indexes where tablename='lecture_views' and indexname='uq_lecture_views_dedupe'`
)
uq.length ? ok('القيد موجود (dedupe يعمل)') : bad('القيد مفقود')

console.log('\n=== 4. RLS مفعّل بدون سياسات (مخفي عن الطلاب) ===')
for (const t of tables) {
  const [{ relrowsecurity }] = await p.$queryRawUnsafe(
    `select relrowsecurity from pg_class where relname='${t}'`
  )
  const pol = await p.$queryRawUnsafe(
    `select policyname from pg_policies where tablename='${t}'`
  )
  relrowsecurity && pol.length === 0
    ? ok(`${t}: RLS=on, policies=0`)
    : bad(`${t}: RLS=${relrowsecurity}, policies=${pol.length}`)
}

console.log('\n=== 5. عدد الصفوف الحالية ===')
for (const t of tables) {
  const [{ c }] = await p.$queryRawUnsafe(`select count(*)::int as c from ${t}`)
  console.log(`  ${t}: ${c} صف`)
}

console.log('\n=== 6. بيانات حقيقية للاختبار (درس + مستخدم) ===')
const lesson = await p.$queryRawUnsafe(
  `select l.id as lesson_id, l.lecture_id, l.title from lessons l where l.lecture_id is not null limit 1`
)
if (lesson.length) {
  ok(`درس: ${lesson[0].title} | lesson_id=${lesson[0].lesson_id} | lecture_id=${lesson[0].lecture_id}`)
} else bad('لا يوجد درس مرتبط بمحاضرة')

const user = await p.$queryRawUnsafe(
  `select u.id, u.role from "User" u where u.role='STUDENT' limit 1`
)
user.length ? ok(`طالب: ${user[0].id}`) : bad('لا يوجد طالب')

const admin = await p.$queryRawUnsafe(
  `select u.id, u.email, u.role from "User" u where u.role='ADMIN' limit 1`
)
admin.length ? ok(`أدمن: ${admin[0].email}`) : bad('لا يوجد أدمن')

await p.$disconnect()
