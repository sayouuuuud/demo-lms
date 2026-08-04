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
    ordersSummary,
    ordersMonthly,
    studentsMonthly,
    ordersDaily,
    studentsDaily,
    viewsDaily,
    coursesThisMonthQuery,
    latestOrders,
    messagesData,
    unreadMessagesCount,
    pendingGradingCount,
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

    // ملحوظة: "أكثر المحاضرات" اتشال من الداشبورد لأنه مكرر مع
    // CoursePerformanceTable في /admin/reports.
    prisma.$queryRaw<any[]>`
      SELECT status, COUNT(*) as count, SUM(total) as sum_total
      FROM orders
      GROUP BY status
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

    // عدّادات "محتاج إجراء منك". تحليل الدرجات الكامل (نسبة النجاح، التوزيع،
    // متوسط الدرجات) مكانه /admin/reports في ExamPerformanceAnalysis، فمابقاش
    // الداشبورد بتحسبه على الفاضي.
    prisma.messages.count({ where: { is_read: false } }),

    prisma.exam_submissions.count({ where: { grading_status: 'pending' } }),
  ])

  // --- تلخيص الأوردرات ---
  let totalRevenue = 0
  let pendingPaymentsCount = 0
  let pendingPaymentsAmount = 0

  ordersSummary.forEach((row) => {
    const sum = Number(row.sum_total) || 0
    const count = Number(row.count) || 0
    if (row.status === 'approved') {
      totalRevenue += sum
    } else if (row.status === 'pending') {
      pendingPaymentsCount += count
      pendingPaymentsAmount += sum
    }
  })

  // --- الإيراد الشهري ونمو الطلاب (للمقارنات فقط) ---
  // الرسومات نفسها بقت في /admin/reports، فبنحتفظ بالـ buckets عشان
  // نسب التغيّر في الكاردات بس ومبنبنيش arrays مش مستعملة.
  const revenueBucket: Record<string, number> = {}
  ordersMonthly.forEach((row) => {
    revenueBucket[row.month_key] = Number(row.sum_total) || 0
  })

  const signupsBucket: Record<string, number> = {}
  studentsMonthly.forEach((row) => {
    signupsBucket[row.month_key] = Number(row.count) || 0
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

  return {
    success: true as const,

    // "محتاج إجراء منك" — كل عنصر ليه رقم ولينك يودّي للصفحة اللي بتخلّص الشغل.
    actionQueue: {
      pendingPaymentsCount,
      pendingPaymentsAmount,
      pendingGrading: pendingGradingCount,
      unreadMessages: unreadMessagesCount,
    },

    stats: {
      totalRevenue,
      totalStudents: studentsCount,
      totalMonthlyCourses: monthlyCoursesCount,
      totalCourses: coursesCount,
      totalLessons: lessonsCount,
      salesToday,
      changes,
    },
    activityData,
    viewsData,
    totalViews,
    totalVisitors,
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
