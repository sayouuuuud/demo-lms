export const reportStats = [
  { key: 'revenue', label: 'إجمالي الإيرادات', value: 255860, suffix: 'ج.م', change: 12.5, up: true },
  { key: 'students', label: 'طلاب جدد', value: 12560, suffix: 'طالب', change: 8.2, up: true },
  { key: 'enrollments', label: 'الاشتراكات', value: 3420, suffix: 'اشتراك', change: 5.1, up: true },
  { key: 'refunds', label: 'طلبات الاسترداد', value: 86, suffix: 'طلب', change: 2.3, up: false },
]

export const monthlyRevenue = [
  { month: 'يناير', revenue: 20000, target: 25000 },
  { month: 'فبراير', revenue: 32000, target: 30000 },
  { month: 'مارس', revenue: 41000, target: 38000 },
  { month: 'أبريل', revenue: 52430, target: 45000 },
  { month: 'مايو', revenue: 47000, target: 50000 },
  { month: 'يونيو', revenue: 63000, target: 55000 },
]

export const studentsGrowth = [
  { month: 'يناير', students: 4200 },
  { month: 'فبراير', students: 6100 },
  { month: 'مارس', students: 8100 },
  { month: 'أبريل', students: 9400 },
  { month: 'مايو', students: 10800 },
  { month: 'يونيو', students: 12560 },
]

export const categoryDistribution = [
  { name: 'البرمجة', value: 4200, fill: 'var(--chart-1)' },
  { name: 'التصميم', value: 2800, fill: 'var(--chart-2)' },
  { name: 'التسويق', value: 1900, fill: 'var(--chart-3)' },
  { name: 'اللغات', value: 1500, fill: 'var(--chart-4)' },
  { name: 'الأعمال', value: 1100, fill: 'var(--chart-5)' },
]

export type CoursePerformance = {
  title: string
  category: string
  students: number
  revenue: number
  share: number
}

export const coursePerformance: CoursePerformance[] = [
  { title: 'البرمجة باستخدام Python', category: 'البرمجة', students: 1250, revenue: 32450, share: 28 },
  { title: 'تصميم واجهات المستخدم UI/UX', category: 'التصميم', students: 980, revenue: 24300, share: 21 },
  { title: 'التسويق الرقمي الشامل', category: 'التسويق', students: 760, revenue: 18600, share: 16 },
  { title: 'تعلم اللغة الإنجليزية', category: 'اللغات', students: 650, revenue: 15200, share: 13 },
  { title: 'تحليل البيانات باستخدام Excel', category: 'الأعمال', students: 540, revenue: 12800, share: 11 },
  { title: 'أساسيات الذكاء الاصطناعي', category: 'البرمجة', students: 430, revenue: 11900, share: 10 },
]
