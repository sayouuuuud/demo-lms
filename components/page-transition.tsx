'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

// Lightweight page-content transition: a short CSS fade keyed on the pathname.
// No animation-library runtime per navigation, so switching pages feels snappy.
// Kept separate from the dashboard/student shells (sidebar + header) so those
// stay mounted and never flicker.
export function PageTransition({ children, className }: { children: ReactNode, className?: string }) {
  const pathname = usePathname()

  return (
    <div key={pathname} className={cn('ns-page-fade', className)}>
      {children}
    </div>
  )
}
