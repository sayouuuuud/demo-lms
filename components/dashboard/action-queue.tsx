import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Clock, FileCheck, Inbox } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * "محتاج إجراء منك" — البانل الأساسي في الداشبورد.
 *
 * الفكرة إن الأدمن يعرف يعمل إيه دلوقتي مش يقرا أرقام صامتة. كل صف بيوصل
 * للصفحة اللي بتخلّص الشغل فعلاً، والصفوف اللي رقمها صفر بتتحرك لآخر الليستة
 * عشان اللي محتاج إجراء يبان أول حاجة.
 */
export function ActionQueue({ queue }: { queue?: any }) {
  const q = queue || {}

  const items = [
    {
      key: 'payments',
      label: 'مدفوعات بانتظار الموافقة',
      count: q.pendingPaymentsCount ?? 0,
      unit: 'طلب',
      sub: `${(q.pendingPaymentsAmount ?? 0).toLocaleString()} ج.م محجوزة`,
      href: '/admin/payments?status=pending',
      cta: 'راجع المدفوعات',
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
    },
    {
      key: 'grading',
      label: 'تسليمات محتاجة تصحيح',
      count: q.pendingGrading ?? 0,
      unit: 'تسليم',
      sub: 'تصحيح يدوي مطلوب',
      href: '/admin/exams',
      cta: 'ابدأ التصحيح',
      icon: FileCheck,
      color: 'text-rose-600',
      bg: 'bg-rose-50 dark:bg-rose-500/10',
    },
    {
      key: 'messages',
      label: 'رسائل مش مقروءة',
      count: q.unreadMessages ?? 0,
      unit: 'رسالة',
      sub: 'طلاب مستنيين رد',
      href: '/admin/messages',
      cta: 'افتح الرسائل',
      icon: Inbox,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
    },
  ].sort((a, b) => (b.count > 0 ? 1 : 0) - (a.count > 0 ? 1 : 0))

  const totalPending = items.reduce((sum, i) => sum + i.count, 0)

  return (
    <Card className="ns-card gap-0 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-foreground">محتاج إجراء منك</h3>
        {totalPending > 0 ? (
          <span className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
            {totalPending.toLocaleString()} بند مفتوح
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/10">
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            كله متابع
          </span>
        )}
      </div>

      <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {items.map((item) => {
          const isClear = item.count === 0
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                className={cn(
                  'group flex h-full flex-col rounded-xl border p-4 transition-colors',
                  isClear
                    ? 'border-border bg-secondary/40 hover:bg-secondary'
                    : 'border-primary/20 bg-primary/[0.04] hover:bg-primary/[0.08]',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-pretty text-sm font-medium leading-relaxed text-muted-foreground">
                    {item.label}
                  </p>
                  <div
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-xl',
                      isClear ? 'bg-secondary' : item.bg,
                    )}
                  >
                    <item.icon
                      className={cn(
                        'size-4.5',
                        isClear ? 'text-muted-foreground' : item.color,
                      )}
                      aria-hidden="true"
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-baseline gap-1.5">
                  <span
                    className={cn(
                      'text-3xl font-bold',
                      isClear ? 'text-muted-foreground' : 'text-foreground',
                    )}
                  >
                    {item.count.toLocaleString()}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {item.unit}
                  </span>
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  {isClear ? 'مفيش حاجة مستنية' : item.sub}
                </p>

                <span
                  className={cn(
                    'mt-4 flex items-center gap-1 text-xs font-semibold',
                    isClear ? 'text-muted-foreground' : 'text-primary',
                  )}
                >
                  {isClear ? 'اتفرّج' : item.cta}
                  <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
