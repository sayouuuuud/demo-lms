'use client'

/* ─────────────────────────────────────────────
 * SectionBackdrop — خلفية قسم المنهج
 * لون ساده من الثيم + حروف عربية باهتة
 * بتطفو من تحت لفوق ببطء (CSS فقط، بدون أي وزن)
 * ───────────────────────────────────────────── */

type Variant = 'features'

const LETTERS = [
  // [الحرف, المكان الأفقي %, حجم rem, مدة الحركة s, تأخير s, دوران deg]
  ['ض', 8, 7.5, 26, 0, -12],
  ['ح', 22, 5, 32, -8, 8],
  ['ع', 35, 6.5, 24, -16, -6],
  ['م', 48, 4.5, 30, -4, 14],
  ['ن', 60, 7, 27, -20, -10],
  ['ر', 72, 5.5, 34, -12, 6],
  ['ب', 84, 6, 25, -24, -8],
  ['و', 93, 4.5, 31, -6, 10],
] as const

export function SectionBackdrop({ variant: _variant }: { variant: Variant }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {LETTERS.map(([char, left, size, dur, delay, rot], i) => (
        <span
          key={i}
          className="letter-float absolute bottom-0 select-none font-black leading-none text-foreground"
          style={{
            insetInlineStart: `${left}%`,
            fontSize: `${size}rem`,
            opacity: 0,
            fontFamily: 'var(--font-noto-naskh), serif',
            animationDuration: `${dur}s`,
            animationDelay: `${delay}s`,
            ['--rot' as string]: `${rot}deg`,
          }}
        >
          {char}
        </span>
      ))}
    </div>
  )
}
