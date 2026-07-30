# خطة تنفيذ إصلاحات لوحة التحكم (Admin + Student)

> **تعليمات للمنفّذ:** نفّذ المهام بالترتيب من T1 إلى T7. كل مهمة فيها الكود الكامل جاهز.
> لا تجتهد ولا تغيّر أي حاجة غير المكتوبة هنا. لا تعمل أي refactor إضافي.
> استخدم أداة `Write` للملفات الجديدة و`Edit` للتعديلات. اقرأ الملف بـ`Read` قبل أي `Edit`.
> كل المسارات مطلقة من `/vercel/share/v0-project`.

---

## ملخص الأخطاء اللي بنصلحها

| # | الخطأ | الملف |
|---|-------|-------|
| 1 | `AUTH_SECRET` ناقص | تم إصلاحه بالفعل — تجاهله |
| 2 | فحص الصلاحيات مكسور: `{ error }` قيمته truthy فالداشبورد بترسم و`stats` تبقى `undefined` | `components/dashboard/dashboard-shell.tsx` |
| 3 | "مبيعات اليوم" بتجمع الأوردرات + الطلاب الجدد مع بعض | `app/admin/dashboard/actions.ts` |
| 4 | مفيش أي `loading.tsx` ولا `error.tsx` في المشروع كله (صفر ملف) | ملفات جديدة |
| 5 | 18 استعلام داتابيز بالتتابع بدون `Promise.all` | `app/admin/dashboard/actions.ts` |
| 6 | اختلاف توقيت: SQL بيستخدم UTC وJS بيبني المفاتيح بتوقيت السيرفر المحلي | `lib/time-series.ts` + `actions.ts` |
| 7 | إيراد أكثر المحاضرات تقديري (`price × عدد الأوردرات`) بيتجاهل الأوردرات المرفوضة | `app/admin/dashboard/actions.ts` |
| 8 | استيرادات مش مستخدمة (`getRangeStartDate`, `monthKeyOf`) | `app/admin/dashboard/actions.ts` |

---

## T1 — إصلاح التوقيت في `lib/time-series.ts`

**الملف:** `/vercel/share/v0-project/lib/time-series.ts`

**السبب:** الداتابيز بتوقيت UTC والتطبيق مصري (UTC+3). `TO_CHAR(created_at)` بيقسّم بـUTC بينما `lastDays`/`lastMonths` بيبنوا المفاتيح بتوقيت Node المحلي. النتيجة إن بيانات النهاردة بتنزل في خانة يوم غلط. الحل: نثبّت التوقيت على `Africa/Cairo` في الطرفين.

**التنفيذ:** استخدم `Write` واستبدل **كل** محتوى الملف بالآتي:

```ts
// Shared helpers for building real, rolling monthly time-series used by the
// dashboard and reports charts. Buckets are keyed by `YYYY-MM` so payments and
// signups land in the correct calendar month instead of a hardcoded Jan–Jun.
//
// كل التقسيم الزمني مثبّت على توقيت القاهرة عشان الداتابيز بتخزن بـUTC
// والسيرفر ممكن يشتغل بأي توقيت. لازم أي SQL يقسّم بالتاريخ يستخدم
// `AT TIME ZONE APP_TIME_ZONE` عشان يطابق المفاتيح اللي بتتولد هنا.

export const APP_TIME_ZONE = 'Africa/Cairo'

export const AR_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
]

export const AR_DAYS = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
]

export type MonthBucket = { key: string; month: string; start: Date }
export type DayBucket = { key: string; day: string; start: Date }

// Shared options for the chart time-range dropdowns. Values are month counts
// the chart slices from a 12-month series.
export const RANGE_OPTIONS = [
  { label: 'آخر 3 أشهر', value: '3' },
  { label: 'آخر 6 أشهر', value: '6' },
  { label: 'آخر 12 شهر', value: '12' },
]

export const DAILY_RANGE_OPTIONS = [
  { label: 'آخر 7 أيام', value: '7' },
  { label: 'آخر 14 يوم', value: '14' },
  { label: 'آخر 30 يوم', value: '30' },
]

const pad = (n: number) => String(n).padStart(2, '0')

// en-CA يطلّع الصيغة YYYY-MM-DD فبنقدر نقسّمها مباشرة.
const zonedDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** يرجّع اليوم/الشهر/السنة لأي لحظة بتوقيت القاهرة. */
export function zonedParts(date: Date): { year: number; month: number; day: number } {
  const [year, month, day] = zonedDateFormatter.format(date).split('-').map(Number)
  return { year, month, day }
}

/** إزاحة توقيت القاهرة بالدقائق عند لحظة معينة (بتراعي التوقيت الصيفي). */
function zoneOffsetMinutes(at: Date): number {
  const name =
    new Intl.DateTimeFormat('en-US', {
      timeZone: APP_TIME_ZONE,
      timeZoneName: 'longOffset',
    })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+00:00'

  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name)
  if (!match) return 0
  const sign = match[1] === '-' ? -1 : 1
  return sign * (Number(match[2]) * 60 + Number(match[3]))
}

/**
 * اللحظة الحقيقية (UTC instant) اللي توافق 00:00 بتوقيت القاهرة ليوم معيّن.
 * دي اللي بتتبعت لـSQL كحد أدنى للفترة عشان الحدود تطابق التقسيم بالظبط.
 */
function zonedMidnight(year: number, month: number, day: number): Date {
  const guess = Date.UTC(year, month - 1, day)
  const offset = zoneOffsetMinutes(new Date(guess))
  return new Date(guess - offset * 60000)
}

/** مفتاح `YYYY-MM-DD` بتوقيت القاهرة. */
export function dayKeyOf(iso: string | Date): string {
  const { year, month, day } = zonedParts(new Date(iso))
  return `${year}-${pad(month)}-${pad(day)}`
}

/** مفتاح `YYYY-MM` بتوقيت القاهرة. */
export function monthKeyOf(iso: string | Date): string {
  const { year, month } = zonedParts(new Date(iso))
  return `${year}-${pad(month)}`
}

/** آخر `count` يوم (الأقدم → الأحدث)، آخرهم النهاردة بتوقيت القاهرة. */
export function lastDays(count: number): DayBucket[] {
  const today = zonedParts(new Date())
  const arr: DayBucket[] = []
  for (let i = count - 1; i >= 0; i--) {
    // Date.UTC بيتعامل مع الأرقام السالبة صح فبنعتمد عليه في طرح الأيام.
    const marker = new Date(Date.UTC(today.year, today.month - 1, today.day - i))
    const year = marker.getUTCFullYear()
    const month = marker.getUTCMonth() + 1
    const day = marker.getUTCDate()
    arr.push({
      key: `${year}-${pad(month)}-${pad(day)}`,
      day: `${day} ${AR_MONTHS[month - 1]}`,
      start: zonedMidnight(year, month, day),
    })
  }
  return arr
}

/** آخر `count` شهر (الأقدم → الأحدث)، آخرهم الشهر الحالي بتوقيت القاهرة. */
export function lastMonths(count: number): MonthBucket[] {
  const today = zonedParts(new Date())
  const arr: MonthBucket[] = []
  for (let i = count - 1; i >= 0; i--) {
    const marker = new Date(Date.UTC(today.year, today.month - 1 - i, 1))
    const year = marker.getUTCFullYear()
    const month = marker.getUTCMonth() + 1
    arr.push({
      key: `${year}-${pad(month)}`,
      month: AR_MONTHS[month - 1],
      start: zonedMidnight(year, month, 1),
    })
  }
  return arr
}

export function getRangeStartDate(range: string): Date {
  const { year, month, day } = zonedParts(new Date())
  switch (range) {
    case '7d':
      return zonedMidnight(year, month, day - 7)
    case '30d':
      return zonedMidnight(year, month, day - 30)
    case '3m':
      return zonedMidnight(year, month - 3, day)
    case '6m':
      return zonedMidnight(year, month - 6, day)
    case '12m':
      return zonedMidnight(year, month - 12, day)
    case 'all':
    default:
      return new Date(Date.UTC(2000, 0, 1))
  }
}

// Period-over-period percentage change, rounded to 1 decimal. Returns 0 when the
// previous value is 0 and there's no current value, and 100 when growing from 0.
export function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 1000) / 10
}
```

**تحقق:** `zonedMidnight` بتقبل أرقام خارج المدى (زي `day - 30` أو `month - 3`) لأن `Date.UTC` بيعمل normalize لوحده. متغيّرش ده.

---

## T2 — إعادة كتابة `app/admin/dashboard/actions.ts`

**الملف:** `/vercel/share/v0-project/app/admin/dashboard/actions.ts`

بيصلح أخطاء **3، 5، 6، 7، 8** مرة واحدة. استخدم `Write` واستبدل **كل** المحتوى بالآتي:

```ts
'use server'

import { prisma } from '@/lib/prisma'
import { hasResourceAccess } from '@/lib/auth-guard'
import { lastMonths, percentChange, lastDays, dayKeyOf, APP_TIME_ZONE } from '@/lib/time-series'
import { getRelativeTimeArabic } from '@/lib/utils'

export async function getDashboardData() {
  if (!(await hasResourceAccess('dashboard'))) {
    return { success: false as const, error: 'غير مسموح. لازم تكون أدمن.' }
  }

  // كل النوافذ الزمنية بتتحسب بتوقيت القاهرة (شوف lib/time-series.ts).
  const monthlyWindow = lastMonths(12)
  const monthlyWindowStart = monthlyWindow[0].start
  const dailyWindow = lastDays(30)
  const dailyWindowStart = dailyWindow[0].start

  const thisKey = monthlyWindow[monthlyWindow.length - 1].key
  const prevKey = monthlyWindow[monthlyWindow.length - 2].key

  // ملاحظة أداء: كل الاستعلامات مستقلة عن بعضها فبتتنفذ بالتوازي.
  // قبل كده كانت 18 استعلام بالتتابع وده كان سبب بطء الداشبورد الأساسي.
  const [
    studentsCount,
    monthlyCoursesCount,
    coursesCount,
    lessonsCount,
    latestStudents,
    latestLessons,
    topCoursesRaw,
    ordersSummary,
    ordersMonthly,
    studentsMonthly,
    baseStudentsQuery,
    ordersDaily,
    studentsDaily,
    viewsDaily,
    coursesThisMonthQuery,
    latestOrders,
    messagesData,
    topExams,
    submissionsSummary,
  ] = await Promise.all([
    prisma.students.count(),
    prisma.monthly_courses.count(),
    prisma.lectures.count(),
    prisma.lessons.count(),

    prisma.students.findMany({
      select: { name: true, email: true, created_at: true },
      orderBy: { created_at: 'desc' },
      take: 5,
    }),

    prisma.course_lessons.findMany({
      select: { title: true, created_at: true },
      orderBy: { created_at: 'desc' },
      take: 5,
    }),

    // أكثر المحاضرات: الإيراد بيتحسب من أسعار البنود المدفوعة فعلاً
    // (الأوردرات المقبولة بس) بدل price × عدد الأوردرات.
    prisma.$queryRaw<any[]>`
      SELECT
        l.title AS title,
        l.image AS image,
        COUNT(oi.id) AS students,
        COALESCE(SUM(oi.price), 0) AS revenue
      FROM lectures l
      JOIN order_items oi ON oi.lecture_id = l.id
      JOIN orders o ON o.id = oi.order_id AND o.status = 'approved'
      GROUP BY l.id, l.title, l.image
      ORDER BY students DESC
      LIMIT 5
    `,

    prisma.$queryRaw<any[]>`
      SELECT status, method, COUNT(*) as count, SUM(total) as sum_total
      FROM orders
      GROUP BY status, method
    `,

    prisma.$queryRaw<any[]>`
      SELECT
        TO_CHAR(created_at AT TIME ZONE ${APP_TIME_ZONE}, 'YYYY-MM') as month_key,
        SUM(total) as sum_total
      FROM orders
      WHERE status = 'approved' AND created_at >= ${monthlyWindowStart}
      GROUP BY 1
    `,

    prisma.$queryRaw<any[]>`
      SELECT
        TO_CHAR(created_at AT TIME ZONE ${APP_TIME_ZONE}, 'YYYY-MM') as month_key,
        COUNT(*) as count
      FROM students
      WHERE created_at >= ${monthlyWindowStart}
      GROUP BY 1
    `,

    prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM students WHERE created_at < ${monthlyWindowStart}
    `,

    prisma.$queryRaw<any[]>`
      SELECT
        TO_CHAR(created_at AT TIME ZONE ${APP_TIME_ZONE}, 'YYYY-MM-DD') as day_key,
        COUNT(*) as count
      FROM orders
      WHERE status = 'approved' AND created_at >= ${dailyWindowStart}
      GROUP BY 1
    `,

    prisma.$queryRaw<any[]>`
      SELECT
        TO_CHAR(created_at AT TIME ZONE ${APP_TIME_ZONE}, 'YYYY-MM-DD') as day_key,
        COUNT(*) as count
      FROM students
      WHERE created_at >= ${dailyWindowStart}
      GROUP BY 1
    `,

    prisma.$queryRaw<any[]>`
      SELECT day, views, uniques
      FROM get_views_daily(${dailyWindowStart.toISOString()}::timestamptz)
    `,

    prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM lectures
      WHERE TO_CHAR(created_at AT TIME ZONE ${APP_TIME_ZONE}, 'YYYY-MM') = ${thisKey}
    `,

    prisma.orders.findMany({
      select: {
        code: true,
        student_name: true,
        total: true,
        status: true,
        order_items: { select: { lecture_title: true }, take: 1 },
      },
      orderBy: { created_at: 'desc' },
      take: 5,
    }),

    prisma.messages.findMany({
      select: { content: true, created_at: true, is_read: true, sender_name: true },
      orderBy: { created_at: 'desc' },
      take: 5,
    }),

    prisma.exams.findMany({
      select: { title: true, avg_score: true },
      orderBy: { participants: 'desc' },
      take: 6,
    }),

    prisma.$queryRaw<any[]>`
      SELECT
        SUM(CASE WHEN grading_status = 'pending' THEN 1 ELSE 0 END) as pending_grading,
        COUNT(*) as total_scored,
        SUM(score) as sum_score,
        SUM(total) as sum_total,
        SUM(CASE WHEN (score / NULLIF(total, 0) * 100) >= e.pass_mark THEN 1 ELSE 0 END) as pass_count,
        SUM(CASE WHEN (score / NULLIF(total, 0) * 100) < e.pass_mark THEN 1 ELSE 0 END) as fail_count,
        SUM(CASE WHEN (score / NULLIF(total, 0) * 100) < 50 THEN 1 ELSE 0 END) as dist_0_49,
        SUM(CASE WHEN (score / NULLIF(total, 0) * 100) >= 50 AND (score / NULLIF(total, 0) * 100) < 70 THEN 1 ELSE 0 END) as dist_50_69,
        SUM(CASE WHEN (score / NULLIF(total, 0) * 100) >= 70 AND (score / NULLIF(total, 0) * 100) < 85 THEN 1 ELSE 0 END) as dist_70_84,
        SUM(CASE WHEN (score / NULLIF(total, 0) * 100) >= 85 THEN 1 ELSE 0 END) as dist_85_100
      FROM exam_submissions s
      JOIN exams e ON s.exam_id = e.id
      WHERE s.total > 0
    `,
  ])

  // --- تلخيص الأوردرات ---
  let totalRevenue = 0
  let pendingPaymentsCount = 0
  let pendingPaymentsAmount = 0
  const statusBucket: Record<string, number> = { 'مقبول': 0, 'قيد المراجعة': 0, 'مرفوض': 0 }
  const methodBucket: Record<string, number> = {}

  ordersSummary.forEach((row) => {
    const sum = Number(row.sum_total) || 0
    const count = Number(row.count) || 0
    if (row.status === 'approved') {
      totalRevenue += sum
      statusBucket['مقبول'] += count
      const m = row.method || 'غير محدد'
      methodBucket[m] = (methodBucket[m] || 0) + sum
    } else if (row.status === 'pending') {
      pendingPaymentsCount += count
      pendingPaymentsAmount += sum
      statusBucket['قيد المراجعة'] += count
    } else {
      statusBucket['مرفوض'] += count
    }
  })

  const paymentMethods = Object.entries(methodBucket)
    .map(([method, value], i) => ({ method, value, fill: `var(--chart-${(i % 5) + 1})` }))
    .sort((a, b) => b.value - a.value)

  const paymentStatus = [
    { name: 'مقبول', value: statusBucket['مقبول'] },
    { name: 'قيد المراجعة', value: statusBucket['قيد المراجعة'] },
    { name: 'مرفوض', value: statusBucket['مرفوض'] },
  ]

  // --- الإيراد الشهري ونمو الطلاب ---
  const revenueBucket: Record<string, number> = {}
  ordersMonthly.forEach((row) => {
    revenueBucket[row.month_key] = Number(row.sum_total) || 0
  })

  const signupsBucket: Record<string, number> = {}
  studentsMonthly.forEach((row) => {
    signupsBucket[row.month_key] = Number(row.count) || 0
  })

  let cumulativeStudents = Number(baseStudentsQuery[0]?.count) || 0

  const revenueData = monthlyWindow.map((b) => ({
    month: b.month,
    revenue: revenueBucket[b.key] || 0,
  }))

  const studentsData = monthlyWindow.map((b) => {
    cumulativeStudents += signupsBucket[b.key] || 0
    return { month: b.month, students: cumulativeStudents }
  })

  // --- النشاط اليومي ---
  // ordersDailyBucket = أوردرات بس (بتغذّي "مبيعات اليوم").
  // activityBucket = أوردرات + طلاب جداد (بتغذّي رسم نشاط المنصة).
  // لازم يفضلوا منفصلين: قبل كده "مبيعات اليوم" كانت بتحسب كل طالب بيسجل كأنه مبيعة.
  const ordersDailyBucket: Record<string, number> = {}
  ordersDaily.forEach((r) => {
    ordersDailyBucket[r.day_key] = (ordersDailyBucket[r.day_key] || 0) + Number(r.count)
  })

  const activityBucket: Record<string, number> = { ...ordersDailyBucket }
  studentsDaily.forEach((r) => {
    activityBucket[r.day_key] = (activityBucket[r.day_key] || 0) + Number(r.count)
  })

  const activityData = dailyWindow.map((b) => ({
    day: b.day,
    value: activityBucket[b.key] || 0,
  }))

  // --- المشاهدات والزيارات ---
  const viewsBucket: Record<string, number> = {}
  const uniquesBucket: Record<string, number> = {}
  let totalViews = 0
  let totalVisitors = 0

  viewsDaily.forEach((row) => {
    const k = dayKeyOf(row.day)
    const v = Number(row.views || 0)
    const u = Number(row.uniques || 0)
    viewsBucket[k] = v
    uniquesBucket[k] = u
    totalViews += v
    totalVisitors += u
  })

  const viewsData = dailyWindow.map((b) => ({
    label: b.day,
    views: viewsBucket[b.key] || 0,
    visitors: uniquesBucket[b.key] || 0,
  }))

  // --- المقارنات بالفترة السابقة ---
  const revThisMonth = revenueBucket[thisKey] || 0
  const revPrevMonth = revenueBucket[prevKey] || 0
  const stuThisMonth = signupsBucket[thisKey] || 0
  const stuPrevMonth = signupsBucket[prevKey] || 0

  const todayKey = dailyWindow[dailyWindow.length - 1].key
  const yesterdayKey = dailyWindow[dailyWindow.length - 2].key
  const salesToday = ordersDailyBucket[todayKey] || 0
  const salesYesterday = ordersDailyBucket[yesterdayKey] || 0

  const coursesThisMonth = Number(coursesThisMonthQuery[0]?.count) || 0

  const changes = {
    revenue: percentChange(revThisMonth, revPrevMonth),
    students: percentChange(stuThisMonth, stuPrevMonth),
    sales: percentChange(salesToday, salesYesterday),
    coursesThisMonth,
  }

  // --- آخر المدفوعات ---
  const latestPayments = latestOrders.map((o, i) => ({
    id: o.code ? (o.code.startsWith('#') ? o.code : `#${o.code}`) : `#PAY-${String(1000 + i)}`,
    name: o.student_name,
    course: o.order_items?.[0]?.lecture_title || 'طلب عام',
    amount: `${o.total} ج.م`,
    status: o.status === 'approved' ? 'ناجح' : o.status === 'pending' ? 'معلّق' : 'مرفوض',
  }))

  // --- آخر الرسائل ---
  const latestMessages = messagesData.map((m) => ({
    name: m.sender_name || 'طالب غير معروف',
    text: m.content,
    time: getRelativeTimeArabic(m.created_at),
    unread: !m.is_read,
  }))

  // --- تحليلات الامتحانات ---
  const examScores = topExams.map((e) => ({
    name: e.title && e.title.length > 16 ? e.title.slice(0, 16) + '…' : e.title || 'امتحان',
    avg: Math.round(Number(e.avg_score) || 0),
  }))

  const subStats = submissionsSummary[0] || {}
  const pendingGrading = Number(subStats.pending_grading) || 0
  const passCount = Number(subStats.pass_count) || 0
  const failCount = Number(subStats.fail_count) || 0
  const totalGraded = passCount + failCount
  const passRate = totalGraded > 0 ? Math.round((passCount / totalGraded) * 100) : 0

  const sumScore = Number(subStats.sum_score) || 0
  const sumTotal = Number(subStats.sum_total) || 0
  const avgScorePct = sumTotal > 0 ? Math.round((sumScore / sumTotal) * 100) : 0

  const passFailData = [
    { name: 'ناجح', key: 'pass', value: passCount },
    { name: 'راسب', key: 'fail', value: failCount },
  ]

  const scoreDistribution = [
    { range: '٤٩-٠٪', count: Number(subStats.dist_0_49) || 0 },
    { range: '٦٩-٥٠٪', count: Number(subStats.dist_50_69) || 0 },
    { range: '٨٤-٧٠٪', count: Number(subStats.dist_70_84) || 0 },
    { range: '١٠٠-٨٥٪', count: Number(subStats.dist_85_100) || 0 },
  ]

  return {
    success: true as const,
    examStats: { passRate, avgScorePct, pendingGrading, pendingPaymentsCount, pendingPaymentsAmount },
    examScores,
    passFailData,
    scoreDistribution,
    paymentMethods,
    paymentStatus,
    stats: {
      totalRevenue,
      totalStudents: studentsCount,
      totalMonthlyCourses: monthlyCoursesCount,
      totalCourses: coursesCount,
      totalLessons: lessonsCount,
      salesToday,
      changes,
    },
    revenueData,
    studentsData,
    activityData,
    viewsData,
    totalViews,
    totalVisitors,
    topCourses: topCoursesRaw.map((c) => ({
      title: c.title,
      students: `${Number(c.students) || 0} طالب`,
      revenue: `${Number(c.revenue) || 0} ج.م`,
      image: c.image || null,
    })),
    latestPayments,
    latestStudents: latestStudents.map((s) => ({
      name: s.name,
      email: s.email,
      time: getRelativeTimeArabic(s.created_at),
    })),
    latestLessons: latestLessons.map((l) => ({
      title: l.title,
      time: getRelativeTimeArabic(l.created_at),
      image: null,
    })),
    latestMessages,
  }
}
```

**نقاط مهمة متغيّرهاش:**
- `${APP_TIME_ZONE}` بيتبعت كـ parameter وده آمن ضد SQL injection. متكتبهوش كنص مباشر جوه الاستعلام.
- `latestCourses` كانت متعرّفة قبل كده ومش مستخدمة في الـreturn — تم حذفها بالكامل. متضيفهاش تاني.
- `todayKey`/`yesterdayKey` بقوا بييجوا من `dailyWindow` مباشرة بدل `new Date()` عشان يتطابقوا مع نفس نافذة التقسيم.

---

## T3 — إصلاح فحص الصلاحيات في `dashboard-shell.tsx`

**الملف:** `/vercel/share/v0-project/components/dashboard/dashboard-shell.tsx`

**السبب:** `if (!data)` بتفشل لأن `{ error: '...' }` قيمته truthy، فالداشبورد بترسم و`data.stats` تبقى `undefined`.

**التعديل 1** — استخدم `Edit`:

- `old_string`:
```tsx
export function DashboardShell({ data }: { data?: any }) {
  if (!data) return <PageHeader />
```
- `new_string`:
```tsx
export function DashboardShell({ data }: { data?: any }) {
  // `data` ممكن ترجع { success: false, error } من الأكشن لما الصلاحيات ناقصة.
  // الشرط القديم `if (!data)` كان بيفشل لأن الكائن نفسه truthy، فالداشبورد
  // كانت بترسم و data.stats تبقى undefined.
  if (!data || data.error || !data.stats) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card p-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-secondary">
            <ShieldAlert className="size-7 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
            {data?.error || 'مش قادرين نجيب بيانات لوحة التحكم دلوقتي. حاول تاني بعد شوية.'}
          </p>
        </div>
      </div>
    )
  }
```

**التعديل 2** — ضيف الاستيراد. استخدم `Edit`:

- `old_string`:
```tsx
import { PageHeader } from './page-header'
```
- `new_string`:
```tsx
import { ShieldAlert } from 'lucide-react'

import { PageHeader } from './page-header'
```

---

## T4 — إنشاء مكوّن `Skeleton`

**الملف الجديد:** `/vercel/share/v0-project/components/ui/skeleton.tsx`

**السبب:** مفيش `skeleton.tsx` في `components/ui/` خلاص، ومحتاجينه في T5 و T6.

استخدم `Write`:

```tsx
import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('animate-pulse rounded-md bg-secondary', className)}
      {...props}
    />
  )
}

export { Skeleton }
```

**تحقق قبل ما تكتب:** أكّد إن `cn` مصدّرة من `lib/utils` بـ`Grep` على `export function cn` أو `export const cn` في `/vercel/share/v0-project/lib/utils.ts`. لو الاسم مختلف، استخدم الاسم الموجود.

---

## T5 — حدود `loading` و `error` عامة للأدمن والطالب

المشروع فيه **صفر** ملف `loading.tsx` أو `error.tsx` مع 11 صفحة `force-dynamic`. أي تعتيلة في الداتابيز = كراش أبيض للمستخدم.

الملفات دي بتغطي كل الصفحات المتداخلة تحتها أوتوماتيك في App Router، فمش محتاج تضيف ملف لكل صفحة.

### 5.1 `/vercel/share/v0-project/app/admin/loading.tsx`

```tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">جاري تحميل الصفحة</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-lg" />
    </div>
  )
}
```

### 5.2 `/vercel/share/v0-project/app/admin/error.tsx`

لازم يكون `'use client'` — ده شرط في App Router.

```tsx
'use client'

import { useEffect } from 'react'
import { TriangleAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.log('[v0] admin route error:', error.message, error.digest)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-secondary">
        <TriangleAlert className="size-8 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground">حصلت مشكلة</h1>
        <p className="max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
          مش قادرين نحمّل الصفحة دي دلوقتي. جرّب تاني، ولو المشكلة كملت تواصل مع الدعم.
        </p>
      </div>
      <Button onClick={reset}>حاول تاني</Button>
    </div>
  )
}
```

### 5.3 `/vercel/share/v0-project/app/student/loading.tsx`

```tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">جاري تحميل الصفحة</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}
```

### 5.4 `/vercel/share/v0-project/app/student/error.tsx`

نفس محتوى `5.2` بالحرف، مع تغييرين بس:
- سطر الـlog يبقى: `console.log('[v0] student route error:', error.message, error.digest)`
- نص الوصف يبقى: `مش قادرين نحمّل الصفحة دي دلوقتي. جرّب تاني، ولو المشكلة كملت تواصل مع مدرّسك.`

---

## T6 — Skeleton مخصّص للداشبورد

**الملف الجديد:** `/vercel/share/v0-project/app/admin/dashboard/loading.tsx`

الداشبورد أثقل صفحة (19 استعلام) فمحتاجة skeleton يطابق شكلها الحقيقي من `dashboard-shell.tsx`.

```tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">جاري تحميل لوحة التحكم</span>

      {/* PageHeader */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* StatCards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>

      {/* AnalyticsKpis */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>

      {/* ViewsChart */}
      <Skeleton className="h-72 w-full rounded-lg" />

      {/* Row 1 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <Skeleton className="h-80 w-full rounded-lg xl:col-span-2" />
        <Skeleton className="h-80 w-full rounded-lg xl:col-span-1" />
        <Skeleton className="h-80 w-full rounded-lg xl:col-span-1" />
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <Skeleton className="h-80 w-full rounded-lg xl:col-span-1" />
        <Skeleton className="h-80 w-full rounded-lg xl:col-span-1" />
        <Skeleton className="h-80 w-full rounded-lg xl:col-span-2" />
      </div>

      {/* Row 5 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Skeleton className="h-72 w-full rounded-lg" />
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    </div>
  )
}
```

---

## T7 — التحقق

نفّذ الخطوات دي بالترتيب وصلّح أي مشكلة تظهر قبل ما تكمل.

### 7.1 فحص الأنواع
```bash
cd /vercel/share/v0-project && npx tsc --noEmit
```
**المتوقع:** صفر أخطاء. لو ظهر خطأ عن `getRangeStartDate` أو `monthKeyOf` مش مستخدمين — طبيعي إنهم لسه مصدّرين من `lib/time-series.ts` لأن ملفات تانية بتستخدمهم؛ متحذفهمش من الـexports.

### 7.2 فحص الصفحات
```bash
cd /vercel/share/v0-project && for p in / /login /admin/dashboard /admin/payments /student; do printf "%s -> " "$p"; curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000$p"; done
```
**المتوقع:** `200` أو `307` (تحويل لتسجيل الدخول). أي `500` = مشكلة لازم تتصلح.

### 7.3 فحص اللوجز
اقرأ `user_read_only_context/v0_debug_logs.log` وأكّد مفيش أخطاء جديدة. خد بالك من التواريخ — فيه لوجز قديمة من نسخ سابقة من الكود.

### 7.4 تحقق بصري في المتصفح
استخدم مهارة `agent-browser`. الـviewport بتاع المستخدم: **1216x726، dark mode**.

```bash
agent-browser open <preview-url> --color-scheme dark
agent-browser set viewport 1216 726
agent-browser screenshot /tmp/agent-browser/dashboard-after.png
```

أكّد الآتي:
- الداشبورد بترسم بالكامل، مفيش قسم فاضي أو مكسور.
- كارت **"مبيعات اليوم"** رقمه منطقي (أوردرات بس، مش أوردرات + طلاب).
- **"أكثر المحاضرات"** بتوري أرقام إيراد.
- لو الحساب مش أدمن، بتظهر رسالة "غير مسموح" بشكل واضح بدل صفحة فاضية.

### 7.5 لا تنسى
امسح ملف `PLAN.md` من جذر المشروع بعد ما تخلّص كل المهام.

---

## ملخص الملفات

| العملية | الملف |
|---------|-------|
| استبدال كامل | `lib/time-series.ts` |
| استبدال كامل | `app/admin/dashboard/actions.ts` |
| تعديلين | `components/dashboard/dashboard-shell.tsx` |
| جديد | `components/ui/skeleton.tsx` |
| جديد | `app/admin/loading.tsx` |
| جديد | `app/admin/error.tsx` |
| جديد | `app/admin/dashboard/loading.tsx` |
| جديد | `app/student/loading.tsx` |
| جديد | `app/student/error.tsx` |

**ممنوع تلمس:** أي حاجة في `prisma/schema.prisma`، `auth.ts`، `middleware.ts`، أو أي مكوّن chart. المزايا الجديدة (فلتر الفترة، التصدير، التنبيهات) **مش** جزء من الخطة دي.
