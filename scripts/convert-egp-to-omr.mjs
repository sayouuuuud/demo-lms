/**
 * scripts/convert-egp-to-omr.mjs
 *
 * ترحيل لمرة واحدة: تحويل كل المبالغ المخزّنة من الجنيه المصري (EGP)
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
 * الحماية من التشغيل مرتين: جدول علامة _omr_migration — لو موجود وتم
 * الترحيل قبل كده، السكريبت يرفض يشتغل تاني إلا بعلم --force.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const args = process.argv.slice(2)
const WRITE = args.includes('--write')
const FORCE = args.includes('--force')
const rateArg = args.find((a) => a.startsWith('--rate='))
const RATE =
  Number(rateArg?.split('=')[1]) ||
  Number(process.env.OMR_TO_EGP_RATE) ||
  Number(process.env.NEXT_PUBLIC_OMR_TO_EGP_RATE) ||
  130

if (!Number.isFinite(RATE) || RATE <= 0) {
  console.error('سعر تحويل غير صالح')
  process.exit(1)
}

/** أعمدة Decimal تُقسم على السعر مباشرة في SQL */
const DECIMAL_COLUMNS = [
  { table: 'lectures', columns: ['price', 'old_price'] },
  { table: 'monthly_courses', columns: ['price', 'old_price'] },
  { table: 'order_items', columns: ['price'] },
  { table: 'orders', columns: ['total', 'subtotal', 'discount'] },
  { table: 'payments', columns: ['amount'] },
  { table: 'stages', columns: ['term_price', 'term_old_price'] },
  { table: 'terms', columns: ['price', 'old_price'] },
]

/** أعمدة نصية تحتوي رقمًا + لاحقة عملة — تُحوَّل صفًا صفًا */
const STRING_COLUMNS = [
  { table: 'courses', column: 'price' },
  { table: 'students', column: 'spent' },
]

function parseAmount(raw) {
  if (raw == null) return null
  const match = String(raw).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/)
  if (!match) return null
  const n = Number(match[0])
  return Number.isFinite(n) ? n : null
}

function toOMR(egp) {
  return Math.round((egp / RATE) * 1000) / 1000
}

async function main() {
  console.log(`تحويل المبالغ من ج.م إلى ر.ع (سعر 1 ر.ع = ${RATE} ج.م)`)
  console.log(WRITE ? 'الوضع: تنفيذ فعلي (--write)' : 'الوضع: معاينة فقط (dry-run)')

  // ── علامة الترحيل ──
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS _omr_migration (id int primary key, rate numeric, done_at timestamptz default now())`,
  )
  const marker = await prisma.$queryRawUnsafe(`SELECT id, rate, done_at FROM _omr_migration LIMIT 1`)
  if (marker.length > 0 && !FORCE) {
    console.error(
      `تم الترحيل بالفعل في ${new Date(marker[0].done_at).toISOString()} بسعر ${marker[0].rate}.` +
        ` استخدم --force لتشغيله مرة أخرى (غير موصى به — سيقسم القيم مرة ثانية!).`,
    )
    process.exit(1)
  }

  // ── الأعمدة العشرية ──
  for (const { table, columns } of DECIMAL_COLUMNS) {
    for (const col of columns) {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT id, ${col} AS v FROM ${table} WHERE ${col} IS NOT NULL AND ${col} > 0`,
      )
      if (rows.length === 0) {
        console.log(`- ${table}.${col}: لا توجد صفوف للتحويل`)
        continue
      }
      const sample = rows[0]
      console.log(
        `- ${table}.${col}: ${rows.length} صف — مثال: ${Number(sample.v)} ج.م → ${toOMR(Number(sample.v))} ر.ع`,
      )
      if (WRITE) {
        await prisma.$executeRawUnsafe(
          `UPDATE ${table} SET ${col} = ROUND(${col} / ${RATE}, 3) WHERE ${col} IS NOT NULL AND ${col} > 0`,
        )
      }
    }
  }

  // ── الكوبونات ذات المبلغ الثابت (النسب المئوية لا تُمس) ──
  const coupons = await prisma.$queryRawUnsafe(
    `SELECT id, value FROM coupons WHERE type = 'مبلغ ثابت' AND value > 0`,
  )
  if (coupons.length > 0) {
    console.log(
      `- coupons.value (مبلغ ثابت): ${coupons.length} صف — مثال: ${Number(coupons[0].value)} ج.م → ${toOMR(Number(coupons[0].value))} ر.ع`,
    )
    if (WRITE) {
      await prisma.$executeRawUnsafe(
        `UPDATE coupons SET value = ROUND(value / ${RATE}, 3) WHERE type = 'مبلغ ثابت' AND value > 0`,
      )
    }
  } else {
    console.log('- coupons.value (مبلغ ثابت): لا توجد صفوف للتحويل')
  }

  // ── الأعمدة النصية ──
  for (const { table, column } of STRING_COLUMNS) {
    const rows = await prisma.$queryRawUnsafe(`SELECT id, ${column} AS v FROM ${table}`)
    let converted = 0
    for (const row of rows) {
      const n = parseAmount(row.v)
      if (n == null || n <= 0) continue
      converted++
      if (converted <= 3) {
        console.log(`- ${table}.${column} مثال: "${row.v}" → "${toOMR(n)} ر.ع"`)
      }
      if (WRITE) {
        await prisma.$executeRawUnsafe(
          `UPDATE ${table} SET ${column} = $1 WHERE id = $2`,
          `${toOMR(n)} ر.ع`,
          row.id,
        )
      }
    }
    if (converted === 0) console.log(`- ${table}.${column}: لا توجد صفوف للتحويل`)
    else console.log(`- ${table}.${column}: ${converted} صف سيُحوَّل`)
  }

  // ── تسجيل العلامة ──
  if (WRITE) {
    await prisma.$executeRawUnsafe(`DELETE FROM _omr_migration`)
    await prisma.$executeRawUnsafe(`INSERT INTO _omr_migration (id, rate) VALUES (1, ${RATE})`)
    console.log('تم الترحيل وتسجيل العلامة في _omr_migration.')
  } else {
    console.log('معاينة فقط — أعد التشغيل بعلم --write للتنفيذ الفعلي.')
  }
}

main()
  .catch((e) => {
    console.error('فشل الترحيل:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
