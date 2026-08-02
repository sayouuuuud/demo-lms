'use client'

import { Lightbulb, ClipboardCheck, Video, LineChart } from 'lucide-react'
import { useReveal } from '@/lib/use-reveal'
import { SectionBackdrop } from '@/components/section-backdrop'

const features = [
  {
    step: '٠١',
    title: 'أساس متين من الجذور',
    description:
      'بنبدأ من الفكرة الأساسية لكل قاعدة — نحو، صرف، بلاغة — عشان تفهمها مش تحفظها، وتقدر تطبّقها على أي نص.',
    icon: Lightbulb,
  },
  {
    step: '٠٢',
    title: 'تدريب مستمر على كل درس',
    description:
      'بعد كل حصة تمارين وواجبات متدرّجة الصعوبة، من الإعراب البسيط لتحليل النصوص، لحد ما القاعدة تثبت معاك.',
    icon: ClipboardCheck,
  },
  {
    step: '٠٣',
    title: 'حصص مسجّلة تراجعها في أي وقت',
    description:
      'كل الحصص متاحة بجودة عالية تقدر ترجعلها وقت ما تحتاج، مع ملخصات ومذكرات لكل فرع من فروع اللغة.',
    icon: Video,
  },
  {
    step: '٠٤',
    title: 'متابعة وتقارير دورية',
    description:
      'تقارير مستمرة لك ولولي أمرك توضح مستواك في كل فرع، ونقاط القوة والضعف، وخطة التحسين خطوة بخطوة.',
    icon: LineChart,
  },
]

export function FeaturesSection() {
  const headRef = useReveal<HTMLDivElement>(undefined, { y: 30 })
  const listRef = useReveal<HTMLDivElement>('.feature-row', { y: 40, duration: 0.6 })

  return (
    <section id="features" className="relative overflow-hidden bg-background py-12 md:py-16">
      <SectionBackdrop variant="features" />
      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <div ref={headRef} className="max-w-2xl">
          <span className="text-sm font-semibold text-green">إزاي بنذاكر مع بعض</span>
          <h2 
            className="mt-3 text-balance text-3xl font-black leading-tight text-foreground sm:text-4xl lg:text-5xl"
            style={{ fontFamily: "'Thmanyah Sans', sans-serif" }}
          >
            نظام تعليمي متكامل، مبني على خطوات واضحة.
          </h2>
          <p className="mt-5 text-pretty text-lg leading-relaxed text-muted-foreground">
            مش مجرد فيديوهات؛ ده مسار متدرّج يمسكك من أول قاعدة لحد ما تدخل الامتحان واثق من لغتك.
          </p>
        </div>

        <div ref={listRef} className="mt-8 md:mt-10 border-t border-border">
          {features.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.step}
                className="feature-row group grid grid-cols-[auto_1fr] items-start gap-5 border-b border-border py-5 md:py-6 transition-colors hover:bg-secondary/40 md:grid-cols-[6rem_3rem_1fr] md:items-center md:gap-8 md:px-4"
              >
                <span className="text-3xl font-black text-foreground/15 transition-colors group-hover:text-gold md:text-5xl">
                  {f.step}
                </span>

                <span className="row-start-1 grid size-12 place-items-center rounded-xl bg-gold text-navy-deep transition-transform duration-300 group-hover:-translate-y-1 md:row-auto">
                  <Icon className="size-6" />
                </span>

                <div className="col-span-2 md:col-span-1">
                  <h3 className="text-xl font-bold text-foreground md:text-2xl">{f.title}</h3>
                  <p className="mt-2 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
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
