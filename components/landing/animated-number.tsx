'use client'

import { motion, useMotionValue, useTransform, animate, useInView } from 'framer-motion'
import { useEffect, useRef } from 'react'

interface Props {
  value: number
  prefix?: string
  suffix?: string
  duration?: number
}

export function AnimatedNumber({ value, prefix = '', suffix = '', duration = 2 }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-20px' })
  const count = useMotionValue(0)
  
  const display = useTransform(count, (latest) => {
    const num = Math.round(latest).toLocaleString('ar-EG')
    return `${prefix}${num}${suffix}`
  })

  useEffect(() => {
    if (inView) {
      animate(count, value, { duration, ease: 'easeOut' })
    }
  }, [count, value, duration, inView])

  return <motion.span ref={ref}>{display}</motion.span>
}
