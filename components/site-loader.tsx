'use client'

import { useEffect, useState } from 'react'

const PRELOAD_IMAGES = [
  '/teacher.webp',
  '/topo-light.webp',
  '/topo-dark.webp',
  '/book.webp',
  '/inkwell.webp',
]

const MIN_DURATION = 2600

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
  const [writing, setWriting] = useState(false)

  useEffect(() => {
    let cancelled = false
    let leaveTimer: ReturnType<typeof setTimeout> | undefined
    let hideTimer: ReturnType<typeof setTimeout> | undefined
    let firstFrame = 0
    let secondFrame = 0
    const start = performance.now()

    // CSS animation كانت بتبدأ مع وصول HTML وبتخلص أحيانًا قبل أول paint ظاهر.
    // نبدأها بعد frame كامل من تركيب React عشان المستخدم يشوف الكتابة من أولها.
    firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        if (!cancelled) setWriting(true)
      })
    })

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
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(secondFrame)
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
          <div
            className={`loader-writing overflow-hidden whitespace-nowrap ${writing ? 'is-writing' : ''}`}
            // Inline عشان النص يفضل مخفي حتى قبل تحميل CSS وأول hydration frame.
            style={writing ? undefined : { clipPath: 'inset(0 0 0 100%)' }}
          >
            <p className="font-ruqaa text-[clamp(2.25rem,9vw,5rem)] font-bold leading-[1.65] text-primary">
              أكاديمية شفاء العليل
            </p>
          </div>

          <span
            className={`loader-pen absolute bottom-3 left-0 size-1.5 rounded-full bg-primary shadow-[0_0_10px_var(--primary)] ${writing ? 'is-writing' : ''}`}
          />
          <span
            className={`loader-baseline absolute inset-x-0 bottom-2 h-px origin-right bg-primary/20 ${writing ? 'is-writing' : ''}`}
          />
        </div>
      </div>

      <span className="sr-only">جارٍ التحميل</span>

      <style>{`
        .loader-signature {
          animation: signature-arrive 260ms ease-out both;
        }
        .loader-writing {
          clip-path: inset(0 0 0 100%);
        }
        .loader-writing.is-writing {
          animation: ruqaa-write 2s cubic-bezier(.45, 0, .25, 1) forwards;
        }
        .loader-pen {
          left: 100%;
          opacity: 0;
        }
        .loader-pen.is-writing {
          animation: pen-travel 2s cubic-bezier(.45, 0, .25, 1) forwards;
        }
        .loader-baseline {
          transform: scaleX(0);
        }
        .loader-baseline.is-writing {
          animation: baseline-draw 2s cubic-bezier(.45, 0, .25, 1) forwards;
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
