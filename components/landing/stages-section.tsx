'use client'

import { BookOpen, GraduationCap, Award, Feather, PenTool, Sparkles, Compass, Library } from 'lucide-react'
import { ParchmentCard } from '@/components/parchment-card'
import { useReveal } from '@/lib/use-reveal'

const DEFAULT_STAGES = [
  {
    id: 1,
    name: 'الصف الأول الثانوي',
    description: 'أساسيات اللغة العربية والقواعد الأساسية.',
    icon: BookOpen,
    image: '/images/arabic_manuscript.jpg',
    units: ['النحو والقواعد الأساسية', 'القراءة والفهم', 'التعبير والكتابة'],
  },
  {
    id: 2,
    name: 'الصف الثاني الثانوي',
    description: 'تعمّق في النحو والبلاغة والأدب.',
    icon: GraduationCap,
    image: '/images/golden_quill_arabic.jpg',
    units: ['النحو المتقدم', 'البلاغة والبيان', 'الأدب العربي', 'النصوص والقراءة المتحررة'],
  },
  {
    id: 3,
    name: 'الصف الثالث الثانوي',
    description: 'إتقان اللغة والتحضير للامتحانات.',
    icon: Award,
    image: '/images/arabic_books_stack.jpg',
    units: ['النحو الشامل', 'البلاغة والنقد الأدبي', 'الأدب والنصوص', 'القصة', 'التعبير والمراجعة النهائية'],
  },
]

export function StagesSection({ stages: dbStages }: { stages?: any[] }) {
  const headRef = useReveal<HTMLDivElement>()
  const gridRef = useReveal<HTMLDivElement>('.stage-card-wrap', { y: 40, stagger: 0.18 })

  const displayStages = (dbStages && dbStages.length > 0)
    ? dbStages.map((s, idx) => ({
        id: s.id || idx + 1,
        name: s.title || s.name || DEFAULT_STAGES[idx % DEFAULT_STAGES.length].name,
        description: s.subtitle || s.description || DEFAULT_STAGES[idx % DEFAULT_STAGES.length].description,
        image: s.image || DEFAULT_STAGES[idx % DEFAULT_STAGES.length].image,
        units: (s.branches && s.branches.length > 0)
          ? s.branches.map((b: any) => b.title || b.name)
          : (s.courses && s.courses.length > 0)
            ? s.courses.map((c: any) => c.title || c.name)
            : DEFAULT_STAGES[idx % DEFAULT_STAGES.length].units,
      }))
    : DEFAULT_STAGES

  return (
    <section id="stages" className="relative overflow-hidden bg-[#eee6d5] dark:bg-[#120e0a] py-14 sm:py-20 md:py-32">
      {/* خلفية SVG التراثية ممتدة بعرض الشاشة بالكامل من الحافة للحافة */}
      <div 
        className="absolute bottom-0 w-[100vw] left-1/2 -translate-x-1/2 h-[40%] pointer-events-none z-0 mix-blend-multiply opacity-25"
        style={{
          maskImage: 'linear-gradient(to top, black 85%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, black 85%, transparent 100%)',
        }}
      >
        <img 
          src="/images/picsvg_download.svg?v=3" 
          alt="" 
          aria-hidden="true" 
          className="w-[100vw] min-w-[100vw] h-full object-fill block"
        />
      </div>

      {/* Floating decorative objects (Icons) */}
      <div className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block" aria-hidden="true">
        <Feather className="float-letter-1 absolute top-[15%] left-[8%] size-24 text-gold/30 dark:text-gold/20 blur-[1px] opacity-60" />
        <PenTool className="float-letter-2 absolute top-[25%] right-[12%] size-16 text-brown/30 dark:text-brown/20 opacity-50" />
        <BookOpen className="float-letter-3 absolute bottom-[20%] left-[18%] size-32 text-gold/25 dark:text-gold/15 blur-[2px] opacity-40" />
        <Compass className="float-letter-4 absolute top-[50%] right-[5%] size-20 text-brown/30 dark:text-brown/20 opacity-50" />
        <GraduationCap className="float-letter-5 absolute bottom-[35%] right-[22%] size-28 text-gold/30 dark:text-gold/20 blur-[1px] opacity-40" />
        <Sparkles className="float-letter-6 absolute top-[10%] left-[45%] size-12 text-brown/25 dark:text-brown/15 opacity-50" />
        <Library className="float-letter-7 absolute bottom-[10%] right-[40%] size-24 text-gold/25 dark:text-gold/15 blur-[3px] opacity-40" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 sm:px-6 md:px-10">
        <div ref={headRef} className="max-w-3xl text-center mx-auto mb-12 sm:mb-16 md:mb-20">
          <span className="text-sm font-semibold text-gold">المراحل الدراسية</span>
          <h2
            className="mt-3 text-3xl font-black text-foreground sm:text-4xl lg:text-5xl"
            style={{ fontFamily: "'Thmanyah Sans', sans-serif" }}
          >
            رحلتك التعليمية معانا
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            اختار مرحلتك وابدأ مسارك الصح في فهم وإتقان اللغة العربية.
          </p>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-10 xl:gap-12 justify-items-center">
          {displayStages.map((stage) => (
            <div key={stage.id} className="stage-card-wrap w-full flex justify-center">
              <ParchmentCard
                illustrationSrc={(stage as any).image ?? '/images/math-ink.png'}
                illustrationAlt={stage.name}
                title={stage.name}
                description={stage.description}
                buttonLabel="ادخل المرحلة"
                onAction={() => window.location.href = `/stages/${stage.id}`}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
