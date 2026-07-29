import Link from 'next/link'
import { Megaphone } from 'lucide-react'
import { PanelCard } from '@/components/dashboard/panel-card'
import type { Announcement } from '@/lib/student-types'

export function Announcements({ announcements = [] }: { announcements?: Announcement[] }) {
  if (announcements.length === 0) {
    return (
      <PanelCard title="إعلانات و تنبيهات" action="عرض الكل" actionHref="/student/notifications">
        <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-secondary">
            <Megaphone className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">لا توجد إعلانات حديثة</p>
        </div>
      </PanelCard>
    )
  }

  return (
    <PanelCard title="إعلانات و تنبيهات" action="عرض الكل" actionHref="/student/notifications">
      <ul className="space-y-2">
        {announcements.map((item) => (
          <li key={item.id} className="flex gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Megaphone className="size-4" />
            </div>
            <div className="min-w-0 flex-1 border-b border-border pb-3 last:border-0 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {item.time}
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {item.text}
              </p>
              {item.course && (
                <span className="mt-1 inline-block text-[11px] font-medium text-primary">
                  {item.course}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </PanelCard>
  )
}
