import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import fs from 'node:fs'

const p = new PrismaClient()

async function main() {
  const backup = JSON.parse(fs.readFileSync('.v0tmp/pw-backup.json', 'utf8'))
  const adminId = backup.id

  // 1) temp password for the test admin
  const hash = await bcrypt.hash('V0TempTest!2026', 10)
  await p.$executeRawUnsafe(
    `update auth.users set encrypted_password = $1, email_confirmed_at = coalesce(email_confirmed_at, now()) where id = $2::uuid`,
    hash,
    adminId,
  )
  console.log('temp password set for', backup.email)

  // 2) real lessons (need lecture_id since all 3 tables require it)
  const lessons = await p.$queryRawUnsafe(
    `select l.id as lesson_id, l.lecture_id, l.title
     from lessons l where l.lecture_id is not null limit 6`,
  )
  console.log('lessons:', lessons.length)
  if (!lessons.length) throw new Error('no lessons')

  // student_id -> students.id, user_id -> profiles/auth id. They differ.
  const students = await p.$queryRawUnsafe(
    `select s.id as student_id, s.user_id from students s
     where s.user_id is not null limit 8`,
  )
  const viewers = students.length
    ? students.map((s) => ({ userId: s.user_id, studentId: s.student_id }))
    : [{ userId: adminId, studentId: null }]
  console.log('viewers:', viewers.length)

  const devices = ['mobile', 'desktop', 'tablet']
  let views = 0,
    prog = 0,
    segs = 0

  for (let li = 0; li < lessons.length; li++) {
    const L = lessons[li]
    if (li >= 4) continue // last 2 lessons stay at 0 views -> "dead lectures" panel

    const n = [7, 5, 3, 1][li] ?? 1
    for (let vi = 0; vi < n; vi++) {
      const v = viewers[vi % viewers.length]
      const uid = v.userId
      const sid = v.studentId
      const daysAgo = vi % 6
      const hour = [9, 14, 20, 21, 20, 14, 20][vi % 7]
      const ts = new Date()
      ts.setDate(ts.getDate() - daysAgo)
      ts.setHours(hour, 15, 0, 0)
      const bucket = ts.toISOString().slice(0, 10) // matches view_bucket dedupe

      await p.$executeRawUnsafe(
        `insert into lecture_views
           (lecture_id, lesson_id, user_id, student_id, device, view_bucket, created_at)
         values ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6, $7)
         on conflict (user_id, lesson_id, view_bucket) do nothing`,
        L.lecture_id,
        L.lesson_id,
        uid,
        sid,
        devices[vi % 3],
        bucket,
        ts,
      )
      views++

      const pct = Math.max(8, 95 - li * 18 - vi * 6)
      const dur = 600
      const watched = Math.round((pct / 100) * dur)

      await p.$executeRawUnsafe(
        `insert into lesson_watch_progress
           (user_id, lesson_id, lecture_id, student_id, max_percent, watched_seconds,
            duration_seconds, views_count, completed, first_viewed_at, last_viewed_at)
         values ($1::uuid, $2::uuid, $3::uuid, $9::uuid, $4::smallint, $5, $6, 1, $7, $8, $8)
         on conflict (user_id, lesson_id) do update set
           max_percent = greatest(lesson_watch_progress.max_percent, excluded.max_percent),
           watched_seconds = greatest(lesson_watch_progress.watched_seconds, excluded.watched_seconds),
           duration_seconds = excluded.duration_seconds,
           completed = greatest(lesson_watch_progress.max_percent, excluded.max_percent) >= 90,
           last_viewed_at = excluded.last_viewed_at`,
        uid,
        L.lesson_id,
        L.lecture_id,
        pct,
        watched,
        dur,
        pct >= 90,
        ts,
        sid,
      )
      prog++

      // retention curve: segments 0..ceil(pct/10)-1
      const buckets = Math.ceil(pct / 10)
      for (let s = 0; s < buckets; s++) {
        await p.$executeRawUnsafe(
          `insert into lesson_segment_viewers (lesson_id, segment_index, user_id, created_at)
           values ($1::uuid, $2::smallint, $3::uuid, $4)
           on conflict (lesson_id, segment_index, user_id) do nothing`,
          L.lesson_id,
          s,
          uid,
          ts,
        )
        segs++
      }
    }
  }

  console.log(`seeded -> views:${views} progress:${prog} segments:${segs}`)
  for (const t of ['lecture_views', 'lesson_watch_progress', 'lesson_segment_viewers']) {
    const c = await p.$queryRawUnsafe(`select count(*)::int c from ${t}`)
    console.log(`  ${t}: ${c[0].c} rows`)
  }
}

main()
  .catch((e) => {
    console.error('ERROR:', e.message)
    process.exit(1)
  })
  .finally(() => p.$disconnect())
