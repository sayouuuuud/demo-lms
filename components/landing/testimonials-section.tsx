'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowRight, Quote, TrendingUp } from 'lucide-react'
import { useReveal } from '@/lib/use-reveal'
import { cn } from '@/lib/utils'
import { IslamicCorners } from '@/components/islamic-corners'

type JourneyPoint = { month: string; score: number }

type Testimonial = {
  name: string
  grade: string
  subject: string
  quote: string
  before: number
  after: number
  journey: JourneyPoint[]
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'محمد أشرف',
    grade: 'الصف الثالث الثانوي',
    subject: 'النحو والإعراب',
    quote:
      'كنت فاكر النحو حفظ وخلاص، بس هنا فهمت إن كل قاعدة ليها منطق. بقيت أعرب أي جملة من غير ما أتوتر، ودرجاتي قفزت بشكل مش متوقع.',
    before: 52,
    after: 94,
    journey: [
      { month: 'سبتمبر', score: 52 },
      { month: 'أكتوبر', score: 58 },
      { month: 'نوفمبر', score: 67 },
      { month: 'ديسمبر', score: 75 },
      { month: 'يناير', score: 83 },
      { month: 'فبراير', score: 89 },
      { month: 'مارس', score: 94 },
    ],
  },
  {
    name: 'سارة محمود',
    grade: 'الصف الثاني الثانوي',
    subject: 'البلاغة والنصوص',
    quote:
      'البلاغة كانت أصعب حاجة عندي، ومع طريقة الشرح بالأمثلة والتذوق الأدبي بقيت أحل سؤال البلاغة كامل. أول مرة أحس إن اللغة العربية ممتعة فعلًا.',
    before: 45,
    after: 90,
    journey: [
      { month: 'سبتمبر', score: 45 },
      { month: 'أكتوبر', score: 53 },
      { month: 'نوفمبر', score: 61 },
      { month: 'ديسمبر', score: 70 },
      { month: 'يناير', score: 79 },
      { month: 'فبراير', score: 85 },
      { month: 'مارس', score: 90 },
    ],
  },
  {
    name: 'يوسف علي',
    grade: 'الصف الأول الثانوي',
    subject: 'القراءة والتعبير',
    quote:
      'التعبير كان بيضيع مني درجات كتير. اتعلمت هنا إزاي أبني موضوع متكامل بأفكار مرتبة وأسلوب قوي، والمتابعة المستمرة خلتني ألتزم وأتحسن كل أسبوع.',
    before: 60,
    after: 96,
    journey: [
      { month: 'سبتمبر', score: 60 },
      { month: 'أكتوبر', score: 66 },
      { month: 'نوفمبر', score: 72 },
      { month: 'ديسمبر', score: 80 },
      { month: 'يناير', score: 87 },
      { month: 'فبراير', score: 92 },
      { month: 'مارس', score: 96 },
    ],
  },
]

const HEADING = {
  badge: 'قصص نجاح طلابنا',
  title: 'من التعثّر إلى التفوّق.',
  description: 'منحنيات تقدّم حقيقية لطلاب بدأوا رحلتهم معانا — الأرقام بتحكي القصة.',
}

function Heading() {
  return (
    <div className="reveal-item mx-auto mb-6 max-w-4xl text-center md:mb-10">
      <span className="text-sm font-semibold text-green">{HEADING.badge}</span>
      <h2 className="mt-3 text-3xl font-black leading-tight text-foreground sm:text-4xl lg:text-5xl">
        {HEADING.title}
      </h2>
      <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
        {HEADING.description}
      </p>
    </div>
  )
}

function TestimonialCard({
  student,
  active = true,
  chartHeightClass = 'h-56 sm:h-64',
  compact = false,
}: {
  student: Testimonial
  active?: boolean
  chartHeightClass?: string
  compact?: boolean
}) {
  const jump = student.after - student.before

  return (
    <div className="grid h-full grid-cols-1 gap-px overflow-hidden rounded-[2rem] border border-border bg-border shadow-2xl shadow-brown/10 lg:grid-cols-5 dark:shadow-black/40">
      <div
        className={cn(
          'relative bg-brown lg:col-span-3 dark:bg-secondary',
          compact ? 'p-4' : 'p-5 sm:p-6 lg:p-7',
        )}
      >
        <div className={cn('flex flex-wrap items-end justify-between gap-4', compact ? 'mb-3' : 'mb-5')}>
          <div>
            <p className="text-xs font-semibold tracking-wider text-gold">منحنى التقدّم</p>
            <p className="mt-1 text-lg font-bold text-background dark:text-foreground">{student.subject}</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-green/20 px-3 py-1.5 text-[oklch(0.80_0.13_155)]">
            <TrendingUp className="size-4" />
            <span className="text-sm font-bold">
              <span className="text-xl font-black">+{jump.toLocaleString('ar-EG')}</span> نقطة
            </span>
          </div>
        </div>

        <div className={cn('w-full min-w-0', chartHeightClass)} dir="ltr">
          <ResponsiveContainer width="99%" height="100%">
            <ComposedChart
              key={active ? 'on' : 'off'}
              data={student.journey}
              margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
            >
              <defs>
                <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand-gold)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--brand-gold)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.10)" vertical />
              <XAxis
                dataKey="month"
                tick={{ fill: 'rgba(245,241,232,0.55)', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tick={{ fill: 'rgba(245,241,232,0.45)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <ReferenceLine
                y={50}
                stroke="rgba(255,255,255,0.25)"
                strokeDasharray="5 5"
                label={{
                  value: 'حد النجاح',
                  position: 'insideTopLeft',
                  fill: 'rgba(245,241,232,0.5)',
                  fontSize: 10,
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="none"
                fill="url(#scoreFill)"
                isAnimationActive
                animationDuration={1400}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="var(--brand-gold)"
                strokeWidth={3}
                dot={{ r: 3, fill: 'var(--brand-brown)', stroke: 'var(--brand-gold)', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: 'var(--brand-gold)' }}
                isAnimationActive
                animationDuration={1600}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className={cn('flex items-center justify-center gap-4', compact ? 'mt-4' : 'mt-6')}>
          <div className="text-center">
            <span className="block text-xs text-background/50 dark:text-muted-foreground">قبل</span>
            <span className={cn('font-bold text-[oklch(0.70_0.19_25)]', compact ? 'text-xl' : 'text-2xl')}>
              {student.before.toLocaleString('ar-EG')}٪
            </span>
          </div>
          <ArrowRight className="size-4 text-background/30 dark:text-muted-foreground" />
          <div className="text-center">
            <span className="block text-xs text-background/50 dark:text-muted-foreground">بعد</span>
            <span className={cn('font-black text-[oklch(0.80_0.13_155)]', compact ? 'text-2xl' : 'text-3xl')}>
              {student.after.toLocaleString('ar-EG')}٪
            </span>
          </div>
        </div>
      </div>

      <div className={cn('flex flex-col bg-card lg:col-span-2', compact ? 'p-4' : 'p-5 sm:p-6 lg:p-7')}>
        <Quote className={cn('text-gold', compact ? 'size-7' : 'size-9')} />
        <blockquote
          className={cn(
            'flex-1 text-pretty font-medium leading-relaxed text-card-foreground',
            compact ? 'mt-2 line-clamp-3 text-sm leading-snug' : 'mt-4 text-lg sm:text-xl',
          )}
        >
          {student.quote}
        </blockquote>

        <div className={cn('border-t border-border', compact ? 'mt-4 pt-4' : 'mt-6 pt-5')}>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'grid place-items-center rounded-full bg-primary font-bold text-primary-foreground',
                compact ? 'size-10' : 'size-12',
              )}
            >
              {student.name.charAt(0)}
            </span>
            <div>
              <p className="font-bold text-card-foreground">{student.name}</p>
              <p className="text-sm text-muted-foreground">{student.grade}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MobileCarousel({ items }: { items: Testimonial[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  const onScroll = () => {
    const el = trackRef.current
    if (!el) return
    const i = Math.round(Math.abs(el.scrollLeft) / el.clientWidth)
    setIndex(Math.min(items.length - 1, Math.max(0, i)))
  }

  const goTo = (i: number) => {
    const el = trackRef.current
    if (!el) return
    const child = el.children[i] as HTMLElement | undefined
    child?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }

  return (
    <div className="reveal-item">
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((s, i) => (
          <div key={i} className="w-full shrink-0 snap-center">
            <TestimonialCard student={s} chartHeightClass="h-32" compact />
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-center gap-2">
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`اذهب إلى التقييم ${(i + 1).toLocaleString('ar-EG')}`}
            aria-current={i === index}
            className={cn(
              'h-2 rounded-full transition-all',
              i === index ? 'w-6 bg-gold' : 'w-2 bg-foreground/20',
            )}
          />
        ))}
      </div>
    </div>
  )
}

function DesktopScrollShowcase({ items }: { items: Testimonial[] }) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const root = document.getElementById('testimonials-desktop')
    const handleScroll = () => {
      if (!root) return
      const rect = root.getBoundingClientRect()
      const scrollableDistance = rect.height - window.innerHeight
      if (scrollableDistance <= 0) return

      const scrolled = -rect.top
      if (scrolled >= 0 && scrolled <= scrollableDistance) {
        const progress = scrolled / scrollableDistance
        const newIndex = Math.min(items.length - 1, Math.max(0, Math.floor(progress * items.length)))
        setActive((prev) => (newIndex !== prev ? newIndex : prev))
      } else if (scrolled < 0) {
        setActive((prev) => (prev !== 0 ? 0 : prev))
      } else if (scrolled > scrollableDistance) {
        setActive((prev) => (prev !== items.length - 1 ? items.length - 1 : prev))
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [items.length])

  return (
    <div id="testimonials-desktop" className="relative h-[300vh]">
      <div className="sticky top-20 flex h-[calc(100vh-5rem)] w-full flex-col justify-center overflow-hidden pb-10 pt-2">
        <IslamicCorners />
        <div className="relative mx-auto w-full max-w-7xl px-8">
          <Heading />
          <div className="reveal-item">
            <TestimonialCard student={items[active]} active />
          </div>
        </div>
      </div>
    </div>
  )
}

export function TestimonialsSection({ content }: { content?: any }) {
  const root = useReveal<HTMLElement>('.reveal-item')

  return (
    <section ref={root} id="testimonials" className="relative bg-background">
      <div className="relative mx-auto w-full max-w-2xl px-5 py-12 md:hidden">
        <IslamicCorners size={110} />
        <Heading />
        <MobileCarousel items={TESTIMONIALS} />
      </div>

      <div className="hidden md:block">
        <DesktopScrollShowcase items={TESTIMONIALS} />
      </div>
    </section>
  )
}
