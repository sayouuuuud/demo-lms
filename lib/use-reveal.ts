'use client'

import { useEffect, useRef } from 'react'

type RevealOptions = {
  y?: number
  duration?: number
  stagger?: number
  delay?: number
  start?: number // 0-1, fraction of viewport height to trigger at
}

/**
 * Scroll reveal بدون مكتبات خارجية: IntersectionObserver + CSS transitions.
 * مرّر selector لتحريك العناصر الأبناء (مع stagger)، أو اتركه لتحريك العنصر نفسه.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  childSelector?: string,
  options: RevealOptions = {},
) {
  const ref = useRef<T>(null)
  const { y = 40, duration = 0.7, stagger = 0.12, delay = 0, start = 0.85 } = options

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const targets: HTMLElement[] = childSelector
      ? (Array.from(el.querySelectorAll(childSelector)) as HTMLElement[])
      : [el]
    if (targets.length === 0) return

    // احترام تفضيل تقليل الحركة
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      targets.forEach((t) => {
        t.style.opacity = '1'
        t.style.transform = 'none'
      })
      return
    }

    targets.forEach((t) => {
      t.style.opacity = '0'
      t.style.transform = `translateY(${y}px)`
    })

    let done = false
    const reveal = () => {
      if (done) return
      done = true
      targets.forEach((t, i) => {
        t.style.transition = `opacity ${duration}s cubic-bezier(0.22,1,0.36,1) ${delay + i * stagger}s, transform ${duration}s cubic-bezier(0.22,1,0.36,1) ${delay + i * stagger}s`
        t.style.opacity = '1'
        t.style.transform = 'translateY(0)'
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

    // fallback: لو العنصر ظاهر بالفعل عند التركيب
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight * start) reveal()

    return () => observer.disconnect()
  }, [childSelector, y, duration, stagger, delay, start])

  return ref
}
