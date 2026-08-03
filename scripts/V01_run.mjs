// شغّال V01_lecture_views.sql على الداتابيز.
// الاستخدام:
//   node --env-file-if-exists=/vercel/share/.env.project scripts/V01_run.mjs
// آمن للتشغيل أكثر من مرة (الـ SQL كله IF NOT EXISTS).
import pkg from 'pg'
import fs from 'node:fs'
import path from 'node:path'

const { Client } = pkg
const SQL_FILE = path.join(process.cwd(), 'prisma', 'sql', 'V01_lecture_views.sql')

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!connectionString) {
  console.error('✗ DATABASE_URL/DIRECT_URL غير موجود')
  process.exit(1)
}

const client = new Client({ connectionString })

async function run() {
  const sql = fs.readFileSync(SQL_FILE, 'utf-8')
  await client.connect()
  try {
    await client.query('BEGIN')
    await client.query(sql)
    await client.query('COMMIT')
    console.log('✓ V01_lecture_views.sql executed')

    const { rows } = await client.query(`
      SELECT c.relname AS table_name, c.relrowsecurity AS rls
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname IN ('lecture_views','lesson_watch_progress','lesson_segment_viewers')
      ORDER BY 1
    `)
    console.table(rows)
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('✗ Error:', e.message)
    process.exitCode = 1
  } finally {
    await client.end()
  }
}

run()
