'use client'

/**
 * TopographicBackground — Adaptive topographic pattern
 * Light mode: topo-light.webp (warm white with gold lines)
 * Dark mode: topo-dark.webp (brown/black with gold lines)
 *
 * كل الألوان بتيجي من CSS (dark: variants) مش من JS،
 * عشان نتفادي وميض الـ hydration مع الأجهزة الدارك.
 */
export function TopographicBackground() {
  return (
    <div
      className="absolute inset-0 pointer-events-none bg-[oklch(0.975_0.010_90)] dark:bg-[oklch(0.11_0.018_55)]"
      aria-hidden="true"
    >
      {/* Topo pattern light */}
      <div
        className="absolute inset-0 block dark:hidden"
        style={{
          backgroundImage: 'url(/topo-light.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.2,
        }}
      />
      {/* Topo pattern dark */}
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          backgroundImage: 'url(/topo-dark.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.12,
        }}
      />
      {/* Darkening vignette — dark mode only */}
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background:
            'radial-gradient(ellipse 120% 90% at 50% 40%, transparent 40%, rgba(0,0,0,0.45) 100%)',
        }}
      />
    </div>
  )
}
