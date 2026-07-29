'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { StudentSidebar } from './student-sidebar'
import { StudentHeader } from './student-header'
import { useTheme } from '@/components/theme-provider'
import { PageTransition } from '@/components/page-transition'
import { useStudent } from '@/components/student/student-context'
import { applyColorPreset } from '@/lib/color-presets'

export function StudentLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { isDark, toggleTheme } = useTheme()
  const { profile } = useStudent()

  useEffect(() => {
    // Determine the color from the database profile or fallback to local storage / default
    const dbPreset = profile?.colorPreset
    const localPreset = typeof window !== 'undefined' ? localStorage.getItem('color-preset') : null
    const colorToApply = dbPreset || localPreset || 'navy'
    applyColorPreset(colorToApply)
  }, [profile, isDark])

  return (
    <div className="flex min-h-screen bg-background">
      <StudentSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <StudentHeader
          onMenuClick={() => setSidebarOpen(true)}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />

        <main className="flex-1 p-4 sm:p-6">
          <PageTransition className="space-y-6">{children}</PageTransition>
        </main>
      </div>
    </div>
  )
}
