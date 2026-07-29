export type CourseStatus = 'منشور' | 'مسودة' | 'مؤرشف'
export type CourseLevel = 'مبتدئ' | 'متوسط' | 'متقدم'

export type LessonType = 'درس' | 'واجب'

export type LessonRecord = {
  id: string
  order: number
  title: string
  type: LessonType
  duration: string
  // for assignments: عدد الأسئلة, for lessons: حالة النشر
  meta: string
  published: boolean
}

export type CourseRecord = {
  id: string
  title: string
  instructor: string
  category: string
  level: CourseLevel
  students: number
  lessons: number
  durationHours: number
  rating: number
  price: string
  status: CourseStatus
  image: string
}

export const courseRecords: CourseRecord[] = [
  {
    id: 'CRS-201',
    title: 'البرمجة باستخدام Python',
    instructor: 'م. كريم سعيد',
    category: 'البرمجة',
    level: 'مبتدئ',
    students: 1250,
    lessons: 48,
    durationHours: 32,
    rating: 4.9,
    price: '450 ج.م',
    status: 'منشور',
    image: '/courses/python.png',
  },
  {
    id: 'CRS-202',
    title: 'تصميم واجهات المستخدم UI/UX',
    instructor: 'أ. منى رشاد',
    category: 'التصميم',
    level: 'متوسط',
    students: 980,
    lessons: 36,
    durationHours: 28,
    rating: 4.8,
    price: '650 ج.م',
    status: 'منشور',
    image: '/courses/uiux.png',
  },
  {
    id: 'CRS-203',
    title: 'التسويق الرقمي الشامل',
    instructor: 'أ. أحمد فؤاد',
    category: 'التسويق',
    level: 'مبتدئ',
    students: 760,
    lessons: 30,
    durationHours: 22,
    rating: 4.6,
    price: '350 ج.م',
    status: 'منشور',
    image: '/courses/marketing.png',
  },
  {
    id: 'CRS-204',
    title: 'تعلم اللغة الإنجليزية',
    instructor: 'أ. سالي جورج',
    category: 'اللغات',
    level: 'مبتدئ',
    students: 650,
    lessons: 60,
    durationHours: 40,
    rating: 4.7,
    price: '300 ج.م',
    status: 'منشور',
    image: '/courses/english.png',
  },
  {
    id: 'CRS-205',
    title: 'تحليل البيانات باستخدام Excel',
    instructor: 'م. هشام عادل',
    category: 'تحليل البيانات',
    level: 'متوسط',
    students: 540,
    lessons: 24,
    durationHours: 18,
    rating: 4.5,
    price: '400 ج.م',
    status: 'منشور',
    image: '/courses/excel.png',
  },
  {
    id: 'CRS-206',
    title: 'دليل احتراف الجافاسكريبت',
    instructor: 'م. كريم سعيد',
    category: 'البرمجة',
    level: 'متقدم',
    students: 420,
    lessons: 52,
    durationHours: 38,
    rating: 4.8,
    price: '550 ج.م',
    status: 'منشور',
    image: '/courses/javascript.png',
  },
  {
    id: 'CRS-207',
    title: 'أساسيات الذكاء الاصطناعي',
    instructor: 'د. ليلى منصور',
    category: 'البرمجة',
    level: 'متقدم',
    students: 310,
    lessons: 44,
    durationHours: 34,
    rating: 4.9,
    price: '700 ج.م',
    status: 'مسودة',
    image: '/courses/ai.png',
  },
  {
    id: 'CRS-208',
    title: 'إدارة المشاريع الاحترافية',
    instructor: 'أ. طارق حلمي',
    category: 'الأعمال',
    level: 'متوسط',
    students: 180,
    lessons: 28,
    durationHours: 20,
    rating: 4.4,
    price: '500 ج.م',
    status: 'مسودة',
    image: '/courses/projects.png',
  },
]

export const courseStatusFilters: Array<{
  label: string
  value: CourseStatus | 'الكل'
}> = [
  { label: 'الكل', value: 'الكل' },
  { label: 'منشور', value: 'منشور' },
  { label: 'مسودة', value: 'مسودة' },
  { label: 'مؤرشف', value: 'مؤرشف' },
]

export function getCourseById(id: string): CourseRecord | undefined {
  return courseRecords.find((course) => course.id === id)
}

const lessonTitles = [
  'مقدمة ونظرة عامة',
  'إعداد بيئة العمل',
  'المفاهيم الأساسية',
  'التطبيق العملي الأول',
  'أمثلة وتمارين',
  'مشروع تطبيقي',
  'حل المشكلات الشائعة',
  'الخلاصة والمراجعة',
]

// Generates a sample list of lessons (دروس + واجبات) for a given course.
export function getCourseLessons(course: CourseRecord): LessonRecord[] {
  const count = Math.min(course.lessons, 8)
  const lessons: LessonRecord[] = []

  for (let i = 0; i < count; i++) {
    const isAssignment = i > 0 && (i + 1) % 3 === 0
    const order = i + 1
    if (isAssignment) {
      lessons.push({
        id: `${course.id}-A${order}`,
        order,
        title: `واجب ${order}: ${lessonTitles[i % lessonTitles.length]}`,
        type: 'واجب',
        duration: `${(order % 4) + 1} أسئلة`,
        meta: 'تسليم خلال 7 أيام',
        published: course.status === 'منشور',
      })
    } else {
      const minutes = 8 + ((order * 7) % 35)
      lessons.push({
        id: `${course.id}-L${order}`,
        order,
        title: `${lessonTitles[i % lessonTitles.length]}`,
        type: 'درس',
        duration: `${minutes}:00 دقيقة`,
        meta: course.status === 'منشور' ? 'منشور' : 'مسودة',
        published: course.status === 'منشور',
      })
    }
  }

  return lessons
}
