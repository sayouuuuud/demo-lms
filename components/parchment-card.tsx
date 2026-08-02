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
      className={`relative mx-auto w-full max-w-[560px] select-none ${className ?? ''}`}
      style={{
        perspective: '1200px',
      }}
    >
      <div
        className="relative w-full transition-transform duration-200 ease-out"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        }}
      >
        {/* The paper itself IS the card — transparent PNG, shadow follows the deckled shape */}
        <img
          src="/images/parchment-clean-cut.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none w-full h-auto block drop-shadow-[0_10px_22px_rgba(0,0,0,0.18)] dark:drop-shadow-[0_12px_28px_rgba(0,0,0,0.45)]"
        />

        {/* Content sits inside the paper's safe area, clear of the deckled edges */}
        <div className="absolute inset-x-[11%] top-[10%] bottom-[8%] flex flex-col items-center text-center">
          {children ?? (
            <>
              {illustrationSrc ? (
                <div className="w-full mt-4 sm:mt-5 mb-3 shrink-0 px-1 overflow-hidden rounded-2xl">
                  <img
                    src={illustrationSrc || '/placeholder.svg'}
                    alt={illustrationAlt}
                    className="h-44 sm:h-56 w-full object-cover object-center rounded-2xl mix-blend-multiply brightness-[1.12] contrast-[1.05]"
                    style={{
                      maskImage:
                        'radial-gradient(ellipse 92% 85% at 50% 50%, black 55%, transparent 98%)',
                      WebkitMaskImage:
                        'radial-gradient(ellipse 92% 85% at 50% 50%, black 55%, transparent 98%)',
                    }}
                  />
                </div>
              ) : null}

              {/* Title & Description Container */}
              <div className="flex flex-col items-center justify-center my-auto px-2 py-3">
                <h2 className="font-ruqaa text-balance text-3xl font-bold leading-relaxed text-ink sm:text-4xl lg:text-5xl">
                  {title}
                </h2>

                {description ? (
                  <p className="mt-3.5 font-ruqaa text-lg font-medium leading-relaxed text-ink/90 sm:text-xl max-w-[94%]">
                    {description}
                  </p>
                ) : null}

                {/* Decorative separator line */}
                {!items || items.length === 0 ? (
                  <div className="mt-6 flex items-center gap-3 text-ink/40 w-3/4 justify-center">
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-ink/30 to-transparent" />
                    <span className="font-ruqaa text-base text-ink/50">✦</span>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-ink/30 to-transparent" />
                  </div>
                ) : null}
              </div>

              {items && items.length > 0 ? (
                <div className="mt-3 min-h-0 flex-1 w-full">
                  {listLabel ? (
                    <p className="font-ruqaa mb-2 text-xs tracking-wide text-ink-faded sm:text-sm">
                      {listLabel}
                    </p>
                  ) : null}
                  <ul className="flex flex-col gap-1.5 w-full">
                    {items.map((item, i) => (
                      <li key={item}>
                        <button
                          type="button"
                          onClick={() => onItemClick?.(item, i)}
                          className="flex w-full items-center gap-2.5 border border-ink/20 bg-ink/[0.04] px-3 py-1.5 text-right font-serif text-sm font-bold text-ink transition-colors hover:bg-ink/[0.08] sm:py-2"
                          style={{ borderRadius: '10px 8px 12px 9px / 9px 12px 8px 11px' }}
                        >
                          <span className="font-ruqaa text-sm text-ink-faded" aria-hidden="true">
                            {ARABIC_ORDINALS[i] ?? i + 1}
                          </span>
                          <span>{item}</span>
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
                  className="mt-auto flex w-full shrink-0 items-center justify-center gap-2.5 border border-ink/30 bg-ink/[0.08] px-6 py-3.5 font-bold text-xl text-ink transition-colors hover:bg-ink/[0.16] active:bg-ink/[0.22] sm:text-2xl relative z-20"
                  style={{
                    fontFamily: 'var(--font-cairo), sans-serif',
                    borderRadius: '14px 10px 16px 11px / 11px 16px 10px 14px',
                    transform: 'rotate(-0.4deg)',
                  }}
                >
                  <span>{buttonLabel}</span>
                  <ArrowLeft className="h-6 w-6" aria-hidden="true" />
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
