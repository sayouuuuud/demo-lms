'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { applyColorPreset } from '@/lib/color-presets'

type ThemeContextValue = {
  isDark: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  // القيمة الأولية تُقرأ من الكلاس اللي طبّقه السكريبت في <head> قبل أول رسم،
  // فمفيش وميض ومفيش رجوع للايت مود.
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev
      const root = document.documentElement
      root.classList.toggle('dark', next)
      localStorage.setItem('theme', next ? 'dark' : 'light')
      // إعادة تطبيق لون الـ preset بالنسخة الصحيحة (لايت/دارك) بعد التبديل،
      // وإلا هيفضل اللون الأساسي على نسخة الوضع القديم.
      const presetId = root.dataset.colorPreset
      if (presetId) applyColorPreset(presetId)
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}
