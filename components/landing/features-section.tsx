'use client'

import { Lightbulb, ClipboardCheck, Video, LineChart, CheckCircle, BookOpen, Star } from 'lucide-react'
import { useReveal } from '@/lib/use-reveal'
import { SectionBackdrop } from '@/components/section-backdrop'
import type { FeaturesContent } from '@/lib/site-content-defaults'
import { DEFAULT_SITE_CONTENT } from '@/lib/site-content-defaults'

const iconMap: Record<string, React.ElementType> = {
  lightbulb: Lightbulb,
  clipboard: ClipboardCheck,
  video: Video,
  chart: LineChart,
  check: CheckCircle,
  book: BookOpen,
  star: Star,
}

export function FeaturesSection({ content = DEFAULT_SITE_CONTENT.features }: { content?: FeaturesContent }) {
  const headRef = useReveal<HTMLDivElement>(undefined, { y: 30 })
  const listRef = useReveal<HTMLDivElement>('.feature-row', { y: 40, duration: 0.6 })

  return (
    <section id="features" className="relative overflow-hidden bg-background py-12 md:py-16">
      <SectionBackdrop variant="features" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-5 md:px-8">
        <div ref={headRef} className="max-w-2xl">
          <span className="text-sm font-semibold text-green">{content.badge}</span>
          <h2 
            className="mt-3 text-balance text-[clamp(1.5rem,6.5vw,1.875rem)] font-black leading-tight text-foreground sm:text-4xl lg:text-5xl"
            style={{ fontFamily: "'Thmanyah Sans', sans-serif" }}
          >
            {content.title}
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:mt-5 sm:text-lg">
            {content.description}
          </p>
        </div>

        <div ref={listRef} className="mt-8 md:mt-10 border-t border-border">
          {content.items.map((f, idx) => {
            const IconComponent = iconMap[f.icon.toLowerCase()] || Lightbulb
            return (
              <div
                key={idx}
                className="feature-row group grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-3 border-b border-border py-5 sm:gap-5 md:py-6 transition-colors hover:bg-secondary/40 md:grid-cols-[6rem_3rem_1fr] md:items-center md:gap-8 md:px-4"
              >
                <span className="text-2xl font-black text-foreground/15 transition-colors group-hover:text-gold sm:text-3xl md:text-5xl">
                  {f.step}
                </span>

                <span className="row-start-1 grid size-10 place-items-center rounded-xl bg-gold text-navy-deep transition-transform duration-300 group-hover:-translate-y-1 sm:size-12 md:row-auto">
                  <IconComponent className="size-5 sm:size-6" />
                </span>

                <div className="col-span-2 min-w-0 md:col-span-1">
                  <h3 className="text-pretty text-lg font-bold text-foreground sm:text-xl md:text-2xl">{f.title}</h3>
                  <p className="mt-2 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {f.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
