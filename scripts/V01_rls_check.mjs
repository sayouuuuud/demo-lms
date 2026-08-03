// Verifies the analytics tables are invisible to students.
// Simulates what Supabase does for a logged-in student: role `authenticated`.
// Run: node --env-file-if-exists=/vercel/share/.env.project scripts/V01_rls_check.mjs
import { Client } from "pg"

const TABLES = ["lecture_views", "lesson_watch_progress", "lesson_segment_viewers"]

const client = new Client({ connectionString: process.env.DATABASE_URL })

let failures = 0
function ok(msg) {
  console.log("  OK   " + msg)
}
function fail(msg) {
  console.log("  FAIL " + msg)
  failures++
}

async function main() {
  await client.connect()

  console.log("\n--- RLS + GRANT STATE ---")
  const state = await client.query(
    `select c.relname, c.relrowsecurity,
            (select count(*) from pg_policies p where p.tablename = c.relname) as policies,
            (select count(*) from information_schema.role_table_grants g
              where g.table_name = c.relname and g.grantee in ('anon','authenticated')) as grants
       from pg_class c
      where c.relname = any($1::text[])`,
    [TABLES],
  )
  for (const r of state.rows) {
    if (!r.relrowsecurity) fail(`${r.relname}: RLS is OFF`)
    else if (Number(r.policies) !== 0) fail(`${r.relname}: has ${r.policies} policy(ies) — expected 0`)
    else if (Number(r.grants) !== 0) fail(`${r.relname}: granted to anon/authenticated — expected 0`)
    else ok(`${r.relname}: RLS on, 0 policies, 0 student grants`)
  }

  console.log("\n--- SELECT AS `authenticated` (student) ---")
  for (const t of TABLES) {
    await client.query("begin")
    try {
      await client.query("set local role authenticated")
      const res = await client.query(`select * from public.${t} limit 1`)
      fail(`${t}: student SELECT succeeded (${res.rowCount} row(s)) — DATA IS LEAKING`)
    } catch (e) {
      if (e.code === "42501") ok(`${t}: student SELECT denied (permission denied)`)
      else fail(`${t}: unexpected error ${e.code} ${e.message}`)
    }
    await client.query("rollback")
  }

  console.log("\n--- INSERT AS `authenticated` (student cannot forge views) ---")
  for (const t of TABLES) {
    await client.query("begin")
    try {
      await client.query("set local role authenticated")
      await client.query(`insert into public.${t} default values`)
      fail(`${t}: student INSERT succeeded — students could forge analytics`)
    } catch (e) {
      if (e.code === "42501") ok(`${t}: student INSERT denied`)
      else ok(`${t}: student INSERT blocked (${e.code})`)
    }
    await client.query("rollback")
  }

  console.log(
    failures === 0
      ? "\nPASS — analytics tables are fully hidden from students.\n"
      : `\n${failures} FAILURE(S) — students can see or write analytics.\n`,
  )
  await client.end()
  if (failures > 0) process.exit(1)
}

main().catch(async (e) => {
  console.error("ERR", e.message)
  try {
    await client.end()
  } catch {}
  process.exit(1)
})
