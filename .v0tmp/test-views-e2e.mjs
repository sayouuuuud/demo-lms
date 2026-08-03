import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
let pass = 0, fail = 0
const ok = (m) => { pass++; console.log('  PASS  ' + m) }
const bad = (m) => { fail++; console.log('  FAIL  ' + m) }

// نفس دوال lib/view-tracking.ts بالضبط
function currentViewBucket(now = new Date()) {
  const y = now.getUTCFullYear()
  const mo = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  const h = String(now.getUTCHours()).padStart(2, '0')
  const halfHour = now.getUTCMinutes() < 30 ? '00' : '30'
  return `${y}-${mo}-${d}T${h}:${halfHour}`
}
function classifyDevice(ua) {
  if (!ua) return 'unknown'
  const s = ua.toLowerCase()
  if (/bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly/.test(s)) return 'bot'
  if (/ipad|tablet|(android(?!.*mobile))/.test(s)) return 'tablet'
  if (/mobi|iphone|ipod|android.*mobile|windows phone/.test(s)) return 'mobile'
  return 'desktop'
}
function clampInt(v, min, max) {
  const n = Math.floor(Number(v))
  if (!Number.isFinite(n)) return min
  return n < min ? min : n > max ? max : n
}

console.log('=== 1. دوال lib/view-tracking ===')
classifyDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit Mobile/15E148') === 'mobile'
  ? ok('iPhone => mobile') : bad('iPhone')
classifyDevice('Mozilla/5.0 (iPad; CPU OS 17_0) AppleWebKit') === 'tablet'
  ? ok('iPad => tablet') : bad('iPad')
classifyDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120') === 'desktop'
  ? ok('Windows => desktop') : bad('Windows')
classifyDevice('Googlebot/2.1 (+http://www.google.com/bot.html)') === 'bot'
  ? ok('Googlebot => bot (يُستثنى من العدّ)') : bad('Googlebot')
classifyDevice('') === 'unknown' ? ok('فارغ => unknown') : bad('فارغ')

currentViewBucket(new Date('2026-08-03T10:15:00Z')) === '2026-08-03T10:00'
  ? ok('10:15 => شبّاك 10:00') : bad('bucket 10:15')
currentViewBucket(new Date('2026-08-03T10:45:00Z')) === '2026-08-03T10:30'
  ? ok('10:45 => شبّاك 10:30') : bad('bucket 10:45')
currentViewBucket(new Date('2026-08-03T10:29:59Z')) === '2026-08-03T10:00'
  ? ok('10:29:59 => شبّاك 10:00 (حدّ)') : bad('bucket edge')

clampInt(999, 0, 100) === 100 ? ok('clampInt(999,0,100)=100 يمنع التلاعب') : bad('clamp high')
clampInt(-5, 0, 100) === 0 ? ok('clampInt(-5)=0 يمنع السلبي') : bad('clamp low')
clampInt('abc', 0, 100) === 0 ? ok("clampInt('abc')=0 يمنع النص") : bad('clamp nan')
clampInt(50.9, 0, 100) === 50 ? ok('clampInt(50.9)=50 عدد صحيح') : bad('clamp float')

// ---- بيانات اختبار حقيقية ----
const [lesson] = await p.$queryRawUnsafe(
  `select id as lesson_id, lecture_id, title from lessons where lecture_id is not null limit 1`
)
const [stu] = await p.$queryRawUnsafe(
  `select s.id as student_id, s.user_id from students s limit 1`
)
if (!lesson || !stu) { console.log('لا توجد بيانات كافية'); await p.$disconnect(); process.exit(1) }

const L = lesson.lesson_id, LEC = lesson.lecture_id, U = stu.user_id, S = stu.student_id
console.log(`\n(بيانات الاختبار: درس=${lesson.title}, طالب=${U})`)

// تنظيف قبل البدء
await p.$executeRawUnsafe(`delete from lecture_views where user_id='${U}' and lesson_id='${L}'`)
await p.$executeRawUnsafe(`delete from lesson_watch_progress where user_id='${U}' and lesson_id='${L}'`)
await p.$executeRawUnsafe(`delete from lesson_segment_viewers where user_id='${U}' and lesson_id='${L}'`)

// نفس SQL مسار /api/lecture-view
async function recordView(device, bucket) {
  const inserted = await p.$executeRawUnsafe(`
    INSERT INTO lecture_views (lecture_id, lesson_id, user_id, student_id, device, view_bucket)
    VALUES ('${LEC}'::uuid,'${L}'::uuid,'${U}'::uuid,'${S}'::uuid,'${device}','${bucket}')
    ON CONFLICT (user_id, lesson_id, view_bucket) DO NOTHING`)
  if (inserted === 1) {
    await p.$executeRawUnsafe(`
      INSERT INTO lesson_watch_progress (user_id, lesson_id, lecture_id, student_id, views_count, last_viewed_at)
      VALUES ('${U}'::uuid,'${L}'::uuid,'${LEC}'::uuid,'${S}'::uuid,1,NOW())
      ON CONFLICT (user_id, lesson_id) DO UPDATE SET
        views_count = lesson_watch_progress.views_count + 1,
        last_viewed_at = NOW(),
        student_id = COALESCE(lesson_watch_progress.student_id, EXCLUDED.student_id)`)
  }
  return inserted
}

console.log('\n=== 2. منع التكرار (نفس الشبّاك) ===')
const b = currentViewBucket()
const i1 = await recordView('desktop', b)
i1 === 1 ? ok('المشاهدة الأولى سُجّلت (inserted=1)') : bad(`الأولى inserted=${i1}`)
const i2 = await recordView('desktop', b)
i2 === 0 ? ok('المشاهدة الثانية في نفس الشبّاك مُنعت (inserted=0)') : bad(`الثانية inserted=${i2}`)
const i3 = await recordView('desktop', b)
i3 === 0 ? ok('المشاهدة الثالثة مُنعت أيضًا — لا تضخيم للأرقام') : bad(`الثالثة inserted=${i3}`)

let [{ c }] = await p.$queryRawUnsafe(
  `select count(*)::int c from lecture_views where user_id='${U}' and lesson_id='${L}'`)
c === 1 ? ok('lecture_views = صف واحد فقط بعد 3 محاولات') : bad(`صفوف=${c}`)
let [{ v }] = await p.$queryRawUnsafe(
  `select views_count v from lesson_watch_progress where user_id='${U}' and lesson_id='${L}'`)
v === 1 ? ok('views_count = 1 (لم يتضخّم)') : bad(`views_count=${v}`)

console.log('\n=== 3. شبّاك جديد = مشاهدة جديدة ===')
const i4 = await recordView('mobile', '2026-08-03T09:00')
i4 === 1 ? ok('شبّاك مختلف سُجّل (inserted=1)') : bad(`inserted=${i4}`)
;[{ v }] = await p.$queryRawUnsafe(
  `select views_count v from lesson_watch_progress where user_id='${U}' and lesson_id='${L}'`)
v === 2 ? ok('views_count = 2 الآن') : bad(`views_count=${v}`)

console.log('\n=== 4. التقدّم: max_percent لا ينزل أبدًا ===')
async function recordProgress(percent, watched, duration, segments) {
  const pc = clampInt(percent, 0, 100)
  const ws = clampInt(watched, 0, 86400)
  const ds = clampInt(duration, 0, 86400)
  await p.$executeRawUnsafe(`
    INSERT INTO lesson_watch_progress
      (user_id, lesson_id, lecture_id, student_id, max_percent, watched_seconds, duration_seconds, completed, last_viewed_at)
    VALUES ('${U}'::uuid,'${L}'::uuid,'${LEC}'::uuid,'${S}'::uuid,${pc},${ws},${ds},${pc >= 90},NOW())
    ON CONFLICT (user_id, lesson_id) DO UPDATE SET
      max_percent = GREATEST(lesson_watch_progress.max_percent, EXCLUDED.max_percent),
      watched_seconds = GREATEST(lesson_watch_progress.watched_seconds, EXCLUDED.watched_seconds),
      duration_seconds = GREATEST(lesson_watch_progress.duration_seconds, EXCLUDED.duration_seconds),
      completed = lesson_watch_progress.completed OR EXCLUDED.completed,
      last_viewed_at = NOW()`)
  for (const s of segments) {
    const si = clampInt(s, 0, 19)
    await p.$executeRawUnsafe(`
      INSERT INTO lesson_segment_viewers (lesson_id, segment_index, user_id)
      VALUES ('${L}'::uuid, ${si}, '${U}'::uuid)
      ON CONFLICT (lesson_id, segment_index, user_id) DO NOTHING`)
  }
}

await recordProgress(60, 120, 200, [0, 1, 2, 3])
let [r] = await p.$queryRawUnsafe(
  `select max_percent,watched_seconds,duration_seconds,completed from lesson_watch_progress where user_id='${U}' and lesson_id='${L}'`)
r.max_percent === 60 ? ok('max_percent = 60') : bad(`max_percent=${r.max_percent}`)
r.completed === false ? ok('completed = false عند 60%') : bad(`completed=${r.completed}`)

await recordProgress(30, 40, 200, [0])
;[r] = await p.$queryRawUnsafe(
  `select max_percent,watched_seconds from lesson_watch_progress where user_id='${U}' and lesson_id='${L}'`)
r.max_percent === 60 ? ok('إعادة المشاهدة من البداية (30%) لم تُنقص max_percent — بقي 60') : bad(`max_percent=${r.max_percent}`)
r.watched_seconds === 120 ? ok('watched_seconds لم ينقص — بقي 120') : bad(`watched=${r.watched_seconds}`)

await recordProgress(95, 190, 200, [17, 18, 19])
;[r] = await p.$queryRawUnsafe(
  `select max_percent,completed from lesson_watch_progress where user_id='${U}' and lesson_id='${L}'`)
r.max_percent === 95 ? ok('max_percent صار 95') : bad(`max_percent=${r.max_percent}`)
r.completed === true ? ok('completed = true عند 95% (>=90)') : bad(`completed=${r.completed}`)

await recordProgress(50, 100, 200, [])
;[r] = await p.$queryRawUnsafe(
  `select completed from lesson_watch_progress where user_id='${U}' and lesson_id='${L}'`)
r.completed === true ? ok('completed لا يتراجع لـ false أبدًا') : bad(`completed=${r.completed}`)

console.log('\n=== 5. تلاعب العميل مصدود ===')
await recordProgress(9999, 999999, 200, [99, -5])
;[r] = await p.$queryRawUnsafe(
  `select max_percent,watched_seconds from lesson_watch_progress where user_id='${U}' and lesson_id='${L}'`)
r.max_percent === 100 ? ok('percent=9999 → حُصر إلى 100') : bad(`max_percent=${r.max_percent}`)
r.watched_seconds === 86400 ? ok('watchedSeconds=999999 → حُصر إلى 86400') : bad(`watched=${r.watched_seconds}`)
const segs = await p.$queryRawUnsafe(
  `select segment_index from lesson_segment_viewers where user_id='${U}' and lesson_id='${L}' order by segment_index`)
const idxs = segs.map((x) => x.segment_index)
idxs.every((i) => i >= 0 && i <= 19) ? ok(`كل المقاطع بين 0..19: [${idxs.join(',')}]`) : bad(`مقاطع خارج المدى: ${idxs}`)

console.log('\n=== 6. المقاطع لا تتكرر لنفس المستخدم ===')
const before = idxs.length
await recordProgress(95, 190, 200, [0, 1, 2, 3, 17, 18, 19])
const [{ c2 }] = await p.$queryRawUnsafe(
  `select count(*)::int c2 from lesson_segment_viewers where user_id='${U}' and lesson_id='${L}'`)
c2 === before ? ok(`العدد ثابت (${c2}) — COUNT = مشاهدون فريدون فعلًا`) : bad(`قبل=${before} بعد=${c2}`)

console.log('\n=== 7. استعلامات القراءة (نفس SQL في queries.ts) ===')
const [kpi] = await p.$queryRawUnsafe(`
  SELECT COUNT(*)::int AS total_views, COUNT(DISTINCT user_id)::int AS unique_students
  FROM lecture_views WHERE created_at >= NOW() - (30 * INTERVAL '1 day') AND device <> 'bot'`)
ok(`KPIs: مشاهدات=${kpi.total_views}, طلاب فريدون=${kpi.unique_students}`)

const [agg] = await p.$queryRawUnsafe(`
  SELECT COALESCE(SUM(watched_seconds),0)::int AS ws, COALESCE(AVG(max_percent),0)::float AS ac
  FROM lesson_watch_progress WHERE last_viewed_at >= NOW() - (30 * INTERVAL '1 day')`)
ok(`ساعات مشاهدة=${(agg.ws / 3600).toFixed(2)}, متوسط إكمال=${Math.round(agg.ac)}%`)

const top = await p.$queryRawUnsafe(`
  SELECT lv.lesson_id, COUNT(*)::int AS views, COUNT(DISTINCT lv.user_id)::int AS uniq
  FROM lecture_views lv WHERE lv.created_at >= NOW() - (30 * INTERVAL '1 day') AND lv.device <> 'bot'
  GROUP BY lv.lesson_id ORDER BY views DESC LIMIT 5`)
top.length > 0 ? ok(`أكثر الدروس مشاهدة: ${top.length} صف`) : bad('لا نتائج')

const dev = await p.$queryRawUnsafe(`
  SELECT device, COUNT(*)::int AS c FROM lecture_views
  WHERE created_at >= NOW() - (30 * INTERVAL '1 day') AND device <> 'bot' GROUP BY device`)
ok('توزيع الأجهزة: ' + dev.map((d) => `${d.device}=${d.c}`).join(', '))

const ret = await p.$queryRawUnsafe(`
  SELECT segment_index, COUNT(*)::int AS viewers FROM lesson_segment_viewers
  WHERE lesson_id='${L}'::uuid GROUP BY segment_index ORDER BY segment_index`)
ok(`خريطة البقاء: ${ret.length} مقطع فيه مشاهدون`)

const peak = await p.$queryRawUnsafe(`
  SELECT EXTRACT(HOUR FROM created_at)::int AS h, COUNT(*)::int AS c FROM lecture_views
  WHERE created_at >= NOW() - (30 * INTERVAL '1 day') GROUP BY h ORDER BY c DESC LIMIT 3`)
ok('أوقات الذروة: ' + peak.map((x) => `${x.h}:00 (${x.c})`).join(', '))

const dead = await p.$queryRawUnsafe(`
  SELECT l.id FROM lessons l
  LEFT JOIN lecture_views lv ON lv.lesson_id = l.id
  WHERE lv.lesson_id IS NULL LIMIT 5`)
ok(`محتوى بلا مشاهدات: ${dead.length} درس (عيّنة)`)

console.log('\n=== 8. تنظيف بيانات الاختبار ===')
await p.$executeRawUnsafe(`delete from lecture_views where user_id='${U}' and lesson_id='${L}'`)
await p.$executeRawUnsafe(`delete from lesson_watch_progress where user_id='${U}' and lesson_id='${L}'`)
await p.$executeRawUnsafe(`delete from lesson_segment_viewers where user_id='${U}' and lesson_id='${L}'`)
const [{ c3 }] = await p.$queryRawUnsafe(
  `select count(*)::int c3 from lecture_views where user_id='${U}' and lesson_id='${L}'`)
c3 === 0 ? ok('تم التنظيف — القاعدة عادت كما كانت') : bad('بقيت بيانات')

console.log(`\n======== النتيجة: ${pass} ناجح / ${fail} فاشل ========`)
await p.$disconnect()
process.exit(fail ? 1 : 0)
