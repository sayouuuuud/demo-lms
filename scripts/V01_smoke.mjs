// Smoke-tests every raw SQL statement used by the lecture-views analytics plan.
// Runs inside a transaction and ROLLS BACK, so no data is persisted.
import { Client } from 'pg'

const c = new Client({ connectionString: process.env.DATABASE_URL })

const ok = (m) => console.log('  OK   ' + m)
const fail = (m, e) => {
  console.log('  FAIL ' + m + '\n       ' + e.message)
  process.exitCode = 1
}

async function step(name, fn) {
  try {
    await fn()
    ok(name)
  } catch (e) {
    fail(name, e)
  }
}

await c.connect()
await c.query('BEGIN')

// Grab a real lesson + user so FKs are satisfied.
const seed = await c.query(`
  SELECT le.id AS lesson_id, le.lecture_id, u.id AS user_id
  FROM lessons le
  CROSS JOIN (SELECT id FROM auth.users LIMIT 1) u
  LIMIT 1
`)

if (seed.rows.length === 0) {
  console.log('No lessons or users in DB — running read-only query checks only.')
}
const s = seed.rows[0]

console.log('\n--- WRITE PATH ---')
if (s) {
  await step('INSERT lecture_views + ON CONFLICT DO NOTHING', async () => {
    const a = await c.query(
      `INSERT INTO lecture_views (lecture_id, lesson_id, user_id, student_id, device, view_bucket)
       VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6)
       ON CONFLICT (user_id, lesson_id, view_bucket) DO NOTHING`,
      [s.lecture_id, s.lesson_id, s.user_id, null, 'desktop', '2026-08-03T14:30'],
    )
    // second identical insert must be deduped
    const b = await c.query(
      `INSERT INTO lecture_views (lecture_id, lesson_id, user_id, student_id, device, view_bucket)
       VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6)
       ON CONFLICT (user_id, lesson_id, view_bucket) DO NOTHING`,
      [s.lecture_id, s.lesson_id, s.user_id, null, 'desktop', '2026-08-03T14:30'],
    )
    if (a.rowCount !== 1 || b.rowCount !== 0) {
      throw new Error(`dedupe broken: first=${a.rowCount} second=${b.rowCount}`)
    }
  })

  await step('UPSERT lesson_watch_progress (views_count branch)', async () => {
    await c.query(
      `INSERT INTO lesson_watch_progress
         (user_id, lesson_id, lecture_id, student_id, views_count, last_viewed_at)
       VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,1,NOW())
       ON CONFLICT (user_id, lesson_id) DO UPDATE SET
         views_count    = lesson_watch_progress.views_count + 1,
         last_viewed_at = NOW(),
         student_id     = COALESCE(lesson_watch_progress.student_id, EXCLUDED.student_id)`,
      [s.user_id, s.lesson_id, s.lecture_id, null],
    )
  })

  await step('UPSERT lesson_watch_progress (progress branch + GREATEST)', async () => {
    const run = (pct, delta) =>
      c.query(
        `INSERT INTO lesson_watch_progress
           (user_id, lesson_id, lecture_id, student_id,
            max_percent, watched_seconds, duration_seconds, completed, last_viewed_at)
         VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::smallint,$6,$7,$8,NOW())
         ON CONFLICT (user_id, lesson_id) DO UPDATE SET
           max_percent      = GREATEST(lesson_watch_progress.max_percent, EXCLUDED.max_percent),
           watched_seconds  = lesson_watch_progress.watched_seconds + EXCLUDED.watched_seconds,
           duration_seconds = GREATEST(lesson_watch_progress.duration_seconds, EXCLUDED.duration_seconds),
           completed        = GREATEST(lesson_watch_progress.max_percent, EXCLUDED.max_percent) >= 90,
           last_viewed_at   = NOW(),
           student_id       = COALESCE(lesson_watch_progress.student_id, EXCLUDED.student_id)`,
        [s.user_id, s.lesson_id, s.lecture_id, null, pct, delta, 600, pct >= 90],
      )
    await run(95, 30)
    await run(40, 30) // must NOT lower max_percent
    const r = await c.query(
      `SELECT max_percent, watched_seconds, completed FROM lesson_watch_progress
       WHERE user_id=$1::uuid AND lesson_id=$2::uuid`,
      [s.user_id, s.lesson_id],
    )
    const row = r.rows[0]
    if (row.max_percent !== 95) throw new Error('max_percent regressed to ' + row.max_percent)
    if (row.completed !== true) throw new Error('completed should stay true')
    if (row.watched_seconds !== 60) throw new Error('watched_seconds should sum to 60, got ' + row.watched_seconds)
  })

  await step('INSERT lesson_segment_viewers via UNNEST(int[])', async () => {
    const segs = [0, 1, 2, 19]
    const a = await c.query(
      `INSERT INTO lesson_segment_viewers (lesson_id, segment_index, user_id)
       SELECT $1::uuid, sg::smallint, $2::uuid
       FROM UNNEST($3::int[]) AS sg
       ON CONFLICT (lesson_id, segment_index, user_id) DO NOTHING`,
      [s.lesson_id, s.user_id, segs],
    )
    if (a.rowCount !== 4) throw new Error('expected 4 rows, got ' + a.rowCount)
    const b = await c.query(
      `INSERT INTO lesson_segment_viewers (lesson_id, segment_index, user_id)
       SELECT $1::uuid, sg::smallint, $2::uuid
       FROM UNNEST($3::int[]) AS sg
       ON CONFLICT (lesson_id, segment_index, user_id) DO NOTHING`,
      [s.lesson_id, s.user_id, segs],
    )
    if (b.rowCount !== 0) throw new Error('segment dedupe broken, got ' + b.rowCount)
  })
}

console.log('\n--- READ PATH ---')
const days = 30

await step('getViewsKpis / counts', () =>
  c.query(
    `SELECT COUNT(*) AS total_views, COUNT(DISTINCT user_id) AS unique_students
     FROM lecture_views
     WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day') AND device <> 'bot'`,
    [days],
  ),
)

await step('getViewsKpis / aggregates', () =>
  c.query(
    `SELECT SUM(watched_seconds) AS watch_seconds, AVG(max_percent) AS avg_completion
     FROM lesson_watch_progress
     WHERE last_viewed_at >= NOW() - ($1::int * INTERVAL '1 day')`,
    [days],
  ),
)

await step('getTopLectures', () =>
  c.query(
    `SELECT lv.lecture_id, l.title, COUNT(*) AS views,
            COUNT(DISTINCT lv.user_id) AS unique_students,
            COALESCE(AVG(p.max_percent),0) AS avg_completion
     FROM lecture_views lv
     JOIN lectures l ON l.id = lv.lecture_id
     LEFT JOIN lesson_watch_progress p
            ON p.lesson_id = lv.lesson_id AND p.user_id = lv.user_id
     WHERE lv.created_at >= NOW() - ($1::int * INTERVAL '1 day') AND lv.device <> 'bot'
     GROUP BY lv.lecture_id, l.title
     ORDER BY views DESC
     LIMIT $2`,
    [days, 10],
  ),
)

await step('getDeadLectures', () =>
  c.query(
    `SELECT l.id, l.title FROM lectures l
     WHERE NOT EXISTS (
       SELECT 1 FROM lecture_views lv
       WHERE lv.lecture_id = l.id
         AND lv.created_at >= NOW() - ($1::int * INTERVAL '1 day')
     )
     ORDER BY l.created_at DESC LIMIT $2`,
    [days, 10],
  ),
)

await step('getDailyViews (generate_series)', async () => {
  const r = await c.query(
    `SELECT d.day::date AS day, COUNT(lv.id) AS views, COUNT(DISTINCT lv.user_id) AS students
     FROM generate_series(
            (NOW() - ($1::int * INTERVAL '1 day'))::date, NOW()::date, INTERVAL '1 day'
          ) AS d(day)
     LEFT JOIN lecture_views lv
            ON lv.created_at::date = d.day::date AND lv.device <> 'bot'
     GROUP BY d.day ORDER BY d.day ASC`,
    [days],
  )
  if (r.rows.length !== days + 1) {
    throw new Error(`expected ${days + 1} points, got ${r.rows.length}`)
  }
})

await step('getDeviceSplit', () =>
  c.query(
    `SELECT device, COUNT(*) AS views FROM lecture_views
     WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day') AND device <> 'bot'
     GROUP BY device ORDER BY views DESC`,
    [days],
  ),
)

await step('getPeakHours (24 rows, Cairo tz)', async () => {
  const r = await c.query(
    `SELECT h.hour::int AS hour, COUNT(lv.id) AS views
     FROM generate_series(0, 23) AS h(hour)
     LEFT JOIN lecture_views lv
            ON EXTRACT(HOUR FROM lv.created_at AT TIME ZONE 'Africa/Cairo') = h.hour
           AND lv.created_at >= NOW() - ($1::int * INTERVAL '1 day')
           AND lv.device <> 'bot'
     GROUP BY h.hour ORDER BY h.hour ASC`,
    [days],
  )
  if (r.rows.length !== 24) throw new Error('expected 24 rows, got ' + r.rows.length)
})

if (s) {
  await step('getLectureLessonStats', () =>
    c.query(
      `SELECT le.id AS lesson_id, le.title,
              COALESCE(v.views,0) AS views,
              COALESCE(v.unique_students,0) AS unique_students,
              COALESCE(p.avg_completion,0) AS avg_completion,
              COALESCE(p.completed_count,0) AS completed_count
       FROM lessons le
       LEFT JOIN (
         SELECT lesson_id, COUNT(*) AS views, COUNT(DISTINCT user_id) AS unique_students
         FROM lecture_views WHERE device <> 'bot' GROUP BY lesson_id
       ) v ON v.lesson_id = le.id
       LEFT JOIN (
         SELECT lesson_id, AVG(max_percent) AS avg_completion,
                COUNT(*) FILTER (WHERE completed) AS completed_count
         FROM lesson_watch_progress GROUP BY lesson_id
       ) p ON p.lesson_id = le.id
       WHERE le.lecture_id = $1::uuid
       ORDER BY le.sort_order ASC`,
      [s.lecture_id],
    ),
  )

  await step('getLessonRetention (20 rows guaranteed)', async () => {
    const r = await c.query(
      `SELECT sg.i::int AS segment_index, COUNT(sv.user_id) AS viewers
       FROM generate_series(0, 19) AS sg(i)
       LEFT JOIN lesson_segment_viewers sv
              ON sv.segment_index = sg.i AND sv.lesson_id = $1::uuid
       GROUP BY sg.i ORDER BY sg.i ASC`,
      [s.lesson_id],
    )
    if (r.rows.length !== 20) throw new Error('expected 20 rows, got ' + r.rows.length)
    if (Number(r.rows[0].viewers) < 1) throw new Error('segment 0 should have a viewer')
  })

  await step('getLectureStudents', () =>
    c.query(
      `SELECT p.student_id, st.name, COUNT(*) AS lessons_viewed,
              SUM(p.watched_seconds) AS watch_seconds,
              AVG(p.max_percent) AS avg_completion,
              MAX(p.last_viewed_at) AS last_viewed_at
       FROM lesson_watch_progress p
       LEFT JOIN students st ON st.id = p.student_id
       WHERE p.lecture_id = $1::uuid
       GROUP BY p.student_id, st.name
       ORDER BY watch_seconds DESC NULLS LAST
       LIMIT $2`,
      [s.lecture_id, 50],
    ),
  )
}

await c.query('ROLLBACK')
await c.end()
console.log('\nRolled back — no data persisted.')
