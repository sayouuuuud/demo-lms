'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  Award,
  Bell,
  BellOff,
  BookOpen,
  Check,
  CheckCheck,
  ClipboardList,
  FileText,
  Info,
  MessageSquare,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  type NotificationType,
} from '@/lib/student-notifications-data'
import {
  markStudentNotificationRead,
  markAllStudentNotificationsRead,
} from '@/app/student/actions'

type Notification = {
  id: string
  notifId?: string
  title: string
  text: string
  type: NotificationType
  read: boolean
  time: string
}

const typeConfig: Record<
  NotificationType,
  { label: string; icon: typeof Bell; color: string; bg: string }
> = {
  lesson: {
    label: 'الدروس',
    icon: BookOpen,
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  exam: {
    label: 'الاختبارات',
    icon: ClipboardList,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
  },
  assignment: {
    label: 'الواجبات',
    icon: FileText,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
  },
  grade: {
    label: 'الدرجات',
    icon: TrendingUp,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
  },
  message: {
    label: 'الرسائل',
    icon: MessageSquare,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-500/10',
  },
  certificate: {
    label: 'الشهادات',
    icon: Award,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-500/10',
  },
  system: {
    label: 'النظام',
    icon: Info,
    color: 'text-muted-foreground',
    bg: 'bg-secondary',
  },
}

type Filter = 'all' | 'unread' | NotificationType

export function StudentNotificationsPage({ notifications: initNotifications = [] }: { notifications?: Notification[] }) {
  const [items, setItems] = useState<Notification[]>(initNotifications)
  const [filter, setFilter] = useState<Filter>('all')
  const [, startTransition] = useTransition()

  const unreadCount = items.filter((n) => !n.read).length

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'الكل' },
    { key: 'unread', label: `غير مقروء (${unreadCount})` },
    { key: 'lesson', label: 'الدروس' },
    { key: 'exam', label: 'الاختبارات' },
    { key: 'assignment', label: 'الواجبات' },
    { key: 'grade', label: 'الدرجات' },
  ]

  const filtered = useMemo(() => {
    if (filter === 'all') return items
    if (filter === 'unread') return items.filter((n) => !n.read)
    return items.filter((n) => n.type === filter)
  }, [items, filter])

  const markAllRead = () => {
    const ids = items.filter((n) => !n.read && n.notifId).map((n) => n.notifId!)
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    startTransition(async () => {
      await markAllStudentNotificationsRead(ids)
    })
    toast.success('تم تعيين كل الإشعارات كمقروءة')
  }
  const markRead = (id: string) => {
    const item = items.find((n) => n.id === id)
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    if (item?.notifId) {
      startTransition(async () => {
        await markStudentNotificationRead(item.notifId!)
      })
    }
  }
  const remove = (id: string) => {
    const item = items.find((n) => n.id === id)
    setItems((prev) => prev.filter((n) => n.id !== id))
    // "Remove" from the student's view = mark it read so it won't reappear.
    if (item?.notifId) {
      startTransition(async () => {
        await markStudentNotificationRead(item.notifId!)
      })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground">الإشعارات</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0
              ? `لديك ${unreadCount} إشعارات غير مقروءة.`
              : 'لا توجد إشعارات غير مقروءة.'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllRead}>
            <CheckCheck className="size-4" />
            تعيين الكل كمقروء
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-lg border px-4 py-2 text-xs font-semibold transition-colors',
              filter === f.key
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-secondary/60 text-muted-foreground hover:bg-secondary',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 p-16 text-center">
          <BellOff className="size-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">لا توجد إشعارات في هذا التصنيف.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((n) => {
            const cfg = typeConfig[n.type] ?? typeConfig.system
            const Icon = cfg.icon
            return (
              <Card
                key={n.id}
                className={cn(
                  'group flex flex-row items-start gap-4 p-4 transition-shadow hover:shadow-md',
                  !n.read && 'border-primary/30 bg-primary/[0.03]',
                )}
              >
                <div
                  className={cn(
                    'flex size-11 shrink-0 items-center justify-center rounded-xl',
                    cfg.bg,
                  )}
                >
                  <Icon className={cn('size-5', cfg.color)} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                      {n.title}
                      {!n.read && (
                        <span className="size-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </h3>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {n.time}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {n.text}
                  </p>

                  <div className="mt-2 flex items-center gap-3">
                    {!n.read && (
                      <button
                        onClick={() => markRead(n.id)}
                        className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <Check className="size-3.5" />
                        تعيين كمقروء
                      </button>
                    )}
                    <button
                      onClick={() => remove(n.id)}
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                      حذف
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
