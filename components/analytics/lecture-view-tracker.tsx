'use client'

import { useEffect, useRef } from 'react'

// يسجّل فتح الدرس مرة واحدة. منع التكرار الحقيقي في القاعدة (شبّاك 30 دقيقة)،
// وهذا الحرس يمنع الإرسال المتكرر عند إعادة الرندر فقط.
export function LectureViewTracker({ lessonId }: { lessonId?: string }) {
  const sent = useRef<string | null>(null)

  useEffect(() => {
    if (!lessonId) return
    if (sent.current === lessonId) return
    sent.current = lessonId

    const controller = new AbortController()
    fetch('/api/lecture-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId }),
      signal: controller.signal,
      keepalive: true,
    }).catch(() => {})

    return () => controller.abort()
  }, [lessonId])

  return null
}
