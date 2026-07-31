// تحقق من إن Q01_question_bank.sql اتطبّق فعلًا على القاعدة
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

let pass = 0, fail = 0
const t = (name, cond, detail = '') => {
  if (cond) { pass++; console.log('PASS  ' + name) }
  else { fail++; console.log('FAIL  ' + name + (detail ? ' :: ' + detail : '')) }
}

const TABLES = [
  'question_bank_questions',
  'question_bank_scopes',
  'question_bank_topics',
  'question_bank_question_topics',
]

try {
  // 1) الجداول موجودة
  const tbl = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ANY(${TABLES})
  `
  const found = tbl.map(r => r.table_name)
  for (const name of TABLES) t('جدول ' + name + ' موجود', found.includes(name))

  // 2) أعمدة question_bank_questions
  const cols = await prisma.$queryRaw`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='question_bank_questions'
  `
  const colMap = new Map(cols.map(c => [c.column_name, c]))
  const EXPECTED = ['id','question_text','question_type','content_mode','image_url','options',
    'correct_answer','model_answer','points','difficulty','auto_difficulty','usage_count',
    'last_used_at','answers_count','correct_count','notes','created_by','archived_at',
    'created_at','updated_at']
  for (const c of EXPECTED) t('عمود qbq.' + c, colMap.has(c))
  t('options نوعه jsonb', colMap.get('options')?.data_type === 'jsonb', colMap.get('options')?.data_type)

  // 3) exam_questions.bank_question_id + FK
  const eqCol = await prisma.$queryRaw`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='exam_questions' AND column_name='bank_question_id'
  `
  t('exam_questions.bank_question_id موجود', eqCol.length === 1)

  const fk = await prisma.$queryRaw`
    SELECT c.conname, confdeltype FROM pg_constraint c
    WHERE c.conname = 'exam_questions_bank_question_fk'
  `
  t('FK exam_questions_bank_question_fk موجود', fk.length === 1)
  t('FK ON DELETE SET NULL', fk[0]?.confdeltype === 'n', String(fk[0]?.confdeltype))

  // 4) CHECK constraints
  const chks = await prisma.$queryRaw`
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.question_bank_questions'::regclass AND contype = 'c'
  `
  const chkNames = chks.map(c => c.conname)
  for (const n of ['qbq_type_chk','qbq_mode_chk','qbq_difficulty_chk','qbq_auto_diff_chk','qbq_points_chk'])
    t('CHECK ' + n, chkNames.includes(n))

  const sChk = await prisma.$queryRaw`
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.question_bank_scopes'::regclass AND contype='c'
  `
  t('CHECK qbs_type_chk', sChk.map(c => c.conname).includes('qbs_type_chk'))

  // 5) الفهارس
  const idx = await prisma.$queryRaw`
    SELECT indexname FROM pg_indexes
    WHERE schemaname='public' AND tablename LIKE 'question_bank%'
  `
  const idxNames = idx.map(i => i.indexname)
  for (const n of ['idx_qbq_active','idx_qbq_difficulty','idx_qbq_type','uq_qbs_unique','idx_qbs_lookup','uq_qbt_title','idx_qbqt_topic'])
    t('فهرس ' + n, idxNames.includes(n), idxNames.join(','))

  const eqIdx = await prisma.$queryRaw`
    SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname='idx_exam_questions_bank'
  `
  t('فهرس idx_exam_questions_bank', eqIdx.length === 1)

  // 6) RLS مفعّل
  const rls = await prisma.$queryRaw`
    SELECT relname, relrowsecurity FROM pg_class
    WHERE relname = ANY(${TABLES}) AND relnamespace = 'public'::regnamespace
  `
  for (const r of rls) t('RLS مفعّل على ' + r.relname, r.relrowsecurity === true)

  // 7) دالة الصيانة
  const fn = await prisma.$queryRaw`
    SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname='qb_cleanup_orphan_scopes'
  `
  t('دالة qb_cleanup_orphan_scopes موجودة', fn.length === 1)

  // 8) الـ Prisma client شايف الموديلات
  t('prisma.question_bank_questions متاح', typeof prisma.question_bank_questions?.count === 'function')
  t('prisma.question_bank_scopes متاح', typeof prisma.question_bank_scopes?.count === 'function')
  t('prisma.question_bank_topics متاح', typeof prisma.question_bank_topics?.count === 'function')

  // 9) قراءة فعلية (يعني الموديل مطابق للجدول)
  const counts = {
    questions: await prisma.question_bank_questions.count(),
    scopes: await prisma.question_bank_scopes.count(),
    topics: await prisma.question_bank_topics.count(),
  }
  t('قراءة الجداول بـ Prisma شغّالة', true)
  console.log('\nأعداد حالية: ' + JSON.stringify(counts))

  // 10) شجرة المحتوى فيها داتا نختبر بيها
  const tree = {
    stages: await prisma.stages.count(),
    branches: await prisma.branches.count(),
    monthly_courses: await prisma.monthly_courses.count(),
    lectures: await prisma.lectures.count(),
  }
  console.log('شجرة المحتوى: ' + JSON.stringify(tree))
  t('فيه stages للاختبار', tree.stages > 0)
  t('فيه lectures للاختبار', tree.lectures > 0)
} catch (e) {
  fail++
  console.log('EXCEPTION :: ' + (e?.message || e))
} finally {
  await prisma.$disconnect()
}

console.log('\n=== ' + pass + ' passed, ' + fail + ' failed ===')
process.exit(fail ? 1 : 0)
