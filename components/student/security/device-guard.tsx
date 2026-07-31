'use client'

import { useEffect, useRef, useState } from 'react'
import { ShieldAlert, RefreshCw, LogOut } from 'lucide-react'
import { useLogout } from '@/lib/use-logout'
import { checkCurrentDevice, pingDeviceSession } from '@/app/student/actions/security'
import { collectClientHints } from '@/lib/device-fingerprint'
import type { DeviceVerdict } from '@/lib/device-guard'
import { Button } from '@/components/ui/button'

export function DeviceGuard() {
  const [verdict, setVerdict] = useState<DeviceVerdict | null>(null)
  const logout = useLogout()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    async function run() {
      const hints = collectClientHints()
      const v = await checkCurrentDevice(hints)
      setVerdict(v)

      // نبضة الجلسة كل دقيقة — بس لو الحالة ok
      if (v.status === 'ok') {
        intervalRef.current = setInterval(() => {
          pingDeviceSession().catch(() => {})
        }, 60_000)
      }
    }

    run().catch(() => {})

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  if (verdict?.status !== 'blocked') return null

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="device-guard-title"
      aria-describedby="device-guard-desc"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
    >
      <div className="mx-4 w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-2xl">
        <div className="mb-4 flex justify-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="size-8 text-destructive" aria-hidden="true" />
          </div>
        </div>

        <h2
          id="device-guard-title"
          className="mb-2 text-xl font-bold text-foreground"
        >
          تم إيقاف الدخول من هذا الجهاز
        </h2>

        <p id="device-guard-desc" className="mb-3 text-sm text-muted-foreground leading-relaxed">
          {verdict.message}
        </p>

        <p className="mb-1 text-sm font-medium text-foreground">
          السكور الأمني:{' '}
          <span className="text-destructive font-bold">{verdict.score}/100</span>
        </p>

        {verdict.reason === 'limit' ? (
          <p className="mb-6 text-xs text-muted-foreground">
            كلّم الدعم لإزالة جهاز من أجهزتك.
          </p>
        ) : (
          <p className="mb-6 text-xs text-muted-foreground">
            تواصل مع الدعم لمراجعة حسابك.
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            variant="destructive"
            onClick={logout}
            className="gap-2"
          >
            <LogOut className="size-4" aria-hidden="true" />
            تسجيل الخروج
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="gap-2"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            تحديث
          </Button>
        </div>
      </div>
    </div>
  )
}
