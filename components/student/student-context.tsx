'use client'

import { createContext, useContext, ReactNode, useEffect } from 'react'
import { trackStudentDevice } from '@/app/student/actions'
import type {
  StudentProfileInfo,
  CourseProgress,
  ScheduleItem,
  GradeItem,
  Announcement,
  ActivityDay,
  Notification,
} from '@/lib/student-types'

type StudentData = {
  profile: StudentProfileInfo
  enrolledCourses?: CourseProgress[]
  schedule?: ScheduleItem[]
  grades?: GradeItem[]
  announcements?: Announcement[]
  activity?: ActivityDay[]
  notifications?: Notification[]
}

const StudentContext = createContext<StudentData | null>(null)

export function StudentProvider({ children, data }: { children: ReactNode, data: StudentData }) {
  useEffect(() => {
    trackStudentDevice().catch(console.error)
  }, [])

  return (
    <StudentContext.Provider value={data}>
      {children}
    </StudentContext.Provider>
  )
}

export function useStudent() {
  const ctx = useContext(StudentContext)
  if (!ctx) throw new Error('useStudent must be used within StudentProvider')
  return ctx
}
