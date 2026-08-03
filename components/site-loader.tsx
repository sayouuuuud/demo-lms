'use client'

import { useEffect, useState } from 'react'

const PRELOAD_IMAGES = [
  '/teacher.webp',
  '/topo-light.webp',
  '/topo-dark.webp',
  '/book.webp',
  '/inkwell.webp',
]

const MIN_DURATION = 60000
const FADE_MS = 420
const SWEEP_MS = 620

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
    const start = performance.now()

    Promise.all(PRELOAD_IMAGES.map(preload)).then(() => {
      if (cancelled) return
      const elapsed = performance.now() - start
      const wait = Math.max(MIN_DURATION - elapsed, 0)
      setTimeout(() => {
        if (cancelled) return
        setLeaving(true)
        setTimeout(() => !cancelled && setHidden(true), FADE_MS)
      }, wait)
    })

    return () => {
      cancelled = true
    }
  }, [])

  if (hidden) return null

  return (
    <div
      aria-hidden={leaving}
      role="status"
      aria-label="جارٍ تحميل الموقع"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5"
      style={{
        background: 'var(--background)',
        opacity: leaving ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
        pointerEvents: leaving ? 'none' : 'auto',
      }}
    >
      <span className="sr-only">جارٍ تحميل الموقع</span>

      <svg
        viewBox="0 0 520 132"
        role="presentation"
        className="w-[min(78vw,420px)] overflow-visible"
      >
        <defs>
          <clipPath id="loaderReveal">
            {/* يُكشف من اليمين لليسار ليحاكي اتجاه الكتابة العربية */}
            <rect x="0" y="0" width="520" height="132" className="loader-sweep" />
          </clipPath>
        </defs>

        <g clipPath="url(#loaderReveal)">
          <text
            x="260"
            y="72"
            textAnchor="middle"
            direction="rtl"
            style={{
              fontFamily: 'var(--font-ruqaa)',
              fontSize: 46,
              fill: 'var(--foreground)',
              stroke: 'var(--brand-gold)',
              strokeWidth: 0.7,
              paintOrder: 'stroke',
            }}
          >
            أكاديمية شفاء العليل
          </text>
        </g>

        {/* سنّ القلم: يتحرك مع حدّ الكشف */}
        <circle
          cx="0"
          cy="72"
          r="3"
          className="loader-nib"
          style={{ fill: 'var(--brand-gold)' }}
        />

        {/* خط المِداد أسفل الاسم */}
        <rect
          x="150"
          y="94"
          width="220"
          height="1.5"
          rx="0.75"
          className="loader-underline"
          style={{ fill: 'var(--brand-gold)' }}
        />
      </svg>

      <span
        className="loader-subtitle text-xs font-semibold tracking-wide"
        style={{ color: 'var(--muted-foreground)' }}
      >
        في اللغة العربية
      </span>

      <style>{`
        .loader-sweep {
          transform: scaleX(0);
          transform-box: fill-box;
          transform-origin: right center;
          animation: loaderSweep ${SWEEP_MS}ms cubic-bezier(0.65, 0, 0.35, 1) forwards;
        }
        .loader-nib {
          opacity: 0;
          transform: translateX(500px);
          animation: loaderNib ${SWEEP_MS}ms cubic-bezier(0.65, 0, 0.35, 1) forwards;
        }
        .loader-underline {
          transform: scaleX(0);
          transform-box: fill-box;
          transform-origin: right center;
          animation: loaderSweep 520ms cubic-bezier(0.65, 0, 0.35, 1) ${SWEEP_MS - 120}ms forwards;
        }
        .loader-subtitle {
          opacity: 0;
          animation: loaderFadeUp 460ms ease-out ${SWEEP_MS - 60}ms forwards;
        }

        @keyframes loaderSweep {
          to { transform: scaleX(1); }
        }
        @keyframes loaderNib {
          0%   { transform: translateX(500px); opacity: 0; }
          12%  { opacity: 1; }
          88%  { opacity: 1; }
          100% { transform: translateX(20px); opacity: 0; }
        }
        @keyframes loaderFadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .loader-sweep,
          .loader-underline { transform: scaleX(1); animation: none; }
          .loader-subtitle { opacity: 1; animation: none; }
          .loader-nib { display: none; }
        }
      `}</style>
    </div>
  )
}
