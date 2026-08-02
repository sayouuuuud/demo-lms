'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'

/**
 * IslamicCorners — نقوش أرابيسك (زخرفة نباتية إسلامية) على أركان القسم الأربعة
 * إطار مزدوج بزاوية مقوّسة + وردة في الركن + غصن متعرّج بأوراق الرومي ولوالب
 */

const GOLD = 'oklch(0.82 0.13 85)'

function ArabesqueCorner({ size = 180, opacity = 0.4 }: { size?: number; opacity?: number }) {
  const uid = useId()
  const leafId = `leaf-${uid}`
  const petalId = `petal-${uid}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 220 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ opacity }}
    >
      <defs>
        {/* ورقة رومي (قاعدتها عند نقطة الأصل وتتجه لليمين) */}
        <path
          id={leafId}
          d="M0 0 C 6 -12, 19 -16, 27 -8 C 21 -12, 11 -9, 5 0 C 3 3, 1 2, 0 0 Z"
          fill={GOLD}
        />
        {/* بتلة الوردة (تتجه للأعلى من المركز 30,30) */}
        <path
          id={petalId}
          d="M30 21 C 33.2 16, 33.2 11.5, 30 7.5 C 26.8 11.5, 26.8 16, 30 21 Z"
          fill={GOLD}
        />
      </defs>

      {/* الإطار المزدوج بزاوية مقوّسة */}
      <path
        d="M220 9 H80 C 48 9, 30 12, 21 21 C 12 30, 9 48, 9 80 V220"
        stroke={GOLD}
        strokeWidth="1.6"
        opacity="0.9"
      />
      <path
        d="M220 18 H83 C 55 18, 39.5 21, 31.5 29 C 23.5 37, 20.5 52.5, 20.5 81 V220"
        stroke={GOLD}
        strokeWidth="0.9"
        opacity="0.5"
      />
      {/* نقطتا نهاية الإطار */}
      <circle cx="213" cy="13.5" r="2" fill={GOLD} opacity="0.7" />
      <circle cx="13.5" cy="213" r="2" fill={GOLD} opacity="0.7" />

      {/* وردة الركن الثمانية */}
      <g opacity="0.95">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <use key={a} href={`#${petalId}`} transform={`rotate(${a} 30 30)`} />
        ))}
        <circle cx="30" cy="30" r="3" fill="none" stroke={GOLD} strokeWidth="1" />
        <circle cx="30" cy="30" r="1.2" fill={GOLD} />
      </g>

      {/* الغصن الرئيسي: ينساب قطريًا وينتهي بلولب */}
      <g stroke={GOLD} strokeWidth="1.4" strokeLinecap="round">
        <path d="M42 42 C 74 46, 98 60, 107 84 C 113 101, 106 116, 91 117 C 80 118, 74 108, 80 100 C 84 94, 93 96, 92 104" />
        {/* غصين علوي بلولب */}
        <path d="M72 46 C 90 38, 108 40, 118 53 C 124 61, 121 70, 113 69 C 107 68, 106 61, 112 60" strokeWidth="1.1" />
        {/* غصين سفلي بلولب (مرآة للعلوي) */}
        <path d="M46 72 C 38 90, 40 108, 53 118 C 61 124, 70 121, 69 113 C 68 107, 61 106, 60 112" strokeWidth="1.1" />
        {/* محلاق صغير عند بداية الغصن */}
        <path d="M42 42 C 50 38, 56 40, 58 46" strokeWidth="0.9" opacity="0.7" />
      </g>

      {/* أوراق الرومي على الأغصان */}
      <g opacity="0.85">
        <use href={`#${leafId}`} transform="translate(58 44) rotate(-38)" />
        <use href={`#${leafId}`} transform="translate(72 50) rotate(28) scale(0.9)" />
        <use href={`#${leafId}`} transform="translate(94 62) rotate(-22) scale(0.85)" />
        <use href={`#${leafId}`} transform="translate(103 78) rotate(48) scale(0.75)" />
        {/* على الغصين العلوي */}
        <use href={`#${leafId}`} transform="translate(96 40) rotate(-52) scale(0.7)" />
        {/* على الغصين السفلي */}
        <use href={`#${leafId}`} transform="translate(44 60) rotate(128) scale(0.9)" />
        <use href={`#${leafId}`} transform="translate(42 92) rotate(102) scale(0.75)" />
        <use href={`#${leafId}`} transform="translate(50 108) rotate(75) scale(0.65)" />
      </g>

      {/* برعم صغير عند نهاية اللولب الرئيسي */}
      <circle cx="92" cy="104" r="1.6" fill={GOLD} opacity="0.8" />
      <circle cx="112" cy="60" r="1.3" fill={GOLD} opacity="0.7" />
      <circle cx="60" cy="112" r="1.3" fill={GOLD} opacity="0.7" />
    </svg>
  )
}

/**
 * أربع نقوش أرابيسك على الأركان الأربعة (مرايا لبعضها)
 * تُوضع داخل حاوية position: relative
 */
export function IslamicCorners({ size, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      aria-hidden="true"
    >
      {/* أعلى يسار */}
      <div className="absolute left-0 top-0 hidden sm:block">
        <ArabesqueCorner size={size ?? 170} />
      </div>
      {/* أعلى يمين */}
      <div className="absolute right-0 top-0 -scale-x-100">
        <ArabesqueCorner size={size ?? 170} />
      </div>
      {/* أسفل يسار */}
      <div className="absolute bottom-0 left-0 -scale-y-100">
        <ArabesqueCorner size={size ?? 170} />
      </div>
      {/* أسفل يمين */}
      <div className="absolute bottom-0 right-0 hidden -scale-x-100 -scale-y-100 sm:block">
        <ArabesqueCorner size={size ?? 170} />
      </div>
    </div>
  )
}
