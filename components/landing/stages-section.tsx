'use client'

import { BookOpen, GraduationCap, Award } from 'lucide-react'
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
        image: DEFAULT_STAGES[idx % DEFAULT_STAGES.length].image,
        units: (s.branches && s.branches.length > 0)
          ? s.branches.map((b: any) => b.title || b.name)
          : (s.courses && s.courses.length > 0)
            ? s.courses.map((c: any) => c.title || c.name)
            : DEFAULT_STAGES[idx % DEFAULT_STAGES.length].units,
      }))
    : DEFAULT_STAGES

  return (
    <section id="stages" className="relative overflow-hidden bg-[#eee6d5] dark:bg-[#120e0a] py-20 md:py-32">
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

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 md:px-10">
        <div ref={headRef} className="max-w-3xl text-center mx-auto mb-20">
          <span className="text-sm font-bold tracking-widest text-gold uppercase" style={{ fontFamily: 'var(--font-cairo)' }}>
            رحلتك التعليمية
          </span>
          <h2
            className="mt-4 text-4xl leading-tight text-foreground sm:text-5xl lg:text-6xl font-black"
            style={{ fontFamily: "'Thmanyah Sans', sans-serif" }}
          >
            المراحل الدراسية
          </h2>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
            من البداية وحتى إتقان اللغة العربية، صممنا لك مساراً يضمن لك التفوق بخطوات واثقة ومستندة على جذور لغتنا الأصيلة.
          </p>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12 justify-items-center">
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
