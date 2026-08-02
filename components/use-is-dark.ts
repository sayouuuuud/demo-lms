'use client'

import { useEffect, useState } from 'react'

/** Tracks dark mode via the `.dark` class or the system preference. */
export function useIsDark() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const update = () => {
      const dark =
        document.documentElement.classList.contains('dark') ||
        (!document.documentElement.classList.contains('light') &&
          window.matchMedia('(prefers-color-scheme: dark)').matches)
      setIsDark(dark)
    }

    update()

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const observer = new MutationObserver(update)

    mediaQuery.addEventListener('change', update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    return () => {
      mediaQuery.removeEventListener('change', update)
      observer.disconnect()
    }
  }, [])

  return isDark
}
