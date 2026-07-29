'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'

type RevealOptions = {
  y?: number
  duration?: number
  stagger?: number
  delay?: number
  ease?: string
  start?: number // 0-1, fraction of viewport height to trigger at
}

/**
 * Reliable scroll reveal: uses IntersectionObserver to fire a GSAP tween
 * once the target (or its children) enters the viewport. Avoids the stale
 * position issues of ScrollTrigger when large images load late.
 *
 * Pass a selector to animate matching children (with stagger); omit it to
 * animate the container element itself.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  childSelector?: string,
  options: RevealOptions = {},
) {
  const ref = useRef<T>(null)
    const {
      y = 40,
      duration = 0.7,
      stagger = 0.12,
      delay = 0,
      ease = 'power3.out',
      start = 0.85,
    } = options

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const targets: Element[] = childSelector
      ? Array.from(el.querySelectorAll(childSelector))
      : [el]
    if (targets.length === 0) return

    // Respect reduced-motion: show everything, skip the animation.
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      gsap.set(targets, { y: 0, opacity: 1 })
      return
    }

    gsap.set(targets, { y, opacity: 0 })

    let done = false
    const reveal = () => {
      if (done) return
      done = true
      gsap.to(targets, {
        y: 0,
        opacity: 1,
        duration,
        stagger,
        delay,
        ease,
      })
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            reveal()
            observer.disconnect()
            break
          }
        }
      },
      { rootMargin: `0px 0px -${Math.round((1 - start) * 100)}% 0px` },
    )

    observer.observe(el)

    // Fallback: if already in view on mount, reveal immediately.
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight * start) reveal()

    return () => observer.disconnect()
  }, [childSelector, y, duration, stagger, delay, ease, start])

  return ref
}
