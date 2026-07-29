export type ExamStatus = 'منشور' | 'مسودة' | 'منتهي'

export type ExamRecord = {
  id: string
  title: string
  course: string
  questions: number
  duration: number
  participants: number
  avgScore: number
  status: ExamStatus
  createdAt: string
}

export const examRecords: ExamRecord[] = [
  {
    id: 'EXM-2051',
    title: 'اختبار أساسيات البرمجة',
    course: 'مقدمة في البرمجة',
    questions: 25,
    duration: 45,
    participants: 320,
    avgScore: 78,
    status: 'منشور',
    createdAt: '14 يونيو 2024',
  },
  {
    id: 'EXM-2050',
    title: 'امتحان نهاية الوحدة الأولى',
    course: 'تطوير الويب المتقدم',
    questions: 40,
    duration: 60,
    participants: 215,
    avgScore: 71,
    status: 'منشور',
    createdAt: '12 يونيو 2024',
  },
  {
    id: 'EXM-2049',
    title: 'اختبار قواعد البيانات',
    course: 'قواعد البيانات العلائقية',
    questions: 30,
    duration: 50,
    participants: 184,
    avgScore: 66,
    status: 'منتهي',
    createdAt: '8 يونيو 2024',
  },
  {
    id: 'EXM-2048',
    title: 'كويز تصميم واجهات المستخدم',
    course: 'مبادئ UI/UX',
    questions: 15,
    duration: 20,
    participants: 142,
    avgScore: 84,
    status: 'منشور',
    createdAt: '5 يونيو 2024',
  },
  {
    id: 'EXM-2047',
    title: 'اختبار خوارزميات وهياكل البيانات',
    course: 'هياكل البيانات',
    questions: 35,
    duration: 70,
    participants: 98,
    avgScore: 59,
    status: 'منتهي',
    createdAt: '1 يونيو 2024',
  },
  {
    id: 'EXM-2046',
    title: 'امتحان مفاهيم الشبكات',
    course: 'أساسيات الشبكات',
    questions: 28,
    duration: 45,
    participants: 0,
    avgScore: 0,
    status: 'مسودة',
    createdAt: '28 مايو 2024',
  },
  {
    id: 'EXM-2045',
    title: 'كويز لغة بايثون',
    course: 'البرمجة بلغة بايثون',
    questions: 20,
    duration: 30,
    participants: 276,
    avgScore: 81,
    status: 'منشور',
    createdAt: '24 مايو 2024',
  },
  {
    id: 'EXM-2044',
    title: 'اختبار الأمن السيبراني',
    course: 'مقدمة في الأمن السيبراني',
    questions: 32,
    duration: 55,
    participants: 0,
    avgScore: 0,
    status: 'مسودة',
    createdAt: '20 مايو 2024',
  },
  {
    id: 'EXM-2043',
    title: 'امتحان التعلم الآلي',
    course: 'مقدمة في تعلم الآلة',
    questions: 45,
    duration: 90,
    participants: 67,
    avgScore: 62,
    status: 'منتهي',
    createdAt: '16 مايو 2024',
  },
]

export const examStatusFilters: Array<{ label: string; value: ExamStatus | 'الكل' }> = [
  { label: 'الكل', value: 'الكل' },
  { label: 'منشور', value: 'منشور' },
  { label: 'مسودة', value: 'مسودة' },
  { label: 'منتهي', value: 'منتهي' },
]
