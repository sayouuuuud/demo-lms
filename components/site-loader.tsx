'use client'

import { useEffect, useState } from 'react'

const PRELOAD_IMAGES = [
  '/teacher.webp',
  '/topo-light.webp',
  '/topo-dark.webp',
  '/book.webp',
  '/inkwell.webp',
]

const MIN_DURATION = 1500

function preload(src: string) {
  return new Promise<void>((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
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
      aria-label="جارٍ تحميل أكاديمية شفاء العليل"
      aria-busy={!leaving}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-background text-foreground"
      style={{
        opacity: leaving ? 0 : 1,
        transition: 'opacity 0.35s ease',
        pointerEvents: leaving ? 'none' : 'auto',
      }}
    >
      <div className="flex w-full items-center justify-center px-6 text-center">
        <div className="loader-signature relative py-5" aria-hidden="true">
          {/*
            بنحرّك عرض طبقة فيها الجملة كاملة بدل ما نقسّمها لحروف؛ تقسيم النص
            العربي بيفصل أشكال الحروف عن بعض وبيبوّظ إحساس خط الرقعة.
          */}
          <div className="loader-writing overflow-hidden whitespace-nowrap">
            <p className="font-ruqaa text-[clamp(2.25rem,9vw,5rem)] font-bold leading-[1.65] text-primary">
              أكاديمية شفاء العليل
            </p>
          </div>

          <span className="loader-pen absolute bottom-3 left-0 size-1.5 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
          <span className="loader-baseline absolute inset-x-0 bottom-2 h-px origin-right bg-primary/20" />
        </div>
      </div>

      <span className="sr-only">جارٍ التحميل</span>

      <style>{`
        .loader-signature {
          animation: signature-arrive 260ms ease-out both;
        }
        .loader-writing {
          clip-path: inset(0 0 0 100%);
          animation: ruqaa-write 1.15s cubic-bezier(.65, 0, .35, 1) 120ms forwards;
        }
        .loader-pen {
          opacity: 0;
          animation: pen-travel 1.15s cubic-bezier(.65, 0, .35, 1) 120ms forwards;
        }
        .loader-baseline {
          transform: scaleX(0);
          animation: baseline-draw 1.15s cubic-bezier(.65, 0, .35, 1) 120ms forwards;
        }
        @keyframes signature-arrive {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ruqaa-write {
          from { clip-path: inset(0 0 0 100%); }
          to { clip-path: inset(0 0 0 0); }
        }
        @keyframes pen-travel {
          0% { left: 100%; opacity: 0; }
          8% { opacity: 1; }
          92% { opacity: 1; }
          100% { left: 0; opacity: 0; }
        }
        @keyframes baseline-draw {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .loader-signature,
          .loader-writing,
          .loader-pen,
          .loader-baseline {
            animation: none;
          }
          .loader-writing { clip-path: none; }
          .loader-pen { display: none; }
          .loader-baseline { transform: scaleX(1); }
        }
      `}</style>
    </div>
  )
}
