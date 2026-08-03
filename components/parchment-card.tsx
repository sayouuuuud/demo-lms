'use client'

import { useRef, useState, type ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'

type ParchmentCardProps = {
  /** Illustration shown at the top of the card (blends into the paper) */
  illustrationSrc?: string
  illustrationAlt?: string
  title: string
  description?: string
  listLabel?: string
  items?: string[]
  buttonLabel?: string
  onAction?: () => void
  onItemClick?: (item: string, index: number) => void
  /** Free-form content rendered instead of the default slots */
  children?: ReactNode
  className?: string
}

const ARABIC_ORDINALS = ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']

export function ParchmentCard({
  illustrationSrc,
  illustrationAlt = '',
  title,
  description,
  listLabel,
  items,
  buttonLabel,
  onAction,
  onItemClick,
  children,
  className,
}: ParchmentCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    // Skip the tilt on touch/coarse pointers — it only causes jitter there.
    if (typeof window !== 'undefined' && !window.matchMedia('(pointer: fine)').matches) return
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    setTilt({ x: py * -5, y: px * 6 })
  }

  return (
    <div
      ref={cardRef}
      dir="rtl"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      className={`@container relative mx-auto w-full max-w-[420px] select-none sm:max-w-[480px] lg:max-w-[560px] ${className ?? ''}`}
      style={{ perspective: '1200px' }}
    >
      <div
        className="relative w-full overflow-hidden rounded-[8px] transition-transform duration-200 ease-out"
        style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      >
        {/*
          The paper is a stretching backdrop instead of a fixed-aspect image, so the
          card grows with its own content and can never clip the title / button.
        */}
        <img
          src="/images/parchment-clean-cut.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-fill drop-shadow-[0_10px_22px_rgba(0,0,0,0.18)] dark:drop-shadow-[0_12px_28px_rgba(0,0,0,0.45)]"
        />

        {/* Content flows normally inside the paper's safe area (percentages keep it proportional) */}
        <div className="relative flex min-h-[76cqw] flex-col items-center px-[11%] pb-[9%] pt-[12%] text-center">
          {children ?? (
            <>
              {illustrationSrc ? (
                <div className="mt-[6cqw] w-full shrink-0 overflow-hidden rounded-[3cqw]" style={{ contain: 'paint' }}>
                  <img
                    src={illustrationSrc || '/placeholder.svg'}
                    alt={illustrationAlt}
                    className="aspect-[4/3] w-full rounded-[3cqw] object-cover object-center mix-blend-multiply brightness-[1.12] contrast-[1.05]"
                    style={{
                      maskImage:
                        'radial-gradient(ellipse 92% 85% at 50% 50%, black 55%, transparent 98%)',
                      WebkitMaskImage:
                        'radial-gradient(ellipse 92% 85% at 50% 50%, black 55%, transparent 98%)',
                    }}
                  />
                </div>
              ) : null}

              {/* Title & description */}
              <div className="my-auto flex w-full flex-col items-center justify-center py-[4cqw]">
                <h2 className="font-ruqaa text-balance text-[clamp(1.35rem,8cqw,3rem)] font-bold leading-[1.5] text-ink">
                  {title}
                </h2>

                {description ? (
                  <p className="mt-[2.5cqw] max-w-[95%] font-ruqaa text-pretty text-[clamp(0.85rem,3.9cqw,1.35rem)] font-medium leading-[1.7] text-ink/90">
                    {description}
                  </p>
                ) : null}

                {/* Decorative separator */}
                {!items || items.length === 0 ? (
                  <div className="mt-[5cqw] flex w-3/4 items-center justify-center gap-[2cqw] text-ink/40">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-ink/30 to-transparent" />
                    <span className="font-ruqaa text-[clamp(0.75rem,3cqw,1rem)] text-ink/50">✦</span>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-ink/30 to-transparent" />
                  </div>
                ) : null}
              </div>

              {items && items.length > 0 ? (
                <div className="mb-[4cqw] w-full">
                  {listLabel ? (
                    <p className="font-ruqaa mb-[2cqw] text-[clamp(0.7rem,2.8cqw,0.9rem)] tracking-wide text-ink-faded">
                      {listLabel}
                    </p>
                  ) : null}
                  <ul className="flex w-full flex-col gap-[1.5cqw]">
                    {items.map((item, i) => (
                      <li key={item}>
                        <button
                          type="button"
                          onClick={() => onItemClick?.(item, i)}
                          className="flex w-full items-center gap-[2cqw] border border-ink/20 bg-ink/[0.04] px-[3cqw] py-[1.8cqw] text-right font-serif text-[clamp(0.75rem,3.2cqw,1rem)] font-bold text-ink transition-colors hover:bg-ink/[0.08]"
                          style={{ borderRadius: '10px 8px 12px 9px / 9px 12px 8px 11px' }}
                        >
                          <span
                            className="font-ruqaa text-[clamp(0.7rem,3cqw,0.95rem)] text-ink-faded"
                            aria-hidden="true"
                          >
                            {ARABIC_ORDINALS[i] ?? i + 1}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{item}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {buttonLabel ? (
                <button
                  type="button"
                  onClick={onAction}
                  className="relative z-20 mt-auto flex w-full shrink-0 items-center justify-center gap-[2cqw] border border-ink/30 bg-ink/[0.08] px-[5cqw] py-[3.4cqw] text-[clamp(0.95rem,4.6cqw,1.6rem)] font-bold text-ink transition-colors hover:bg-ink/[0.16] active:bg-ink/[0.22]"
                  style={{
                    fontFamily: 'var(--font-cairo), sans-serif',
                    borderRadius: '14px 10px 16px 11px / 11px 16px 10px 14px',
                    transform: 'rotate(-0.4deg)',
                  }}
                >
                  <span className="whitespace-nowrap">{buttonLabel}</span>
                  <ArrowLeft className="size-[clamp(1rem,4.5cqw,1.5rem)] shrink-0" aria-hidden="true" />
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
