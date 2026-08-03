'use client'

import { useEffect, useRef } from 'react'

const SEGMENTS = 20 // عدد أجزاء منحنى التسريب — يطابق CHECK (0..19) في القاعدة
const FLUSH_EVERY_MS = 30_000

/**
 * يقيس ثوانى المشاهدة الحقيقية + الأجزاء المُشاهَدة، ويُرسلها كل 30 ثانية.
 * لا يَعُدّ إلا إذا كان الفيديو يعمل فعلًا والتاب ظاهر — فلا أرقام مزيّفة.
 */
export function useWatchTracker({
  videoRef,
  lessonId,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>
  lessonId?: string
}) {
  const watchedRef = useRef(0)
  const segmentsRef = useRef<Set<number>>(new Set())
  const percentRef = useRef(0)
  const durationRef = useRef(0)

  useEffect(() => {
    if (!lessonId) return
    const video = videoRef.current
    if (!video) return

    // إعادة الضبط عند تغيير الدرس حتى لا تُنسب أرقام درس لدرس آخر.
    watchedRef.current = 0
    segmentsRef.current = new Set()
    percentRef.current = 0
    durationRef.current = 0

    // عدّاد الثانية: يزيد فقط أثناء تشغيل حقيقي وتاب ظاهر.
    const ticker = setInterval(() => {
      const v = videoRef.current
      if (!v || v.paused || v.ended) return
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return

      watchedRef.current += 1

      const duration = v.duration
      if (!Number.isFinite(duration) || duration <= 0) return
      durationRef.current = Math.floor(duration)

      const pct = Math.floor((v.currentTime / duration) * 100)
      if (pct > percentRef.current) percentRef.current = Math.min(pct, 100)

      const seg = Math.floor((v.currentTime / duration) * SEGMENTS)
      segmentsRef.current.add(Math.min(Math.max(seg, 0), SEGMENTS - 1))
    }, 1000)

    const flush = (useBeacon: boolean) => {
      const watchedDelta = watchedRef.current
      const segments = Array.from(segmentsRef.current)
      if (watchedDelta === 0 && segments.length === 0) return

      // صفّر أولًا حتى لا تُحتسب نفس الثواني مرتين لو تأخر الطلب.
      watchedRef.current = 0
      segmentsRef.current = new Set()

      const payload = JSON.stringify({
        lessonId,
        percent: percentRef.current,
        watchedDelta,
        durationSeconds: durationRef.current,
        segments,
      })

      // عند إغلاق الصفحة، sendBeacon هو الوحيد الموثوق.
      if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(
          '/api/lecture-progress',
          new Blob([payload], { type: 'application/json' }),
        )
        return
      }

      fetch('/api/lecture-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {})
    }

    const flusher = setInterval(() => flush(false), FLUSH_EVERY_MS)

    const onHide = () => {
      if (document.visibilityState === 'hidden') flush(true)
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', () => flush(true))

    return () => {
      clearInterval(ticker)
      clearInterval(flusher)
      document.removeEventListener('visibilitychange', onHide)
      flush(true) // لا تفقد آخر ثوانٍ عند الانتقال لدرس آخر
    }
  }, [lessonId, videoRef])
}
