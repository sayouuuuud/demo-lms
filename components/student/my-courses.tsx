import Image from 'next/image'
import Link from 'next/link'
import { PanelCard } from '@/components/dashboard/panel-card'
import { BookOpen } from 'lucide-react'
import type { CourseProgress } from '@/lib/student-types'

export function MyCourses({ courses = [] }: { courses?: CourseProgress[] }) {
  if (courses.length === 0) {
    return (
      <PanelCard title="كورساتي" action="عرض الكل" actionHref="/student/courses">
        <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-secondary">
            <BookOpen className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">لم تسجّل في أي كورس بعد</p>
        </div>
      </PanelCard>
    )
  }

  return (
    <PanelCard title="كورساتي" action="عرض الكل" actionHref="/student/courses">
      <ul className="space-y-0.5">
        {courses.map((course) => {
          const percent = course.totalLessons > 0
            ? Math.round((course.completedLessons / course.totalLessons) * 100)
            : 0
          return (
            <li key={course.id}>
              <Link
                href={`/student/courses/${course.id}`}
                className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-secondary/60"
              >
                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg">
                  <Image
                    src={course.image || '/placeholder.svg'}
                    alt={course.title}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {course.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{course.instructor}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-xs font-medium text-muted-foreground">
                      {percent}%
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </PanelCard>
  )
}
