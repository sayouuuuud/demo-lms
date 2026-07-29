import {
  Code2,
  Palette,
  Megaphone,
  Languages,
  BarChart3,
  Briefcase,
  type LucideIcon,
} from 'lucide-react'

export type CategoryStatus = 'مفعّل' | 'متوقف'

export type CategoryRecord = {
  id: string
  name: string
  description: string
  courses: number
  students: number
  icon: LucideIcon
  // tailwind classes for the icon tile
  color: string
  bg: string
  status: CategoryStatus
}

export const categoryRecords: CategoryRecord[] = [
  {
    id: 'CAT-01',
    name: 'البرمجة',
    description: 'كورسات تطوير البرمجيات والويب والذكاء الاصطناعي',
    courses: 24,
    students: 3280,
    icon: Code2,
    color: 'text-primary',
    bg: 'bg-primary/10',
    status: 'مفعّل',
  },
  {
    id: 'CAT-02',
    name: 'التصميم',
    description: 'تصميم واجهات المستخدم والجرافيك والهوية البصرية',
    courses: 16,
    students: 1940,
    icon: Palette,
    color: 'text-pink-600',
    bg: 'bg-pink-50 dark:bg-pink-500/10',
    status: 'مفعّل',
  },
  {
    id: 'CAT-03',
    name: 'التسويق',
    description: 'التسويق الرقمي وإدارة الحملات ووسائل التواصل',
    courses: 12,
    students: 1520,
    icon: Megaphone,
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    status: 'مفعّل',
  },
  {
    id: 'CAT-04',
    name: 'اللغات',
    description: 'تعلم اللغات الأجنبية للمبتدئين والمحترفين',
    courses: 9,
    students: 1180,
    icon: Languages,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    status: 'مفعّل',
  },
  {
    id: 'CAT-05',
    name: 'تحليل البيانات',
    description: 'تحليل البيانات وأدوات Excel ولوحات المعلومات',
    courses: 7,
    students: 860,
    icon: BarChart3,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    status: 'مفعّل',
  },
  {
    id: 'CAT-06',
    name: 'الأعمال',
    description: 'إدارة المشاريع وريادة الأعمال والمهارات الإدارية',
    courses: 5,
    students: 540,
    icon: Briefcase,
    color: 'text-rose-600',
    bg: 'bg-rose-50 dark:bg-rose-500/10',
    status: 'متوقف',
  },
]
