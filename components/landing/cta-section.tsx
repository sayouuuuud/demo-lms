'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useReveal } from '@/lib/use-reveal'

const GravityPills = dynamic(() => import('@/components/gravity-pills').then((m) => m.GravityPills), {
  ssr: false,
})

const CTA = {
  badge: 'ابدأ رحلتك دلوقتي',
  title: 'لغتك العربية تستاهل معلّم يفهمها صح.',
  description:
    'انضم لأكاديمية شفاء العليل وخُد أول حصة مجانًا — من النحو والصرف للبلاغة والتعبير، هنمشي معاك خطوة بخطوة.',
  cta1Text: 'سجّل معانا مجانًا',
  cta1Href: '/auth',
  cta2Text: 'اعرف أكتر عن المنصة',
  cta2Href: '#features',
  perks: ['أول حصة مجانًا', 'إلغاء في أي وقت', 'متابعة مع ولي الأمر'],
}

export function CtaSection({ content }: { content?: any }) {
  const contentRef = useReveal<HTMLDivElement>(undefined, { y: 40, duration: 0.8 })

  return (
    <section
      id="cta"
      className="relative min-h-[860px] overflow-hidden bg-background pt-20 md:min-h-[820px]"
    >
      <GravityPills />

      <div
        ref={contentRef}
        className="pointer-events-none relative z-10 mx-auto max-w-2xl px-5 text-center md:px-8"
      >
        <span className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/15 px-4 py-1.5 text-sm font-semibold text-foreground">
          {CTA.badge}
        </span>

        <h2 
          className="mt-5 text-balance text-3xl font-black leading-tight text-foreground md:text-5xl"
          style={{ fontFamily: "'Thmanyah Sans', sans-serif" }}
        >
          {CTA.title}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
          {CTA.description}
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={CTA.cta1Href}
            className="group pointer-events-auto inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-black text-primary-foreground shadow-xl shadow-primary/25 transition-transform hover:-translate-y-0.5"
          >
            {CTA.cta1Text}
            <ArrowLeft className="size-5 transition-transform group-hover:-translate-x-1" />
          </Link>
          <a
            href={CTA.cta2Href}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border-2 border-border bg-card/60 px-7 py-4 text-base font-bold text-foreground backdrop-blur-sm transition-colors hover:bg-card"
          >
            {CTA.cta2Text}
          </a>
        </div>

        <ul className="mx-auto mt-9 flex max-w-xl flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm text-muted-foreground">
          {CTA.perks.map((p) => (
            <li key={p} className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-green" />
              {p}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
