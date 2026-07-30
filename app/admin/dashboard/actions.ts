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
