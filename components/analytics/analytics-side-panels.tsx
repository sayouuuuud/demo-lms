import Link from 'next/link'
import { AlertTriangle, Monitor } from 'lucide-react'
import type {
  DeadLecture,
  DeviceSlice,
  PeakHour,
} from '@/app/admin/analytics/queries'

export function DeadLecturesPanel({ rows }: { rows: DeadLecture[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 text-primary" />
        <h3 className="font-bold text-foreground">محاضرات بدون مشاهدات</h3>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        محتوى لم يفتحه أحد في هذه المدة.
      </p>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          كل المحاضرات لها مشاهدات. ممتاز.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-1">
          {rows.map((r) => (
            <li key={r.lectureId}>
              <Link
                href={`/admin/courses/${r.lectureId}`}
                className="block truncate rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
              >
                {r.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function DeviceSplitPanel({ rows }: { rows: DeviceSlice[] }) {
  const total = rows.reduce((s, r) => s + r.views, 0)

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Monitor className="size-4 text-primary" />
        <h3 className="font-bold text-foreground">الأجهزة</h3>
      </div>

      {total === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">لا توجد بيانات.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {rows.map((r) => {
            const pct = Math.round((r.views / total) * 100)
            return (
              <li key={r.device}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{r.device}</span>
                  <span className="text-muted-foreground tabular-nums">{pct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function PeakHoursPanel({ rows }: { rows: PeakHour[] }) {
  const max = Math.max(...rows.map((r) => r.views), 1)
  const hasData = rows.some((r) => r.views > 0)

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-bold text-foreground">أوقات الذروة</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        توزيع المشاهدات على ساعات اليوم بتوقيت القاهرة.
      </p>

      {!hasData ? (
        <p className="py-8 text-center text-sm text-muted-foreground">لا توجد بيانات.</p>
      ) : (
        <div className="mt-4 flex items-end justify-between gap-1" dir="ltr">
          {rows.map((r) => (
            <div key={r.hour} className="group flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-primary/70 transition-colors group-hover:bg-primary"
                style={{ height: `${Math.max((r.views / max) * 80, 2)}px` }}
                title={`${r.hour}:00 — ${r.views} مشاهدة`}
              />
              {r.hour % 6 === 0 && (
                <span className="text-[10px] text-muted-foreground tabular-nums">{r.hour}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
