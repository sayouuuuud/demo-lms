'use client'

import { useEffect } from 'react'
import { TriangleAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.log('[v0] student route error:', error.message, error.digest)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-secondary">
        <TriangleAlert className="size-8 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground">حصلت مشكلة</h1>
        <p className="max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
          مش قادرين نحمّل الصفحة دي دلوقتي. جرّب تاني، ولو المشكلة كملت تواصل مع مدرّسك.
        </p>
      </div>
      <Button onClick={reset}>حاول تاني</Button>
    </div>
  )
}
