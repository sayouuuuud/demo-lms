import Link from 'next/link'
import { cn } from '@/lib/utils'

const OPTIONS = [
  { days: 7, label: 'آخر 7 أيام' },
  { days: 30, label: 'آخر 30 يوم' },
  { days: 90, label: 'آخر 90 يوم' },
] as const

export function RangeTabs({ active }: { active: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-muted p-1.5">
      {OPTIONS.map((o) => (
        <Link
          key={o.days}
          href={`/admin/analytics?days=${o.days}`}
          className={cn(
            'rounded-xl px-4 py-1.5 text-sm transition-colors',
            active === o.days
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </Link>
      ))}
    </div>
  )
}
