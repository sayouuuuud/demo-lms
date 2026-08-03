'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { TopographicBackground } from '@/components/topo-background'
import { useIsDark } from '@/components/use-is-dark'
import type { HeroContent } from '@/lib/site-content-defaults'
import { DEFAULT_SITE_CONTENT } from '@/lib/site-content-defaults'
/* ── Letters streaming out and clustering into a circle ── */
const tabletLetters = [
  { letter: 'ا', top: '58%', left: '62%', size: 'text-2xl',  opacity: 0.50, delay: '0s',    rotate: '-5deg'  },
  { letter: 'ب', top: '55%', left: '66%', size: 'text-2xl',  opacity: 0.52, delay: '0.15s', rotate: '3deg'   },
  { letter: 'ت', top: '52%', left: '70%', size: 'text-2xl',  opacity: 0.54, delay: '0.3s',  rotate: '-7deg'  },
  { letter: 'ث', top: '49%', left: '74%', size: 'text-2xl',  opacity: 0.56, delay: '0.45s', rotate: '5deg'   },
  { letter: 'ج', top: '44%', left: '78%', size: 'text-3xl',  opacity: 0.62, delay: '0.6s',  rotate: '-6deg'  },
  { letter: 'ح', top: '40%', left: '82%', size: 'text-3xl',  opacity: 0.65, delay: '0.75s', rotate: '8deg'   },
  { letter: 'خ', top: '36%', left: '80%', size: 'text-2xl',  opacity: 0.60, delay: '0.9s',  rotate: '-8deg'  },
  { letter: 'د', top: '32%', left: '84%', size: 'text-2xl',  opacity: 0.58, delay: '1.05s', rotate: '4deg'   },
  { letter: 'ر', top: '38%', left: '76%', size: 'text-2xl',  opacity: 0.62, delay: '1.2s',  rotate: '-4deg'  },
  { letter: 'س', top: '34%', left: '82%', size: 'text-3xl',  opacity: 0.66, delay: '1.35s', rotate: '6deg'   },
  { letter: 'ع', top: '30%', left: '78%', size: 'text-2xl',  opacity: 0.60, delay: '1.5s',  rotate: '-5deg'  },
  { letter: 'ق', top: '36%', left: '88%', size: 'text-2xl',  opacity: 0.58, delay: '1.65s', rotate: '7deg'   },
  { letter: 'ل', top: '40%', left: '78%', size: 'text-2xl',  opacity: 0.58, delay: '1.8s',  rotate: '-6deg'  },
  { letter: 'م', top: '34%', left: '74%', size: 'text-2xl',  opacity: 0.60, delay: '1.95s', rotate: '3deg'   },
  { letter: 'ن', top: '38%', left: '84%', size: 'text-2xl',  opacity: 0.62, delay: '2.1s',  rotate: '-3deg'  },
]

/* ── Stats data ── */
const statsData = [
  {
    target: 20, prefix: '+', suffix: '', label: 'سنة خبرة',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="8" r="5"/><path d="M3 21v-2a7 7 0 0 1 14 0v2"/>
      </svg>
    ),
  },
  {
    target: 300, prefix: '+', suffix: '', label: 'طالب',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    target: 97, prefix: '', suffix: '٪', label: 'نسبة رضا',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>
      </svg>
    ),
  },
]

function useCountUp(target: number, duration = 1800, start = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start) return
    let startTime: number | null = null
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(step)
      else setCount(target)
    }
    requestAnimationFrame(step)
  }, [target, duration, start])
  return count
}

const toArabic = (n: number) => n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d])

function StatItem({
  target, prefix, suffix, label, icon, started,
}: {
  target: number; prefix: string; suffix: string; label: string; icon: React.ReactNode; started: boolean
}) {
  const count = useCountUp(target, 1600, started)
  const isDark = useIsDark()
  return (
    /* On phones each stat becomes a narrow centred column (icon on top) so all
       three fit on a single row even at ~310px; from `sm` it goes back to the
       original icon-beside-text row. */
    <div className="flex w-full flex-col items-center gap-1 px-1.5 py-2.5 text-center sm:w-auto sm:flex-row sm:items-center sm:gap-3 sm:px-5 sm:py-3 sm:text-start">
      <span className="shrink-0" style={{ color: isDark ? 'oklch(0.84 0.11 88)' : 'oklch(0.58 0.10 80)' }}>{icon}</span>
      <div className="flex min-w-0 flex-col items-center leading-tight sm:items-start">
        <span
          className="text-base sm:text-3xl font-black tabular-nums whitespace-nowrap"
          style={{ color: isDark ? 'oklch(0.87 0.10 88)' : 'oklch(0.42 0.075 70)', fontFamily: 'var(--font-cairo), sans-serif' }}
        >
          {prefix}{toArabic(count)}{suffix}
        </span>
        <span className="text-[11px] sm:text-xs font-semibold leading-tight" style={{ color: isDark ? 'oklch(0.72 0.03 85)' : 'oklch(0.48 0.045 58)' }}>
          {label}
        </span>
      </div>
    </div>
  )
}


function StatsBar({ started, stats = [] }: { started: boolean, stats?: HeroContent['miniStats'] }) {
  const isDark = useIsDark()
  const displayStats = stats && stats.length > 0 ? stats : statsData
  return (
    /* Phones: an equal-width grid so the stats never wrap into a lopsided
       second row. From `sm`: the original inline row. */
    <div
      className="grid w-full max-w-full items-stretch self-start overflow-hidden rounded-2xl sm:inline-flex sm:w-auto sm:flex-nowrap sm:items-stretch"
      style={{
        gridTemplateColumns: `repeat(${displayStats.length}, minmax(0, 1fr))`,
        background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.65)',
        border: isDark ? '1px solid rgba(255,255,255,0.18)' : '1px solid oklch(0.68 0.09 82 / 35%)',
        boxShadow: isDark
          ? '0 8px 32px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.18)'
          : '0 8px 28px oklch(0.55 0.06 70 / 18%), inset 0 1px 0 rgba(255,255,255,0.8)',
        backdropFilter: 'blur(20px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
      }}
    >
      {displayStats.map((s, i) => {
        // If s has an icon (from hardcoded statsData), use it. Otherwise fall
        // back to the matching default icon so the stats don't all look alike.
        const icon = 'icon' in s ? (s as any).icon : (statsData[i % statsData.length].icon)
        return (
          <div key={i} className="flex min-w-0 items-stretch">
            <StatItem target={(s as any).value || (s as any).target || 0} prefix={s.prefix} suffix={s.suffix} label={s.label} icon={icon} started={started} />
            {i < displayStats.length - 1 && (
              <div
                className="self-stretch my-2 w-px shrink-0"
                style={{ background: isDark ? 'oklch(0.84 0.11 88 / 20%)' : 'oklch(0.58 0.09 80 / 30%)' }}
                aria-hidden="true"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function CircleBadge({
  value, label, size, className, style,
}: {
  value: string; label?: string; size: number; className?: string; style?: React.CSSProperties
}) {
  const [hovered, setHovered] = useState(false)
  const isDark = useIsDark()
  return (
    <div
      className={`absolute z-[20] flex flex-col items-center justify-center rounded-full select-none ${className ?? ''}`}
      style={{
        width: size, height: size,
        background: hovered
          ? 'oklch(0.84 0.11 88 / 18%)'
          : isDark ? 'oklch(0.12 0.022 58 / 85%)' : 'oklch(0.99 0.008 90 / 85%)',
        border: hovered
          ? '2px solid oklch(0.87 0.12 88 / 90%)'
          : isDark ? '1.5px solid oklch(0.78 0.10 85 / 50%)' : '1.5px solid oklch(0.64 0.09 80 / 55%)',
        boxShadow: hovered
          ? '0 0 32px oklch(0.84 0.11 88 / 50%), inset 0 0 20px oklch(0.84 0.11 88 / 14%)'
          : isDark ? '0 0 24px rgba(0,0,0,0.5)' : '0 8px 24px oklch(0.55 0.06 70 / 22%)',
        backdropFilter: 'blur(8px)',
        transform: hovered ? 'scale(1.14)' : 'scale(1)',
        transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease, background 0.3s ease, border 0.3s ease',
        cursor: 'default',
        animation: 'badgePulse 3.5s ease-in-out infinite',
        ...style,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        className="font-black leading-none"
        style={{ fontFamily: 'var(--font-cairo), sans-serif', color: isDark ? 'oklch(0.87 0.10 88)' : 'oklch(0.44 0.075 72)', fontSize: size * 0.28 }}
      >
        {value}
      </span>
      {label && (
        <span className="font-semibold mt-0.5" style={{ color: isDark ? 'oklch(0.72 0.06 85)' : 'oklch(0.46 0.045 58)', fontSize: Math.max(size * 0.10, 10) }}>
          {label}
        </span>
      )}
    </div>
  )
}

function ArabesqueLine({ flip = false }: { flip?: boolean }) {
  return (
    <div className={`flex items-center gap-3 w-full ${flip ? 'scale-x-[-1]' : ''}`} aria-hidden="true">
      <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, oklch(0.84 0.11 88 / 55%), transparent)' }} />
      <svg width="128" height="18" viewBox="0 0 128 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon points="64,2 70,9 64,16 58,9" fill="oklch(0.84 0.11 88)" opacity="0.9"/>
        <polygon points="41,2 46,9 41,16 36,9" fill="none" stroke="oklch(0.84 0.11 88)" strokeWidth="1" opacity="0.65"/>
        <line x1="46" y1="9" x2="58" y2="9" stroke="oklch(0.84 0.11 88)" strokeWidth="1" opacity="0.55"/>
        <circle cx="30" cy="9" r="2" fill="oklch(0.84 0.11 88)" opacity="0.5"/>
        <line x1="10" y1="9" x2="28" y2="9" stroke="oklch(0.84 0.11 88)" strokeWidth="0.8" opacity="0.35"/>
        <circle cx="7" cy="9" r="1.2" fill="oklch(0.84 0.11 88)" opacity="0.3"/>
        <polygon points="87,2 92,9 87,16 82,9" fill="none" stroke="oklch(0.84 0.11 88)" strokeWidth="1" opacity="0.65"/>
        <line x1="70" y1="9" x2="82" y2="9" stroke="oklch(0.84 0.11 88)" strokeWidth="1" opacity="0.55"/>
        <circle cx="98" cy="9" r="2" fill="oklch(0.84 0.11 88)" opacity="0.5"/>
        <line x1="100" y1="9" x2="118" y2="9" stroke="oklch(0.84 0.11 88)" strokeWidth="0.8" opacity="0.35"/>
        <circle cx="121" cy="9" r="1.2" fill="oklch(0.84 0.11 88)" opacity="0.3"/>
      </svg>
      <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, oklch(0.84 0.11 88 / 55%), transparent)' }} />
    </div>
  )
}

export function HeroSection({ content = DEFAULT_SITE_CONTENT.hero }: { content?: HeroContent }) {
  const textRef = useRef<HTMLDivElement>(null)
  const [textVisible, setTextVisible] = useState(false)
  const [statsStarted, setStatsStarted] = useState(false)
  const isDark = useIsDark()

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTextVisible(true)
          setTimeout(() => setStatsStarted(true), 700)
          observer.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    if (textRef.current) observer.observe(textRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      className="relative min-h-screen flex flex-col overflow-hidden"
      aria-label="القسم الرئيسي"
    >
      <TopographicBackground />

      <div
        className="absolute inset-y-0 start-0 w-full lg:w-[62%] z-[1] pointer-events-none"
        aria-hidden="true"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse 90% 75% at 75% 48%, rgba(0,0,0,0.84) 0%, rgba(0,0,0,0.50) 48%, transparent 72%)'
            : 'radial-gradient(ellipse 90% 75% at 75% 48%, oklch(0.985 0.008 90 / 92%) 0%, oklch(0.985 0.008 90 / 60%) 48%, transparent 72%)',
        }}
      />

      {/*
        The two columns only sit side-by-side from `lg`. At tablet widths (768–1023px)
        two ~50% columns were too narrow: the headline collided with the teacher photo
        and the stats bar overflowed, so tablets keep the stacked mobile layout.
      */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-stretch pt-24 sm:pt-28 w-full min-w-0">
        {/* ── TEXT SIDE ── */}
        <div
          ref={textRef}
          className="relative z-20 flex min-w-0 flex-col justify-center gap-4 sm:gap-7 order-2 lg:order-1 w-full lg:w-[50%] px-4 sm:px-10 lg:ps-12 lg:pe-4 pb-10 sm:pb-12 lg:pb-20"
          style={{
            opacity: textVisible ? 1 : 0,
            transform: textVisible ? 'translateX(0)' : 'translateX(90px)',
            transition: 'opacity 0.9s ease, transform 0.9s cubic-bezier(0.22,1,0.36,1)',
          }}
        >


          {/* Headline */}
          <div className="space-y-1">
            <h1
              /* Arabic headline needs a slightly looser line-height on phones so
                 the diacritics of one line don't touch the line above it. */
              className="text-balance text-[clamp(1.95rem,9vw,3.25rem)] lg:text-[clamp(2.25rem,4.2vw,3.75rem)] xl:text-[4.5rem] font-black leading-[1.4] sm:leading-tight"
              style={{ fontFamily: 'var(--font-reem-kufi), var(--font-cairo), sans-serif' }}
            >
              {/* No `whitespace-nowrap` here — the long Arabic phrases must be free to
                  wrap, otherwise they overflow the hero on tablet widths. */}
              <span style={{ color: isDark ? 'oklch(0.98 0.008 85)' : 'oklch(0.28 0.045 55)' }}>{content.titleLine1} </span>
              {content.titleLine2.split('{highlight}').map((part, i, arr) => (
                <span key={i}>
                  <span style={{ color: isDark ? 'oklch(0.98 0.008 85)' : 'oklch(0.28 0.045 55)' }}>{part}</span>
                  {i < arr.length - 1 && (
                    <span className="whitespace-nowrap" style={{ color: isDark ? 'oklch(0.86 0.12 88)' : 'oklch(0.58 0.11 78)' }}>{content.titleHighlight}</span>
                  )}
                </span>
              ))}
            </h1>
            {content.badge && (
              <p className="text-sm sm:text-base font-bold pt-1" style={{ color: isDark ? 'oklch(0.82 0.10 150)' : 'oklch(0.48 0.10 155)' }}>
                {content.badge}
              </p>
            )}
          </div>

          {/* Arabesque separator */}
          <ArabesqueLine />

          {/* Description */}
          <p
            className="text-[13px] sm:text-base leading-relaxed"
            style={{ color: isDark ? 'oklch(0.84 0.02 85)' : 'oklch(0.42 0.040 56)', fontFamily: 'var(--font-cairo), sans-serif', maxWidth: '40rem' }}
          >
            {content.description}
          </p>

          {/* CTA */}
          <div className="flex items-center gap-4">
            {/* Full-width tap target on phones, intrinsic width from `sm`. */}
            <div className="relative block w-full sm:inline-block sm:w-auto">
              <span
                className="absolute -inset-[6px] rounded-full pointer-events-none"
                style={{ border: '1px solid oklch(0.84 0.11 88 / 35%)', animation: 'framePulse 2.5s ease-in-out infinite' }}
                aria-hidden="true"
              />
              <span
                className="absolute -inset-[12px] rounded-full pointer-events-none"
                style={{ border: '1px solid oklch(0.84 0.11 88 / 16%)', animation: 'framePulse 2.5s ease-in-out infinite 0.35s' }}
                aria-hidden="true"
              />
              <Link
                href={content.cta1Href}
                className="relative overflow-hidden flex items-center justify-center gap-3 px-6 py-3.5 sm:px-9 sm:py-4 rounded-full text-[15px] sm:text-base font-black transition-transform hover:scale-105 active:scale-95"
                style={{
                  background: 'oklch(0.84 0.11 88)',
                  color: 'oklch(0.13 0.04 60)',
                  boxShadow: '0 6px 32px oklch(0.84 0.11 88 / 38%)',
                  fontFamily: 'var(--font-cairo), sans-serif',
                }}
              >
                <span className="cta-shimmer-bar" aria-hidden="true" />
                <span className="relative z-10">{content.cta1Text}</span>
                <svg
                  width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className="relative z-10 rtl:rotate-180" aria-hidden="true"
                >
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
            </div>
          </div>

          <StatsBar started={statsStarted} stats={content.miniStats} />
        </div>

        {/* ── TEACHER SIDE ── */}
        <div className="relative order-1 lg:order-2 w-full lg:w-[50%] lg:min-h-screen overflow-hidden">
          {/* MOBILE + TABLET */}
          {/* Extra horizontal padding keeps the decorative rings and the two
              floating labels inside the viewport on narrow phones. */}
          <div className="lg:hidden relative w-full flex justify-center px-6 pt-6 pb-2 sm:px-6 sm:pt-8 sm:pb-4">
            <div className="relative aspect-square w-[78vw] min-w-[220px] max-w-[340px] sm:w-[78vw] sm:max-w-[400px]">
              <div
                className="absolute -inset-4 rounded-full pointer-events-none"
                aria-hidden="true"
                style={{
                  border: isDark
                    ? '1.5px solid oklch(0.78 0.10 85 / 55%)'
                    : '1.5px solid oklch(0.52 0.08 175 / 60%)',
                }}
              />
              <div
                className="absolute -inset-4 rounded-full pointer-events-none"
                aria-hidden="true"
                style={{
                  border: isDark
                    ? '1px solid oklch(0.78 0.10 85 / 25%)'
                    : '1px solid oklch(0.52 0.08 175 / 30%)',
                  transform: 'scale(1.045)',
                }}
              />

              <svg
                className="absolute -inset-8 w-[calc(100%+4rem)] h-[calc(100%+4rem)] pointer-events-none"
                viewBox="0 0 100 100"
                fill="none"
                aria-hidden="true"
              >
                <polygon points="50,1 55,8 45,8" fill="none" stroke="oklch(0.68 0.11 82)" strokeWidth="0.8" opacity="0.85" />
                <polygon points="7,32 13,36 6,39" fill="none" stroke="oklch(0.68 0.11 82)" strokeWidth="0.7" opacity="0.6" />
                <polygon points="94,58 88,62 94,66" fill="none" stroke="oklch(0.68 0.11 82)" strokeWidth="0.7" opacity="0.6" />
                <polygon points="24,90 30,93 23,96" fill="none" stroke="oklch(0.68 0.11 82)" strokeWidth="0.7" opacity="0.5" />
              </svg>

              <div
                className="absolute inset-0 rounded-full overflow-hidden"
                style={{
                  background: isDark
                    ? 'radial-gradient(circle at 50% 35%, oklch(0.22 0.03 60), oklch(0.13 0.022 58))'
                    : 'radial-gradient(circle at 50% 35%, oklch(1 0 0), oklch(0.96 0.015 90))',
                  boxShadow: isDark
                    ? '0 18px 48px rgba(0,0,0,0.55)'
                    : '0 18px 48px oklch(0.55 0.06 70 / 25%)',
                }}
              >
                <Image
                  src={isDark ? (content.teacherImageDark || content.teacherImageLight) : content.teacherImageLight}
                  alt={content.teacherImageAlt}
                  fill
                  sizes="80vw"
                  className="object-cover"
                  style={{ objectPosition: '50% 18%', transform: 'scale(1.12)' }}
                  priority
                />
              </div>

              {[
                { letter: 'ن', top: '58%', left: '80%', size: 'text-lg',  opacity: 0.55, delay: '0s'    },
                { letter: 'ب', top: '44%', left: '90%', size: 'text-xl',  opacity: 0.6,  delay: '0.3s'  },
                { letter: 'ع', top: '28%', left: '95%', size: 'text-lg',  opacity: 0.55, delay: '0.6s'  },
                { letter: 'ق', top: '14%', left: '88%', size: 'text-xl',  opacity: 0.6,  delay: '0.9s'  },
                { letter: 'س', top: '4%',  left: '76%', size: 'text-lg',  opacity: 0.5,  delay: '1.2s'  },
                { letter: 'م', top: '-4%', left: '62%', size: 'text-base', opacity: 0.45, delay: '1.5s' },
              ].map((item, i) => (
                <span
                  key={i}
                  /* Hidden on the narrowest phones: these letters sit at 76–95%
                     of the circle, so they spill outside the viewport there. */
                  className={`absolute z-[16] hidden font-black select-none pointer-events-none letter-rise sm:block ${item.size}`}
                  style={{
                    top: item.top, left: item.left,
                    fontFamily: 'var(--font-cairo), sans-serif',
                    color: isDark ? 'oklch(0.85 0.10 88)' : 'oklch(0.56 0.10 78)',
                    opacity: item.opacity,
                    animationDelay: item.delay,
                    textShadow: isDark ? '0 0 12px oklch(0.85 0.10 88 / 45%)' : '0 0 12px oklch(0.70 0.10 82 / 40%)',
                  }}
                  aria-hidden="true"
                >
                  {item.letter}
                </span>
              ))}

              <div
                className="absolute z-[16] hidden pointer-events-none sm:block"
                style={{ bottom: '4%', left: '-7%', width: 64, animation: 'inkFloat 6s ease-in-out infinite' }}
                aria-hidden="true"
              >
                <Image src="/inkwell.webp" alt="" width={160} height={283} className="w-full h-auto drop-shadow-[0_6px_16px_rgba(0,0,0,0.45)]" />
              </div>


            </div>
          </div>

          {/* DESKTOP */}
          <div className="hidden lg:block absolute inset-0">
            {tabletLetters.map((item, i) => (
              <span
                key={i}
                className={`absolute z-[13] font-black select-none pointer-events-none letter-rise ${item.size}`}
                style={{
                  top: item.top, left: item.left,
                  fontFamily: 'var(--font-cairo), sans-serif',
                  color: isDark ? 'oklch(0.85 0.10 88)' : 'oklch(0.56 0.10 78)',
                  opacity: item.opacity,
                  animationDelay: item.delay,
                  transform: `rotate(${item.rotate})`,
                  textShadow: isDark ? '0 0 14px oklch(0.85 0.10 88 / 45%)' : '0 0 14px oklch(0.70 0.10 82 / 40%)',
                }}
                aria-hidden="true"
              >
                {item.letter}
              </span>
            ))}

            <div
              className="absolute z-[11] pointer-events-none"
              aria-hidden="true"
              style={{
                top: '46%', left: '44%', width: 260, height: 260,
                background: 'radial-gradient(circle, oklch(0.88 0.09 88 / 22%) 0%, transparent 65%)',
                filter: 'blur(10px)',
              }}
            />


            <div
              className="absolute z-[12] pointer-events-none"
              style={{ bottom: '-65%', right: '5%', width: 200, animation: 'gentleFloat 5s ease-in-out infinite', transform: 'rotate(-28deg)' }}
            >
              <Image src="/book.webp" alt="" width={200} height={133} className="w-full h-auto drop-shadow-[0_14px_35px_rgba(0,0,0,0.8)]" />
            </div>

            <div
              className="absolute z-[9] pointer-events-none"
              style={{ top: '28%', left: '2%', width: 170, animation: 'gentleFloat 6s ease-in-out infinite', animationDelay: '1s' }}
            >
              <Image src="/inkwell.webp" alt="" width={160} height={283} className="w-full h-auto drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)]" />
            </div>

            <div
              className="absolute z-[4] pointer-events-none"
              style={{
                bottom: '0%',
                left: '50%',
                transform: 'translateX(-52%)',
                height: '94%',
                width: 'max-content',
              }}
            >
              <Image
                src="/teacher.webp"
                alt="المدرس - أكاديمية شفاء العليل في اللغة العربية"
                width={2400}
                height={1282}
                className="h-full w-auto max-w-none"
                style={{ filter: 'drop-shadow(0 20px 60px rgba(0,0,0,0.40))' }}
                priority
              />
            </div>
          </div>
        </div>
      </div>

    </section>
  )
}
