'use client'

import { useEffect, useState } from 'react'

const PRELOAD_IMAGES = [
  '/teacher.webp',
  '/topo-light.webp',
  '/topo-dark.webp',
  '/book.webp',
  '/inkwell.webp',
]

const MIN_DURATION = 1100

function preload(src: string) {
  return new Promise<void>((resolve) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = src
  })
}

export function SiteLoader() {
  const [hidden, setHidden] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    let leaveTimer: ReturnType<typeof setTimeout> | undefined
    let hideTimer: ReturnType<typeof setTimeout> | undefined
    const start = performance.now()

    Promise.all(PRELOAD_IMAGES.map(preload)).then(() => {
      if (cancelled) return
      const elapsed = performance.now() - start
      const wait = Math.max(MIN_DURATION - elapsed, 0)

      leaveTimer = setTimeout(() => {
        if (cancelled) return
        setLeaving(true)
        hideTimer = setTimeout(() => !cancelled && setHidden(true), 400)
      }, wait)
    })

    return () => {
      cancelled = true
      if (leaveTimer) clearTimeout(leaveTimer)
      if (hideTimer) clearTimeout(hideTimer)
    }
  }, [])

  if (hidden) return null

  return (
    <div
      aria-hidden={leaving}
      role="status"
      aria-label="جارٍ تحميل الموقع"
      aria-busy={!leaving}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-background text-foreground"
      style={{
        opacity: leaving ? 0 : 1,
        transition: 'opacity 0.35s ease',
        pointerEvents: leaving ? 'none' : 'auto',
      }}
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-7 px-6 text-center">
        <div className="loader-mark relative flex size-28 items-center justify-center" aria-hidden="true">
          <span className="loader-corner loader-corner-tr" />
          <span className="loader-corner loader-corner-tl" />
          <span className="loader-corner loader-corner-br" />
          <span className="loader-corner loader-corner-bl" />

          <div className="loader-monogram flex size-20 items-center justify-center rounded-2xl border border-primary/30 bg-primary text-4xl font-black text-primary-foreground shadow-lg shadow-primary/15">
            ش
          </div>

          <span className="loader-scan absolute inset-x-5 h-px bg-primary shadow-[0_0_12px_var(--primary)]" />
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-xl font-black text-balance">أكاديمية شفاء العليل</p>
          <p className="text-sm font-semibold text-muted-foreground">في اللغة العربية</p>
        </div>

        <div className="flex w-44 flex-col gap-2" aria-hidden="true">
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <span className="loader-progress block h-full origin-right rounded-full bg-primary" />
          </div>
          <div className="flex items-center justify-between font-mono text-[10px] tracking-widest text-muted-foreground" dir="ltr">
            <span>READY</span>
            <span className="loader-percent">100%</span>
          </div>
        </div>
      </div>

      <style>{`
        .loader-mark {
          animation: loader-arrive 420ms cubic-bezier(.22, 1, .36, 1) both;
        }
        .loader-monogram {
          animation: loader-breathe 1.4s ease-in-out infinite;
        }
        .loader-corner {
          position: absolute;
          width: 18px;
          height: 18px;
          border-color: var(--primary);
          opacity: .75;
        }
        .loader-corner-tr { top: 0; right: 0; border-top: 2px solid; border-right: 2px solid; }
        .loader-corner-tl { top: 0; left: 0; border-top: 2px solid; border-left: 2px solid; }
        .loader-corner-br { bottom: 0; right: 0; border-bottom: 2px solid; border-right: 2px solid; }
        .loader-corner-bl { bottom: 0; left: 0; border-bottom: 2px solid; border-left: 2px solid; }
        .loader-scan {
          animation: loader-scan 1.05s cubic-bezier(.4, 0, .2, 1) infinite;
        }
        .loader-progress {
          animation: loader-fill 1s cubic-bezier(.22, 1, .36, 1) both;
        }
        .loader-percent {
          animation: loader-fade 500ms ease-out 400ms both;
        }
        @keyframes loader-arrive {
          from { transform: scale(.86); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes loader-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(.96); }
        }
        @keyframes loader-scan {
          0% { transform: translateY(-30px); opacity: 0; }
          20%, 80% { opacity: .8; }
          100% { transform: translateY(30px); opacity: 0; }
        }
        @keyframes loader-fill {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        @keyframes loader-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .loader-mark,
          .loader-monogram,
          .loader-scan,
          .loader-progress,
          .loader-percent {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}
