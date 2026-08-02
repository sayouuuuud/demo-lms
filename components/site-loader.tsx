'use client'

import { useEffect, useState } from 'react'

const PRELOAD_IMAGES = [
  '/teacher.webp',
  '/topo-light.webp',
  '/topo-dark.webp',
  '/book.webp',
  '/inkwell.webp',
]

const MIN_DURATION = 1000

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
        setTimeout(() => !cancelled && setHidden(true), 650)
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
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6"
      style={{
        background: 'var(--background)',
        opacity: leaving ? 0 : 1,
        transition: 'opacity 0.6s ease',
        pointerEvents: leaving ? 'none' : 'auto',
      }}
    >
      <div className="relative flex items-center justify-center">
        <span
          className="absolute rounded-full"
          style={{
            width: 96,
            height: 96,
            border: '1.5px solid var(--brand-gold)',
            opacity: 0.5,
            animation: 'loaderRing 1.6s ease-out infinite',
          }}
        />
        <span
          className="absolute rounded-full"
          style={{
            width: 96,
            height: 96,
            border: '1.5px solid var(--brand-gold)',
            opacity: 0.3,
            animation: 'loaderRing 1.6s ease-out infinite 0.5s',
          }}
        />
        <div
          className="flex items-center justify-center size-20 rounded-full text-3xl font-black"
          style={{
            background: 'var(--primary)',
            color: 'var(--primary-foreground)',
            fontFamily: 'var(--font-cairo)',
            boxShadow: '0 8px 32px oklch(0.72 0.10 85 / 35%)',
          }}
        >
          ش
        </div>
      </div>

      <div className="flex flex-col items-center gap-1">
        <span
          className="text-lg font-black"
          style={{ color: 'var(--foreground)', fontFamily: 'var(--font-cairo)' }}
        >
          أكاديمية شفاء العليل
        </span>
        <span className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
          في اللغة العربية
        </span>
      </div>

      <div
        className="relative h-1 w-40 overflow-hidden rounded-full"
        style={{ background: 'oklch(0.72 0.10 85 / 18%)' }}
      >
        <span
          className="absolute inset-y-0 w-1/3 rounded-full"
          style={{
            background: 'var(--brand-gold)',
            animation: 'loaderBar 1.1s ease-in-out infinite',
          }}
        />
      </div>

      <style>{`
        @keyframes loaderRing {
          0%   { transform: scale(0.85); opacity: 0.55; }
          100% { transform: scale(1.5);  opacity: 0; }
        }
        @keyframes loaderBar {
          0%   { inset-inline-start: -35%; }
          100% { inset-inline-start: 100%; }
        }
      `}</style>
    </div>
  )
}
