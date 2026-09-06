/**
 * scripts/convert-egp-to-omr.mjs
 *
 * ترحيل لمرة واحدة: تحويل المبالغ المخزّنة من الجنيه المصري (EGP)
 * إلى الريال العُماني (OMR) — العملة الأساسية الجديدة للمنصة.
 *
 * الاستخدام:
 *   node scripts/convert-egp-to-omr.mjs            → معاينة فقط (dry-run)
 *   node scripts/convert-egp-to-omr.mjs --write    → تنفيذ التحويل فعليًا
 *   node scripts/convert-egp-to-omr.mjs --write --rate=130
 *
 * سعر التحويل: 1 ر.ع = RATE ج.م (افتراضي 130، أو من OMR_TO_EGP_RATE /
 * NEXT_PUBLIC_OMR_TO_EGP_RATE). القيم الجديدة تُقرَّب لـ 3 خانات عشرية (البيسة).
 *
 * شغّل الترحيل قبل استقبال أسعار جديدة بالريال العُماني. التنفيذ الفعلي يتم
 * داخل transaction واحدة، ومعه علامة تمنع التقسيم مرتين. وضع المعاينة لا يكتب
 * أي شيء في قاعدة البيانات.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const args = process.argv.slice(2)
const WRITE = args.includes('--write')
const FORCE = args.includes('--force')
const rateArg = args.find((arg) => arg.startsWith('--rate='))
const configuredRate =
  rateArg?.split('=')[1] ??
  process.env.OMR_TO_EGP_RATE ??
  process.env.NEXT_PUBLIC_OMR_TO_EGP_RATE ??
  '130'
const RATE = Number(configuredRate)

if (!Number.isFinite(RATE) || RATE <= 0) {
  console.error('سعر تحويل غير صالح')
  process.exit(1)
}

const DECIMAL_COLUMNS = [
  { table: 'lectures', columns: ['price', 'old_price'] },
  { table: 'monthly_courses', columns: ['price', 'old_price'] },
  { table: 'order_items', columns: ['price'] },
  { table: 'orders', columns: ['total', 'subtotal', 'discount'] },
  { table: 'payments', columns: ['amount'] },
  { table: 'stages', columns: ['term_price', 'term_old_price'] },
  { table: 'terms', columns: ['price', 'old_price'] },
]

const STRING_COLUMNS = [
  { table: 'courses', column: 'price' },
  { table: 'students', column: 'spent' },
]

function parseAmount(raw) {
  if (raw == null) return null
  const match = String(raw).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/)
  if (!match) return null
  const value = Number(match[0])
  return Number.isFinite(value) ? value : null
}

function toOMR(egp) {
  return Math.round((egp / RATE) * 1000) / 1000
}

async function getMigrationMarker(db) {
  const table = await db.$queryRawUnsafe(
    `SELECT to_regclass('public._omr_migration') AS name`,
  )
  if (!table[0]?.name) return null

  const markers = await db.$queryRawUnsafe(
    `SELECT id, rate, done_at FROM public._omr_migration WHERE id = 1 LIMIT 1`,
  )
  return markers[0] ?? null
}

function assertCanRun(marker) {
  if (!marker || FORCE) return
  throw new Error(
    `تم الترحيل بالفعل في ${new Date(marker.done_at).toISOString()} بسعر ${marker.rate}. ` +
      'لن يتم تقسيم القيم مرة ثانية. استخدم --force فقط إذا كنت متأكدًا تمامًا.',
  )
}

async function convertValues(db, write) {
  for (const { table, columns } of DECIMAL_COLUMNS) {
    for (const column of columns) {
      const rows = await db.$queryRawUnsafe(
        `SELECT id, ${column} AS value FROM ${table} WHERE ${column} IS NOT NULL AND ${column} > 0`,
      )
      if (rows.length === 0) {
        console.log(`- ${table}.${column}: لا توجد صفوف للتحويل`)
        continue
      }

      console.log(
        `- ${table}.${column}: ${rows.length} صف — مثال: ${Number(rows[0].value)} ج.م → ${toOMR(Number(rows[0].value))} ر.ع`,
      )
      if (write) {
        await db.$executeRawUnsafe(
          `UPDATE ${table} SET ${column} = ROUND(${column} / $1::numeric, 3) WHERE ${column} IS NOT NULL AND ${column} > 0`,
          RATE,
        )
      }
    }
  }

  const coupons = await db.$queryRawUnsafe(
    `SELECT id, value FROM coupons WHERE type = $1 AND value > 0`,
    'مبلغ ثابت',
  )
  if (coupons.length === 0) {
    console.log('- coupons.value (مبلغ ثابت): لا توجد صفوف للتحويل')
  } else {
    console.log(
      `- coupons.value (مبلغ ثابت): ${coupons.length} صف — مثال: ${Number(coupons[0].value)} ج.م → ${toOMR(Number(coupons[0].value))} ر.ع`,
    )
    if (write) {
      await db.$executeRawUnsafe(
        `UPDATE coupons SET value = ROUND(value / $1::numeric, 3) WHERE type = $2 AND value > 0`,
        RATE,
        'مبلغ ثابت',
      )
    }
  }

  for (const { table, column } of STRING_COLUMNS) {
    const rows = await db.$queryRawUnsafe(
      `SELECT id, ${column} AS value FROM ${table} WHERE ${column} ILIKE '%ج.م%' OR ${column} ILIKE '%EGP%'`,
    )
    let converted = 0

    for (const row of rows) {
      const value = parseAmount(row.value)
      if (value == null || value <= 0) continue
      converted += 1

      if (converted <= 3) {
        console.log(`- ${table}.${column} مثال: "${row.value}" → "${toOMR(value)} ر.ع"`)
      }
      if (write) {
        await db.$executeRawUnsafe(
          `UPDATE ${table} SET ${column} = $1 WHERE id = $2`,
          `${toOMR(value)} ر.ع`,
          row.id,
        )
      }
    }

    console.log(
      converted === 0
        ? `- ${table}.${column}: لا توجد قيم EGP للتحويل`
        : `- ${table}.${column}: ${converted} صف سيُحوَّل`,
    )
  }
}

async function main() {
  console.log(`تحويل المبالغ من ج.م إلى ر.ع (سعر 1 ر.ع = ${RATE} ج.م)`)
  console.log(WRITE ? 'الوضع: تنفيذ فعلي (--write)' : 'الوضع: معاينة فقط (dry-run)')

  if (!WRITE) {
    assertCanRun(await getMigrationMarker(prisma))
    await convertValues(prisma, false)
    console.log('معاينة فقط — لم تتم أي كتابة. أعد التشغيل بعلم --write للتنفيذ الفعلي.')
    return
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.$queryRawUnsafe(
        `SELECT pg_advisory_xact_lock(hashtext('currency-egp-to-omr'))`,
      )
      await tx.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS public._omr_migration (
          id int PRIMARY KEY,
          rate numeric NOT NULL,
          done_at timestamptz NOT NULL DEFAULT now()
        )`,
      )
      assertCanRun(await getMigrationMarker(tx))

      await convertValues(tx, true)
      await tx.$executeRawUnsafe(
        `ALTER TABLE courses ALTER COLUMN price SET DEFAULT '0 ر.ع'`,
      )
      await tx.$executeRawUnsafe(
        `ALTER TABLE students ALTER COLUMN spent SET DEFAULT '0 ر.ع'`,
      )
      await tx.$executeRawUnsafe(`DELETE FROM public._omr_migration`)
      await tx.$executeRawUnsafe(
        `INSERT INTO public._omr_migration (id, rate) VALUES (1, $1::numeric)`,
        RATE,
      )
    },
    { maxWait: 10_000, timeout: 600_000 },
  )

  console.log('تم الترحيل بالكامل وتسجيل العلامة في _omr_migration.')
}

main()
  .catch((error) => {
    console.error('فشل الترحيل:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
