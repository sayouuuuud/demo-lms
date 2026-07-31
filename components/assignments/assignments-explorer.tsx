'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import type { AdminAssignmentRow, AssignmentsFilters } from '@/app/admin/assignments/actions'
import type { AssignmentType } from '@/lib/assignments-shared'

const PAGE_SIZE = 20

type HealthFilter = 'all' | 'needs_grading' | 'low_rate' | 'overdue'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function groupRows(rows: AdminAssignmentRow[]) {
  const map = new Map<
    string,
    { key: string; label: string; rows: AdminAssignmentRow[] }
  >()
  for (const row of rows) {
    const key = `${row.stageId ?? 'unlinked'}__${row.branchId ?? 'unlinked'}__${row.courseId ?? 'unlinked'}`
    const parts = [row.stageTitle, row.branchTitle, row.courseTitle].filter(
      (p) => p && p !== '—',
    )
    const label = parts.join(' › ')
    const existing = map.get(key)
    if (existing) {
      existing.rows.push(row)
    } else {
      map.set(key, { key, label, rows: [row] })
    }
  }
  return Array.from(map.values())
}

function groupAvgRate(rows: AdminAssignmentRow[]) {
  const el = rows.reduce((a, r) => a + r.eligible, 0)
  const sl = rows.reduce((a, r) => a + r.submitted, 0)
  return el > 0 ? Math.round((sl / el) * 100) : 0
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AssignmentsExplorer({
  rows,
  filters,
}: {
  rows: AdminAssignmentRow[]
  filters: AssignmentsFilters
}) {
  const [stageId, setStageId] = useState<string>('all')
  const [branchId, setBranchId] = useState<string>('all')
  const [courseId, setCourseId] = useState<string>('all')
  const [type, setType] = useState<'all' | AssignmentType>('all')
  const [health, setHealth] = useState<HealthFilter>('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  // null = لسه المستخدم مافتحش/قفلش حاجة → افتح أول مجموعتين افتراضيًا
  const [openGroups, setOpenGroups] = useState<Set<string> | null>(null)

  // Filtered branches & courses cascading
  const availableBranches = useMemo(
    () => (stageId === 'all' ? filters.branches : filters.branches.filter((b) => b.stageId === stageId)),
    [stageId, filters.branches],
  )
  const availableCourses = useMemo(
    () => (branchId === 'all' ? filters.courses : filters.courses.filter((c) => c.branchId === branchId)),
    [branchId, filters.courses],
  )

  // Filtered rows
  const filteredRows = useMemo(() => {
    const now = new Date()
    return rows.filter((r) => {
      if (stageId !== 'all' && r.stageId !== stageId) return false
      if (branchId !== 'all' && r.branchId !== branchId) return false
      if (courseId !== 'all' && r.courseId !== courseId) return false
      if (type !== 'all' && r.type !== type) return false
      if (health === 'needs_grading' && r.submitted - r.graded <= 0) return false
      if (health === 'low_rate' && r.submissionRate >= 50) return false
      if (health === 'overdue') {
        if (!r.dueDate || new Date(r.dueDate) >= now || r.missing <= 0) return false
      }
      if (query) {
        const q = query.toLowerCase()
        if (
          !r.title.toLowerCase().includes(q) &&
          !r.code.toLowerCase().includes(q) &&
          !r.lectureTitle.toLowerCase().includes(q)
        )
          return false
      }
      return true
    })
  }, [rows, stageId, branchId, courseId, type, health, query])

  // Pagination on flat filtered rows
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const pagedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Group paged rows for accordion display
  const groups = useMemo(() => groupRows(pagedRows), [pagedRows])

  // الحالة الفعلية للمجموعات المفتوحة: مشتقّة، بدون side-effect في الرندر
  const effectiveOpen = useMemo(
    () => openGroups ?? new Set(groups.slice(0, 2).map((g) => g.key)),
    [openGroups, groups],
  )

  function toggleGroup(key: string) {
    setOpenGroups(() => {
      const next = new Set(effectiveOpen)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function resetFilters() {
    setStageId('all')
    setBranchId('all')
    setCourseId('all')
    setType('all')
    setHealth('all')
    setQuery('')
    setPage(1)
  }

  const hasFilters = stageId !== 'all' || branchId !== 'all' || courseId !== 'all' || type !== 'all' || health !== 'all' || query !== ''

  return (
    <div className="space-y-4">
      {/* Stage tabs */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="فلتر السنة">
        <button
          role="tab"
          aria-selected={stageId === 'all'}
          onClick={() => { setStageId('all'); setBranchId('all'); setCourseId('all'); setPage(1) }}
          className={cn(
            'rounded-full px-4 py-1.5 text-sm font-medium transition-colors border',
            stageId === 'all'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:bg-secondary',
          )}
        >
          كل السنوات
        </button>
        {filters.stages.map((s) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={stageId === s.id}
            onClick={() => { setStageId(s.id); setBranchId('all'); setCourseId('all'); setPage(1) }}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors border',
              stageId === s.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:bg-secondary',
            )}
          >
            {s.title}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="بحث بالعنوان أو الكود..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1) }}
              className="pr-9 bg-secondary/50"
              dir="rtl"
            />
          </div>

          {/* Branch */}
          {availableBranches.length > 0 && (
            <select
              value={branchId}
              onChange={(e) => { setBranchId(e.target.value); setCourseId('all'); setPage(1) }}
              className="h-10 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground outline-none focus:border-primary"
              aria-label="فلتر الفرع"
            >
              <option value="all">كل الفروع</option>
              {availableBranches.map((b) => (
                <option key={b.id} value={b.id}>{b.title}</option>
              ))}
            </select>
          )}

          {/* Course */}
          {availableCourses.length > 0 && (
            <select
              value={courseId}
              onChange={(e) => { setCourseId(e.target.value); setPage(1) }}
              className="h-10 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground outline-none focus:border-primary"
              aria-label="فلتر الكورس"
            >
              <option value="all">كل الكورسات</option>
              {availableCourses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          )}

          {/* Type */}
          <select
            value={type}
            onChange={(e) => { setType(e.target.value as typeof type); setPage(1) }}
            className="h-10 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground outline-none focus:border-primary"
            aria-label="فلتر النوع"
          >
            <option value="all">كل الأنواع</option>
            <option value="تسليم">تسليم</option>
            <option value="اختبار">اختبار</option>
          </select>

          {/* Health */}
          <select
            value={health}
            onChange={(e) => { setHealth(e.target.value as HealthFilter); setPage(1) }}
            className="h-10 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground outline-none focus:border-primary"
            aria-label="فلتر الحالة"
          >
            <option value="all">كل الحالات</option>
            <option value="needs_grading">محتاج تصحيح</option>
            <option value="low_rate">نسبة تسليم منخفضة</option>
            <option value="overdue">متأخر</option>
          </select>

          {hasFilters && (
            <Button variant="outline" size="sm" onClick={resetFilters} className="gap-1.5">
              <X className="size-3.5" />
              مسح الفلاتر
            </Button>
          )}
        </div>
      </Card>

      {/* Results */}
      {filteredRows.length === 0 ? (
        <Card className="p-12 flex flex-col items-center gap-3 text-center">
          <p className="text-muted-foreground">مفيش واجبات مطابقة للفلاتر.</p>
          {hasFilters && (
            <Button variant="outline" size="sm" onClick={resetFilters}>
              مسح الفلاتر
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const isOpen = effectiveOpen.has(group.key)
            const rate = groupAvgRate(group.rows)
            return (
              <Card key={group.key} className="overflow-hidden">
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="w-full flex items-center justify-between gap-4 p-4 hover:bg-secondary/40 transition-colors text-right"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-semibold text-foreground truncate">{group.label}</span>
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                      {group.rows.length} واجب
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Progress bar */}
                    <div className="hidden sm:flex items-center gap-2">
                      <div className="w-24 h-1.5 rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-left">{rate}%</span>
                    </div>
                    {isOpen
                      ? <ChevronUp className="size-4 text-muted-foreground shrink-0" />
                      : <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                    }
                  </div>
                </button>

                {/* Table */}
                {isOpen && (
                  <div className="border-t border-border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-secondary/30">
                          <TableHead className="text-right">الواجب</TableHead>
                          <TableHead className="text-right">النوع</TableHead>
                          <TableHead className="text-right hidden md:table-cell">المحاضرة</TableHead>
                          <TableHead className="text-right">التسليم</TableHead>
                          <TableHead className="text-right hidden lg:table-cell">تصحيح</TableHead>
                          <TableHead className="text-right hidden lg:table-cell">متأخر</TableHead>
                          <TableHead className="text-right hidden xl:table-cell">آخر ميعاد</TableHead>
                          <TableHead className="text-right hidden xl:table-cell">متوسط الدرجات</TableHead>
                          <TableHead className="text-right">إجراء</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.rows.map((row) => (
                          <TableRow key={row.id} className="hover:bg-secondary/20">
                            <TableCell>
                              <div>
                                <p className="font-medium text-foreground text-sm">{row.title}</p>
                                <p className="text-xs text-muted-foreground">{row.code}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-xs',
                                  row.type === 'اختبار'
                                    ? 'border-warning/40 text-warning'
                                    : 'border-primary/40 text-primary',
                                )}
                              >
                                {row.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-36 truncate">
                              {row.lectureTitle}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-medium text-foreground tabular-nums">
                                  {row.submitted}/{row.eligible}
                                </span>
                                <div className="w-16 h-1 rounded-full bg-border overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-primary"
                                    style={{ width: `${row.submissionRate}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground">{row.submissionRate}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {row.submitted - row.graded > 0 ? (
                                <span className="text-sm font-medium text-warning tabular-nums">
                                  {row.submitted - row.graded}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {row.late > 0 ? (
                                <span className="text-sm font-medium text-destructive tabular-nums">
                                  {row.late}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="hidden xl:table-cell text-sm text-muted-foreground whitespace-nowrap">
                              {row.dueDateLabel}
                            </TableCell>
                            <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                              {row.avgScorePercent != null ? `${row.avgScorePercent}%` : '—'}
                            </TableCell>
                            <TableCell>
                              <Link
                                href={`/admin/assignments/${row.id}`}
                                className="text-sm text-primary underline-offset-4 hover:underline whitespace-nowrap"
                              >
                                التفاصيل
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            )
          })}

          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(p) => { setPage(p); setOpenGroups(null) }}
            />
          )}
        </div>
      )}
    </div>
  )
}
