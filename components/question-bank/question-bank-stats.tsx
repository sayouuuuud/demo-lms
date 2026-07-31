import { AlertTriangle, Archive, BookOpen, Layers } from 'lucide-react'

export type BankStats = {
  total: number
  byDifficulty: { easy: number; medium: number; hard: number }
  byType: { mcq: number; essay: number; file: number }
  archived: number
  unscoped: number
  unused: number
}

interface QuestionBankStatsProps {
  stats: BankStats
}

export function QuestionBankStats({ stats }: QuestionBankStatsProps) {
  const total = stats.total - stats.archived

  const difficultyBars: { label: string; count: number; cls: string }[] = [
    { label: 'سهل',   count: stats.byDifficulty.easy,   cls: 'bg-primary' },
    { label: 'متوسط', count: stats.byDifficulty.medium, cls: 'bg-yellow-500' },
    { label: 'صعب',   count: stats.byDifficulty.hard,   cls: 'bg-destructive' },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpen className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">الإجمالي النشط</p>
            <p className="text-2xl font-bold text-foreground">{total}</p>
          </div>
        </div>
        <div className="mt-3 space-y-1.5 text-xs">
          {difficultyBars.map(d => (
            <div key={d.label} className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-muted-foreground">{d.label}</span>
              <div className="flex-1 overflow-hidden rounded-full bg-secondary h-1.5">
                <div
                  className={`h-full rounded-full ${d.cls}`}
                  style={{ width: total > 0 ? `${(d.count / total) * 100}%` : '0%' }}
                />
              </div>
              <span className="w-6 shrink-0 text-right font-semibold text-foreground">{d.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* By type */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
            <Layers className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">حسب النوع</p>
          </div>
        </div>
        <dl className="mt-3 space-y-1 text-sm">
          {([['mcq','اختيار متعدد'], ['essay','مقالي'], ['file','ملف']] as const).map(([k, label]) => (
            <div key={k} className="flex justify-between">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-semibold text-foreground">{stats.byType[k]}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Unscoped */}
      <div className={`rounded-2xl border bg-card p-4 shadow-sm ${stats.unscoped > 0 ? 'border-yellow-500/40' : 'border-border'}`}>
        <div className="flex items-center gap-3">
          <div className={`flex size-9 items-center justify-center rounded-xl ${stats.unscoped > 0 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-secondary text-muted-foreground'}`}>
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">بدون نطاق</p>
            <p className="text-2xl font-bold text-foreground">{stats.unscoped}</p>
          </div>
        </div>
        {stats.unscoped > 0 && (
          <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
            لن تظهر هذه الأسئلة في التوليد التلقائي المقيّد بنطاق
          </p>
        )}
      </div>

      {/* Unused */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
            <Archive className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">غير مستخدمة</p>
            <p className="text-2xl font-bold text-foreground">{stats.unused}</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {stats.archived} مؤرشف — {stats.total} إجمالي في البنك
        </p>
      </div>
    </div>
  )
}
