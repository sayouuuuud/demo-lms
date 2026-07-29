'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'

type FunctionCurveProps = {
  /** SVG path data for the curve */
  d: string
  className?: string
  /** stroke color, defaults to gold */
  stroke?: string
  strokeWidth?: number
  /** delay before the draw animation starts */
  delay?: number
  viewBox?: string
}

/**
 * A hand-drawn-feeling function curve that "draws itself" on mount using
 * GSAP stroke-dashoffset. Transform/opacity + strokeDashoffset only, so it
 * stays cheap. Respects reduced-motion.
 */
export function FunctionCurve({
  d,
  className,
  stroke = 'var(--color-gold)',
  strokeWidth = 2,
  delay = 0.2,
  viewBox = '0 0 400 400',
}: FunctionCurveProps) {
  const pathRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    const path = pathRef.current
    if (!path) return

    const length = path.getTotalLength()
    gsap.set(path, { strokeDasharray: length, strokeDashoffset: length })

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(path, { strokeDashoffset: 0 })
      return
    }

    const tween = gsap.to(path, {
      strokeDashoffset: 0,
      duration: 1.8,
      delay,
      ease: 'power2.inOut',
    })
    return () => {
      tween.kill()
    }
  }, [delay, d])

  return (
    <svg
      className={className}
      viewBox={viewBox}
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path
        ref={pathRef}
        d={d}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  )
}
