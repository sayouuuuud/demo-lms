'use client'

import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Recalculates ScrollTrigger positions after late layout shifts
 * (hero image load, web fonts) so scroll animations fire correctly.
 */
export function ScrollRefresh() {
  useEffect(() => {
    const refresh = () => ScrollTrigger.refresh()

    refresh()
    const t = setTimeout(refresh, 300)
    window.addEventListener('load', refresh)

    if (document.fonts?.ready) {
      document.fonts.ready.then(refresh)
    }

    return () => {
      clearTimeout(t)
      window.removeEventListener('load', refresh)
    }
  }, [])

  return null
}
