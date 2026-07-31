'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Monitor, Smartphone, Tablet, ShieldCheck, ShieldAlert, MapPin, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { requestDeviceRemoval } from '@/app/student/actions/security'
import type { getMyDevices } from '@/app/student/actions/security'
import { cn } from '@/lib/utils'

type DevicesData = Awaited<ReturnType<typeof getMyDevices>>
type Device = DevicesData['devices'][number]

function ScoreBar({ score, tone }: { score: number; tone: 'success' | 'warning' | 'danger' }) {
  const colorClass =
    tone === 'success'
      ? 'bg-green-500'
      : tone === 'warning'
        ? 'bg-yellow-500'
        : 'bg-destructive'
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn('h-full rounded-full transition-all', colorClass)}
        style={{ width: `${score}%` }}
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`السكور الأمني ${score} من 100`}
      />
    </div>
  )
}

function ScoreBadge({ tone, label }: { tone: 'success' | 'warning' | 'danger'; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        tone === 'success' && 'bg-green-500/15 text-green-600 dark:text-green-400',
        tone === 'warning' && 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
        tone === 'danger' && 'bg-destructive/15 text-destructive',
      )}
    >
      {label}
    </span>
  )
}

function DeviceIcon({ type }: { type: string }) {
  if (type === 'جوال') return <Smartphone className="size-6 text-muted-foreground" aria-hidden="true" />
  if (type === 'تابلت') return <Tablet className="size-6 text-muted-foreground" aria-hidden="true" />
  return <Monitor className="size-6 text-muted-foreground" aria-hidden="true" />
}

function RemovalDialog({
  device,
  open,
  onClose,
}: {
  device: Device
  open: boolean
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    startTransition(async () => {
      const res = await requestDeviceRemoval(device.id, reason)
      if ('error' in res) {
        toast.error(res.error)
      } else {
        toast.success('تم إرسال طلب الإزالة بنجاح')
        setReason('')
        onClose()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-right">
          <DialogTitle>طلب إزالة جهاز</DialogTitle>
          <DialogDescription>
            سيتم إرسال طلبك للإدارة للمراجعة والموافقة.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-xl border border-border bg-muted/40 p-3 text-right">
            <p className="text-sm font-medium text-foreground">{device.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {device.browser} · {device.os}
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-right text-sm font-medium text-foreground">
              سبب الطلب (اختياري)
            </label>
            <Textarea
              value={reason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
              placeholder="مثلاً: الجهاز القديم اتبع وعايز أشيله..."
              rows={3}
              className="resize-none text-right"
              maxLength={300}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <DialogClose>
            <Button variant="outline" disabled={isPending} type="button">إلغاء</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'جاري الإرسال...' : 'إرسال الطلب'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeviceCard({ device }: { device: Device }) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const location =
    device.lastCity || device.lastCountry
      ? [device.lastCity, device.lastCountry].filter(Boolean).join(' · ')
      : 'موقع غير معروف'

  return (
    <>
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <DeviceIcon type={device.deviceType} />
          </div>

          <div className="flex-1 text-right">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{device.label}</p>
              {device.isCurrent && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                  <ShieldCheck className="size-3" aria-hidden="true" />
                  هذا الجهاز
                </span>
              )}
            </div>

            <p className="mt-0.5 text-xs text-muted-foreground">
              {device.browser} · {device.os}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="size-3" aria-hidden="true" />
                {location}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="size-3" aria-hidden="true" />
                آخر نشاط: {device.lastActiveLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex justify-start">
          <Button
            variant="outline"
            size="sm"
            disabled={device.isCurrent || device.hasPendingRequest}
            onClick={() => setDialogOpen(true)}
            aria-label={`طلب إزالة ${device.label}`}
            className="text-xs"
          >
            {device.hasPendingRequest ? 'قيد المراجعة' : 'طلب إزالة'}
          </Button>
        </div>
      </div>

      <RemovalDialog
        device={device}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </>
  )
}

export function StudentDevicesPage({ data }: { data: DevicesData }) {
  const { score, scoreLabel, blocked, devices, maxDevices, pendingRequests } = data

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8" dir="rtl">
      <div className="text-right">
        <h1 className="text-2xl font-bold text-foreground">أجهزتي</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          إدارة الأجهزة المرتبطة بحسابك
        </p>
      </div>

      {/* بطاقة السكور */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span>السكور الأمني</span>
            {blocked && (
              <span className="flex items-center gap-1 text-sm font-normal text-destructive">
                <ShieldAlert className="size-4" aria-hidden="true" />
                الحساب موقوف
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <ScoreBadge tone={scoreLabel.tone} label={scoreLabel.label} />
            <span className="text-3xl font-bold text-foreground">{score}<span className="text-base font-normal text-muted-foreground">/100</span></span>
          </div>
          <ScoreBar score={score} tone={scoreLabel.tone} />
          <p className="text-xs text-muted-foreground leading-relaxed">
            السكور بيقل لو حصل نشاط مريب زي الدخول من أماكن متباعدة أو مشاركة الحساب.
          </p>
        </CardContent>
      </Card>

      {/* بطاقة الحد */}
      <Card className="rounded-2xl">
        <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">الحد الأقصى</span>
            <span className="text-sm font-semibold text-foreground">
              {devices.length} / {maxDevices} جهاز
            </span>
          </div>
          {pendingRequests > 0 && (
            <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
              لديك {pendingRequests} طلب إزالة قيد المراجعة
            </p>
          )}
        </CardContent>
      </Card>

      {/* قائمة الأجهزة */}
      {devices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Monitor className="mx-auto mb-3 size-10 text-muted-foreground/40" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">مفيش أجهزة مسجّلة لسه.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {devices.map((device) => (
            <DeviceCard key={device.id} device={device} />
          ))}
        </div>
      )}
    </main>
  )
}
