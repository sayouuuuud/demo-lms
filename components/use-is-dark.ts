'use client'

import { useEffect, useState } from 'react'

/**
 * Tracks dark mode from the `.dark` class on <html> — نفس المصدر اللي الـ CSS
 * وزرار تبديل المظهر بيعتمدوا عليه.
 *
 * مهم: ممنوع نرجع لـ `prefers-color-scheme` هنا. تفضيل النظام بيتحوّل أصلاً
 * لكلاس `.dark` في السكريبت اللي في <head>، فلو قرأناه تاني هنا الجهاز اللي
 * نظامه دارك هيفضل دارك حتى لما المستخدم يختار اللايت مود.
 */
export function useIsDark() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const update = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }

    update()

    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    return () => observer.disconnect()
  }, [])

  return isDark
}
