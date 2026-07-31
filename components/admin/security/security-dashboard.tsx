'use client'

import { useState, useTransition, useCallback, useEffect } from 'react'
import {
  Monitor,
  ShieldOff,
  ShieldAlert,
  Activity,
  RefreshCw,
  Search,
  ChevronDown,
  X,
  Globe,
  Smartphone,
  Tablet,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Modal } from '@/components/ui/modal'
import { Textarea } from '@/components/ui/textarea'
import {
  adminRemoveDevice,
  adminSetScore,
  adminUnblock,
  adminBlock,
  adminRevokeAllSessions,
  handleRemovalRequest,
  recalcSecurityScores,
  getStudentSecurityDetail,
  listStudentSecurity,
  listSecurityEvents,
} from '@/app/admin/security/actions'

// ---------------------------------------------------------------------------
// Types (inlined to avoid server-only imports)
// ---------------------------------------------------------------------------

type Overview = {
  totalDevices: number
  blockedStudents: number
  atRiskStudents: number
  eventsToday: number
  pendingRequests: number
  avgScore: number
  geoEnabled: boolean
  geoCallsLast30Days: number
}

type StudentRow = {
  studentId: string
  name: string
  code: string
  stageTitle: string
  score: number
  blocked: boolean
  blockedReason: string
  deviceCount: number
  lastCity: string
  lastCountry: string
  lastEventLabel: string
  lastEventAt: Date | null
}

type EventRow = {
  id: string
  student_id: string
  event_type: string
  severity: string
  score_delta: number
  score_after: number
  ip: string
  city: string
  country: string
  details: any
  created_at: Date
  students: { name: string; code: string }
}

type RequestRow = {
  id: string
  student_id: string
  reason: string
  status: string
  created_at: Date
  students: { name: string; code: string }
  device: { label: string; browser: string; os: string }
}

type DeviceDetail = {
  id: string
  label: string
  browser: string
  os: string
  device_type: string
  last_ip: string
  last_city: string
  last_country: string
  last_active_at: Date
  login_count: number
  status: string
}

type SessionDetail = {
  id: string
  ip: string
  city: string
  started_at: Date
  last_seen_at: Date
  revoked_at: Date | null
  device: { label: string } | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EVENT_LABELS: Record<string, string> = {
  newDevice: 'جهاز جديد',
  deviceLimit: 'تجاوز حد الأجهزة',
  concurrent: 'دخول متزامن',
  cityChange: 'تغيّر مدينة',
  countryChange: 'تغيّر دولة',
  impossibleTravel: 'انتقال غير منطقي',
  proxy: 'بروكسي / VPN',
  ipChurn: 'تغيّر IPs كثير',
  adminAdjust: 'تعديل إداري',
  adminUnblock: 'فك حظر',
  adminRemoveDevice: 'إزالة جهاز',
  autoBlock: 'حظر تلقائي',
  recovery: 'تعافي',
}

function scoreLabel(score: number): { label: string; tone: 'success' | 'warning' | 'destructive' } {
  if (score >= 80) return { label: 'آمن', tone: 'success' }
  if (score >= 55) return { label: 'مراقَب', tone: 'warning' }
  return { label: 'خطر', tone: 'destructive' }
}

function formatRelativeAr(date: Date | string | null | undefined): string {
  if (!date) return 'غير معروف'
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `قبل ${mins} دقيقة`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `قبل ${hrs} ساعة`
  const days = Math.floor(hrs / 24)
  return `قبل ${days} يوم`
}

function scoreBadgeClass(tone: 'success' | 'warning' | 'destructive') {
  if (tone === 'success') return 'bg-success/15 text-success border-success/30'
  if (tone === 'warning') return 'bg-warning/15 text-warning border-warning/30'
  return 'bg-destructive/15 text-destructive border-destructive/30'
}

function severityBadgeClass(severity: string) {
  if (severity === 'critical') return 'bg-destructive/15 text-destructive border-destructive/30'
  if (severity === 'warn') return 'bg-warning/15 text-warning border-warning/30'
  return 'bg-muted text-muted-foreground border-border'
}

// ---------------------------------------------------------------------------
// Stat widget
// ---------------------------------------------------------------------------
function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  tone?: 'destructive' | 'warning' | 'default'
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-xl',
            tone === 'destructive' && 'bg-destructive/10 text-destructive',
            tone === 'warning' && 'bg-warning/10 text-warning',
            (!tone || tone === 'default') && 'bg-primary/10 text-primary',
          )}
        >
          <Icon className="size-5" aria-hidden />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Score bar
// ---------------------------------------------------------------------------
function ScoreBar({ score }: { score: number }) {
  const { tone } = scoreLabel(score)
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border">
        <div
          className={cn(
            'h-full rounded-full',
            tone === 'success' && 'bg-success',
            tone === 'warning' && 'bg-warning',
            tone === 'destructive' && 'bg-destructive',
          )}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-sm font-medium tabular-nums">{score}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Confirm dialog with note
// ---------------------------------------------------------------------------
function ConfirmDialog({
  open,
  title,
  description,
  needsNote,
  notePlaceholder,
  destructive,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  description: string
  needsNote?: boolean
  notePlaceholder?: string
  destructive?: boolean
  onConfirm: (note: string) => void
  onClose: () => void
}) {
  const [note, setNote] = useState('')
  return (
    <Modal open={open} onClose={onClose} title={title} description={description} className="max-w-sm">
      {needsNote && (
        <Textarea
          placeholder={notePlaceholder ?? 'ملاحظة (اختياري)'}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mb-4"
          rows={3}
        />
      )}
      <div className="flex justify-start gap-2">
        <Button
          onClick={() => { onConfirm(note); setNote('') }}
          variant={destructive ? 'destructive' : 'default'}
        >
          تأكيد
        </Button>
        <Button variant="outline" onClick={onClose}>إلغاء</Button>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Score editor dialog
// ---------------------------------------------------------------------------
function ScoreDialog({
  open,
  studentId,
  currentScore,
  onClose,
  onDone,
}: {
  open: boolean
  studentId: string
  currentScore: number
  onClose: () => void
  onDone: () => void
}) {
  const [score, setScore] = useState(String(currentScore))
  const [note, setNote] = useState('')
  const [pending, start] = useTransition()

  function submit() {
    start(async () => {
      const res = await adminSetScore(studentId, Number(score), note)
      if (res.error) { toast.error(res.error); return }
      toast.success('تم تعديل السكور.')
      onDone()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>تعديل السكور الأمني</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="mb-1 block text-sm font-medium">السكور (0 – 100)</label>
            <Input
              type="number"
              min={0}
              max={100}
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">ملاحظة</label>
            <Textarea
              placeholder="سبب التعديل"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>
          <Button onClick={submit} disabled={pending} className="w-full">
            {pending ? 'جارٍ الحفظ...' : 'حفظ'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Student devices modal
// ---------------------------------------------------------------------------
function StudentDevicesModal({
  studentId,
  open,
  onClose,
}: {
  studentId: string | null
  open: boolean
  onClose: () => void
}) {
  const [data, setData] = useState<{
    devices: DeviceDetail[]
    sessions: SessionDetail[]
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [pending, start] = useTransition()
  const [confirm, setConfirm] = useState<{ deviceId: string; label: string } | null>(null)

  const load = useCallback(async () => {
    if (!studentId) return
    setLoading(true)
    const res = await getStudentSecurityDetail(studentId)
    if (!('error' in res)) {
      setData({ devices: res.devices as DeviceDetail[], sessions: res.sessions as SessionDetail[] })
    }
    setLoading(false)
  }, [studentId])

  // Load details when the dialog opens (details-on-demand, not initial page data)
  useEffect(() => {
    if (!open || !studentId) return
    load()
  }, [open, studentId, load])

  function DeviceIcon({ type }: { type: string }) {
    if (type === 'موبايل') return <Smartphone className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    if (type === 'تابلت') return <Tablet className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    return <Monitor className="size-4 shrink-0 text-muted-foreground" aria-hidden />
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setData(null) } }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>أجهزة الطالب</DialogTitle>
        </DialogHeader>

        {loading && <p className="py-8 text-center text-muted-foreground">جارٍ التحميل...</p>}

        {!loading && data && (
          <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-1">
            {/* Devices */}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">الأجهزة</h3>
              {data.devices.length === 0 && (
                <p className="text-sm text-muted-foreground">مفيش أجهزة.</p>
              )}
              <div className="space-y-2">
                {data.devices.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                  >
                    <DeviceIcon type={d.device_type} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{d.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.last_city || d.last_country
                          ? `${d.last_city} · ${d.last_country}`
                          : 'موقع غير معروف'}{' '}
                        · آخر نشاط: {formatRelativeAr(d.last_active_at)} · {d.login_count} دخول
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={d.status === 'active' ? 'border-success/30 text-success' : 'border-border text-muted-foreground'}
                    >
                      {d.status === 'active' ? 'نشط' : 'محذوف'}
                    </Badge>
                    {d.status === 'active' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setConfirm({ deviceId: d.id, label: d.label })}
                        aria-label={`إزالة جهاز ${d.label}`}
                      >
                        إزالة
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Sessions */}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">آخر 20 جلسة</h3>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">الجهاز</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">IP</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">بدأت</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">آخر ظهور</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sessions.map((s) => (
                      <tr key={s.id} className="border-t border-border">
                        <td className="px-3 py-2 text-foreground">{s.device?.label ?? '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{s.ip || '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{formatRelativeAr(s.started_at)}</td>
                        <td className="px-3 py-2 text-muted-foreground">{formatRelativeAr(s.last_seen_at)}</td>
                        <td className="px-3 py-2">
                          {s.revoked_at ? (
                            <Badge variant="outline" className="border-destructive/30 text-destructive text-xs">ملغاة</Badge>
                          ) : (
                            <Badge variant="outline" className="border-success/30 text-success text-xs">نشطة</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={!!confirm}
          title="إزالة ��لجهاز"
          description={`هل تريد إزالة "${confirm?.label}"؟ سيتم إبطال جلساته.`}
          needsNote
          notePlaceholder="سبب الإزالة"
          destructive
          onConfirm={(note) => {
            if (!confirm) return
            setConfirm(null)
            start(async () => {
              const res = await adminRemoveDevice(confirm.deviceId, note)
              if (res.error) { toast.error(res.error); return }
              toast.success('تم إزالة الجهاز.')
              load()
            })
          }}
          onClose={() => setConfirm(null)}
        />
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------
export function SecurityDashboard({
  overview,
  initialStudents,
  initialEvents,
  initialRequests,
}: {
  overview: Overview | null
  initialStudents: { rows: StudentRow[]; total: number }
  initialEvents: { rows: EventRow[]; total: number }
  initialRequests: { rows: RequestRow[] }
}) {
  type TabId = 'students' | 'requests' | 'events'
  const [tab, setTab] = useState<TabId>('students')
  const [pending, start] = useTransition()

  // Students tab state
  const [students, setStudents] = useState(initialStudents)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'blocked' | 'atRisk'>('all')
  const [studentsLoading, setStudentsLoading] = useState(false)

  // Events tab state
  const [events, setEvents] = useState(initialEvents)
  const [eventFilter, setEventFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [eventsPage, setEventsPage] = useState(1)
  const [eventsLoading, setEventsLoading] = useState(false)

  // Requests state
  const [requests, setRequests] = useState(initialRequests)

  // Modals / dialogs
  const [devicesModal, setDevicesModal] = useState<string | null>(null)
  const [scoreModal, setScoreModal] = useState<StudentRow | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    action: 'block' | 'unblock' | 'revoke'
    studentId: string
    studentName: string
  } | null>(null)
  const [requestConfirm, setRequestConfirm] = useState<{
    requestId: string
    action: 'approve' | 'reject'
  } | null>(null)

  async function reloadStudents(s = search, f = filter) {
    setStudentsLoading(true)
    const res = await listStudentSecurity({ search: s, filter: f, page: 1 })
    if (!('error' in res)) setStudents(res)
    setStudentsLoading(false)
  }

  async function reloadEvents(type = eventFilter, sev = severityFilter, page = 1) {
    setEventsLoading(true)
    const res = await listSecurityEvents({
      type: type || undefined,
      severity: sev || undefined,
      page,
      pageSize: 30,
    })
    if (!('error' in res)) setEvents(res)
    setEventsPage(page)
    setEventsLoading(false)
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    reloadStudents()
  }

  // Tab labels
  const TABS: { id: TabId; label: string; count?: number }[] = [
    { id: 'students', label: 'الطلاب والسكور' },
    { id: 'requests', label: 'طلبات الإزالة', count: requests.rows.length },
    { id: 'events', label: 'السجل الأمني' },
  ]

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الأمان والأجهزة</h1>
          <p className="text-sm text-muted-foreground">إدارة أجهزة الطلاب والسكور الأمني وطلبات الإزالة</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => {
            start(async () => {
              const res = await recalcSecurityScores()
              if (res.error) { toast.error(res.error); return }
              toast.success(`تم تحديث ${res.processed} حساب.`)
              reloadStudents()
            })
          }}
          className="gap-2"
        >
          <RefreshCw className={cn('size-4', pending && 'animate-spin')} aria-hidden />
          تحديث الحسابات
        </Button>
      </div>

      {/* Stats */}
      {overview && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="أجهزة مسجّلة" value={overview.totalDevices} icon={Monitor} />
          <StatCard label="طلاب محظورين" value={overview.blockedStudents} icon={ShieldOff} tone="destructive" />
          <StatCard label="تحت المراقبة" value={overview.atRiskStudents} icon={ShieldAlert} tone="warning" />
          <StatCard label="أحداث اليوم" value={overview.eventsToday} icon={Activity} />
          {overview.pendingRequests > 0 && (
            <Card className="rounded-2xl border-warning/30 bg-warning/5">
              <CardContent className="flex items-center gap-3 p-4">
                <ShieldAlert className="size-5 text-warning" aria-hidden />
                <p className="text-sm font-medium">
                  طلبات إزالة معلّقة:{' '}
                  <span className="font-bold text-warning">{overview.pendingRequests}</span>
                </p>
              </CardContent>
            </Card>
          )}
          {overview.geoEnabled && (
            <Card className="rounded-2xl">
              <CardContent className="flex items-center gap-3 p-4">
                <Globe className="size-5 text-primary" aria-hidden />
                <p className="text-sm font-medium">
                  استدعاءات الموقع (30 يوم):{' '}
                  <span className="font-bold">{overview.geoCallsLast30Days}</span>
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-muted/30 p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors',
              tab === t.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
            {t.count != null && t.count > 0 && (
              <span className="rounded-full bg-warning text-warning-foreground px-1.5 py-0.5 text-xs font-bold">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* TAB: Students */}
      {/* ------------------------------------------------------------------ */}
      {tab === 'students' && (
        <Card className="rounded-2xl">
          <CardHeader className="border-b border-border pb-3">
            <div className="flex flex-wrap items-center gap-3">
              <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-48">
                <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  placeholder="بحث بالاسم أو الكود..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pe-9"
                />
              </form>
              <div className="flex gap-1">
                {(['all', 'blocked', 'atRisk'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => { setFilter(f); reloadStudents(search, f) }}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                      filter === f
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80',
                    )}
                  >
                    {f === 'all' ? 'الكل' : f === 'blocked' ? 'محظور' : 'تحت المراقبة'}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {studentsLoading ? (
              <p className="py-10 text-center text-muted-foreground">جارٍ التحميل...</p>
            ) : students.rows.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">لا توجد نتائج.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/40 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">الطالب</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">السنة</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">السكور</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">الأجهزة</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">آخر موقع</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">الحالة</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.rows.map((row) => {
                      const sl = scoreLabel(row.score)
                      return (
                        <tr key={row.studentId} className="border-t border-border hover:bg-muted/20">
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground">{row.name}</p>
                            <p className="text-xs text-muted-foreground">{row.code}</p>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{row.stageTitle || '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <ScoreBar score={row.score} />
                              <Badge variant="outline" className={cn('w-fit text-xs', scoreBadgeClass(sl.tone))}>
                                {sl.label}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-foreground">{row.deviceCount}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => setDevicesModal(row.studentId)}
                                aria-label={`عرض أجهزة ${row.name}`}
                              >
                                عرض
                              </Button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {row.lastCity || row.lastCountry
                              ? `${row.lastCity}${row.lastCity && row.lastCountry ? ' · ' : ''}${row.lastCountry}`
                              : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {row.blocked ? (
                              <Badge variant="outline" className="border-destructive/30 text-destructive text-xs">محظور</Badge>
                            ) : (
                              <Badge variant="outline" className="border-success/30 text-success text-xs">نشط</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 flex-wrap">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => setScoreModal(row)}
                                aria-label={`تعديل سكور ${row.name}`}
                              >
                                تعديل السكور
                              </Button>
                              {row.blocked ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-success hover:text-success"
                                  onClick={() => setConfirmDialog({ action: 'unblock', studentId: row.studentId, studentName: row.name })}
                                  aria-label={`فك حظر ${row.name}`}
                                >
                                  فك الحظر
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                                  onClick={() => setConfirmDialog({ action: 'block', studentId: row.studentId, studentName: row.name })}
                                  aria-label={`حظر ${row.name}`}
                                >
                                  حظر
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-warning hover:text-warning"
                                onClick={() => setConfirmDialog({ action: 'revoke', studentId: row.studentId, studentName: row.name })}
                                aria-label={`إنهاء جلسات ${row.name}`}
                              >
                                إنهاء الجلسات
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {students.total > students.rows.length && (
              <p className="px-4 py-3 text-sm text-muted-foreground border-t border-border">
                يُعرض {students.rows.length} من {students.total}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB: Removal requests */}
      {/* ------------------------------------------------------------------ */}
      {tab === 'requests' && (
        <div className="space-y-3">
          {requests.rows.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="py-10 text-center text-muted-foreground">
                لا توجد طلبات إزالة معلّقة.
              </CardContent>
            </Card>
          ) : (
            requests.rows.map((req) => (
              <Card key={req.id} className="rounded-2xl">
                <CardContent className="flex flex-wrap items-start justify-between gap-4 p-4">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">
                      {req.students.name}{' '}
                      <span className="text-xs text-muted-foreground">({req.students.code})</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      الجهاز: {req.device.label} ({req.device.browser} / {req.device.os})
                    </p>
                    {req.reason && (
                      <p className="text-sm text-foreground">السبب: {req.reason}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{formatRelativeAr(req.created_at)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 border-success/30 text-success hover:bg-success/10"
                      disabled={pending}
                      onClick={() => setRequestConfirm({ requestId: req.id, action: 'approve' })}
                      aria-label="موافقة على الطلب"
                    >
                      <Check className="size-3.5" aria-hidden />
                      موافقة
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                      disabled={pending}
                      onClick={() => setRequestConfirm({ requestId: req.id, action: 'reject' })}
                      aria-label="رفض الطلب"
                    >
                      <X className="size-3.5" aria-hidden />
                      رفض
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB: Events */}
      {/* ------------------------------------------------------------------ */}
      {tab === 'events' && (
        <Card className="rounded-2xl">
          <CardHeader className="border-b border-border pb-3">
            <div className="flex flex-wrap gap-3">
              <select
                value={eventFilter}
                onChange={(e) => { setEventFilter(e.target.value); reloadEvents(e.target.value, severityFilter) }}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
                aria-label="فلتر نوع الحدث"
              >
                <option value="">كل الأنواع</option>
                {Object.entries(EVENT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <select
                value={severityFilter}
                onChange={(e) => { setSeverityFilter(e.target.value); reloadEvents(eventFilter, e.target.value) }}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
                aria-label="فلتر الخطورة"
              >
                <option value="">كل الخطورة</option>
                <option value="info">معلوماتي</option>
                <option value="warn">تحذير</option>
                <option value="critical">خطير</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {eventsLoading ? (
              <p className="py-10 text-center text-muted-foreground">جارٍ التحميل...</p>
            ) : events.rows.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">لا توجد أحداث.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/40 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">الطالب</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">الحدث</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">الخطورة</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">التغيير</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">التفاصيل</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">الوقت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.rows.map((ev) => {
                      const details = ev.details as Record<string, any> ?? {}
                      let detailText = ''
                      if (details.from && details.to) detailText = `من ${details.from} إلى ${details.to}`
                      else if (details.label) detailText = details.label
                      else if (details.km) detailText = `${details.km} كم خلال ${details.hours} ساعة`
                      else if (details.distinctIps) detailText = `${details.distinctIps} عناوين IP`

                      return (
                        <tr key={ev.id} className="border-t border-border hover:bg-muted/20">
                          <td className="px-4 py-3">
                            <p className="font-medium">{ev.students?.name ?? '—'}</p>
                            <p className="text-xs text-muted-foreground">{ev.students?.code}</p>
                          </td>
                          <td className="px-4 py-3 text-foreground">
                            {EVENT_LABELS[ev.event_type] ?? ev.event_type}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={cn('text-xs', severityBadgeClass(ev.severity))}>
                              {ev.severity === 'critical' ? 'خطير' : ev.severity === 'warn' ? 'تحذير' : 'معلوماتي'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 tabular-nums">
                            {ev.score_delta !== 0 && (
                              <span className={ev.score_delta < 0 ? 'text-destructive' : 'text-success'}>
                                {ev.score_delta > 0 ? '+' : ''}{ev.score_delta}
                              </span>
                            )}
                            <span className="text-muted-foreground text-xs ms-1">→{ev.score_after}</span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs max-w-[180px] truncate">
                            {detailText || '—'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                            {formatRelativeAr(ev.created_at)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {events.total > events.rows.length && (
              <div className="flex justify-center border-t border-border p-3">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={eventsLoading}
                  onClick={() => reloadEvents(eventFilter, severityFilter, eventsPage + 1)}
                  className="gap-1"
                >
                  <ChevronDown className="size-4" aria-hidden />
                  تحميل المزيد
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Modals */}
      {/* ------------------------------------------------------------------ */}
      <StudentDevicesModal
        studentId={devicesModal}
        open={!!devicesModal}
        onClose={() => setDevicesModal(null)}
      />

      {scoreModal && (
        <ScoreDialog
          open
          studentId={scoreModal.studentId}
          currentScore={scoreModal.score}
          onClose={() => setScoreModal(null)}
          onDone={() => { setScoreModal(null); reloadStudents() }}
        />
      )}

      <ConfirmDialog
        open={confirmDialog?.action === 'block'}
        title="حظر الطالب"
        description={`هل تريد حظر "${confirmDialog?.studentName}"؟ سيتم إبطال كل جلساته.`}
        needsNote
        notePlaceholder="سبب الحظر (مطلوب، 3 أحرف على الأقل)"
        destructive
        onConfirm={(note) => {
          if (!confirmDialog) return
          const id = confirmDialog.studentId
          setConfirmDialog(null)
          start(async () => {
            const res = await adminBlock(id, note)
            if (res.error) { toast.error(res.error); return }
            toast.success('تم الحظر.')
            reloadStudents()
          })
        }}
        onClose={() => setConfirmDialog(null)}
      />

      <ConfirmDialog
        open={confirmDialog?.action === 'unblock'}
        title="فك الحظر"
        description={`هل تريد فك حظر "${confirmDialog?.studentName}"؟ سيُعاد السكور إلى 100.`}
        onConfirm={() => {
          if (!confirmDialog) return
          const id = confirmDialog.studentId
          setConfirmDialog(null)
          start(async () => {
            const res = await adminUnblock(id, 100)
            if (res.error) { toast.error(res.error); return }
            toast.success('تم فك الحظر.')
            reloadStudents()
          })
        }}
        onClose={() => setConfirmDialog(null)}
      />

      <ConfirmDialog
        open={confirmDialog?.action === 'revoke'}
        title="إنهاء كل الجلسات"
        description={`هل تريد إنهاء كل جلسات "${confirmDialog?.studentName}"؟`}
        destructive
        onConfirm={() => {
          if (!confirmDialog) return
          const id = confirmDialog.studentId
          setConfirmDialog(null)
          start(async () => {
            const res = await adminRevokeAllSessions(id)
            if (res.error) { toast.error(res.error); return }
            toast.success('تم إنهاء الجلسات.')
            reloadStudents()
          })
        }}
        onClose={() => setConfirmDialog(null)}
      />

      <ConfirmDialog
        open={!!requestConfirm}
        title={requestConfirm?.action === 'approve' ? 'موافقة على طلب الإزالة' : 'رفض طلب الإزالة'}
        description={requestConfirm?.action === 'approve' ? 'سيتم إزالة الجهاز وإبطال جلساته.' : 'سيتم رفض الطلب وإشعار الطالب.'}
        needsNote
        notePlaceholder="ملاحظة للطالب (اختياري)"
        onConfirm={(note) => {
          if (!requestConfirm) return
          const { requestId, action } = requestConfirm
          setRequestConfirm(null)
          start(async () => {
            const res = await handleRemovalRequest(requestId, action, note)
            if (res.error) { toast.error(res.error); return }
            toast.success(action === 'approve' ? 'تمت الموافقة.' : 'تم الرفض.')
            const refreshed = await listDeviceRemovalRequestsClient()
            if (refreshed) setRequests(refreshed)
          })
        }}
        onClose={() => setRequestConfirm(null)}
      />
    </div>
  )
}

// Helper to refresh requests on client — wraps the server action
async function listDeviceRemovalRequestsClient() {
  const { listDeviceRemovalRequests } = await import('@/app/admin/security/actions')
  const res = await listDeviceRemovalRequests('pending')
  if ('error' in res) return null
  return res
}
