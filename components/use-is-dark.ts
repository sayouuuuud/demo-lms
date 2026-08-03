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
  // نبدأ بقراءة الكلاس مباشرة من الـ DOM لتفادي وميض اللون عند أول رسم.
  // typeof window check عشان ميكسرش الـ SSR.
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : false,
  )

  useEffect(() => {
    // نزامن مباشرة بعد mount (مهم لو الكلاس اتغير بين SSR وhydration)
    setIsDark(document.documentElement.classList.contains('dark'))

    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    return () => observer.disconnect()
  }, [])

  return isDark
}
