'use client'

import { useIsDark } from '@/components/use-is-dark'

/**
 * TopographicBackground — Adaptive topographic pattern
 * Light mode: topo-light.png (warm white with gold lines)
 * Dark mode: topo-dark.png (brown/black with gold lines)
 */
export function TopographicBackground({
  lightOpacity = 0.2,
  darkOpacity = 0.12,
}: {
  lightOpacity?: number
  darkOpacity?: number
}) {
  const isDark = useIsDark()

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      aria-hidden="true"
      style={{
        backgroundColor: isDark ? 'oklch(0.11 0.018 55)' : 'oklch(0.975 0.010 90)',
      }}
    >
      {/* Topo pattern — lines softened in dark mode */}
      {/*
        `background-attachment: fixed` is intentionally avoided — it is broken /
        janky on iOS Safari and most mobile browsers, which made the pattern jump
        while scrolling and shift the layout on small screens.
      */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat lg:[background-attachment:fixed]"
        style={{
          backgroundImage: isDark ? 'url(/topo-dark.webp)' : 'url(/topo-light.webp)',
          opacity: isDark ? darkOpacity : lightOpacity,
        }}
      />
      {/* Subtle darkening vignette (dark mode only) */}
      {isDark && (
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 120% 90% at 50% 40%, transparent 40%, rgba(0,0,0,0.45) 100%)',
          }}
        />
      )}
    </div>
  )
}
