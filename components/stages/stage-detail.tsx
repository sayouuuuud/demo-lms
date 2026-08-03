import Link from 'next/link'
import { TopographicBackground } from '@/components/topo-background'
import Image from 'next/image'
import {
  ArrowRight,
  PlayCircle,
  Check,
  Layers,
  Sparkles,
} from 'lucide-react'
import type { Stage } from '@/lib/landing-data'

export function StageDetail({
  stage,
}: {
  stage: Stage
}) {
  // Total courses = sum of monthly courses across all branches
  const totalCourses = stage.branches.reduce(
    (sum, b) => sum + (b.monthlyCourses ?? []).length,
    0,
  )
  // Total lessons = lessons from all lectures inside all monthly courses
  const totalLessons = stage.branches.reduce(
    (sum, b) =>
      sum +
      (b.monthlyCourses ?? []).reduce(
        (cs, c) =>
          cs + c.lectures.reduce((ls, l) => ls + l.lessons.length, 0),
        0,
      ),
    0,
  )

  return (
    <main className="min-h-screen bg-[#eee6d5] dark:bg-[#120e0a]">
      {/* ── Header / hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <TopographicBackground lightOpacity={0.4} darkOpacity={0.3} />
        {/* soft gold glow accent */}
        <div
          className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-gold/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-28 md:px-8 md:pb-24 md:pt-32">
          <Link
            href="/#stages"
            className="inline-flex items-center gap-2 text-sm font-semibold text-foreground-soft transition-colors hover:text-foreground dark:text-muted-foreground dark:hover:text-ink-fg"
          >
            <ArrowRight className="size-4" />
            رجوع للمراحل
          </Link>

          <div className="mt-8 grid items-center gap-12 lg:grid-cols-[1.3fr_0.7fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-primary/5 px-4 py-1.5 text-sm font-semibold text-gold-deep backdrop-blur dark:border-white/10 dark:bg-card/5 dark:text-teal-glow">
                <Sparkles className="size-4" />
                المرحلة {stage.index}
              </span>
              <h1 className="mt-5 text-balance font-heading text-4xl font-extrabold leading-tight text-foreground md:text-6xl dark:text-foreground">
                {stage.title}
              </h1>
              <p className="mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-foreground-soft dark:text-muted-foreground">
                {stage.subtitle}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-[#eee6d5]/60 px-4 py-2.5 text-sm text-foreground-soft dark:border-border dark:bg-[#120e0a] dark:text-muted-foreground">
                  <Sparkles className="size-4 text-gold-deep dark:text-teal-glow" />
                  {stage.branches.length} فروع للمادة
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-[#eee6d5]/60 px-4 py-2.5 text-sm text-foreground-soft dark:border-border dark:bg-[#120e0a] dark:text-muted-foreground">
                  <Layers className="size-4 text-emerald-deep dark:text-emerald-brand" />
                  {totalCourses} كورس
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-[#eee6d5]/60 px-4 py-2.5 text-sm text-foreground-soft dark:border-border dark:bg-[#120e0a] dark:text-muted-foreground">
                  <PlayCircle className="size-4 text-emerald-deep dark:text-emerald-brand" />
                  {totalLessons} محاضرة
                </span>
              </div>
            </div>

            <div className="relative aspect-square w-full overflow-hidden rounded-[2rem] border border-border shadow-2xl shadow-navy/10 lg:aspect-[4/5] dark:border-border">
              <Image
                src={stage.image}
                alt={stage.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 420px"
                priority
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/30 to-transparent dark:from-ink-base/80"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>

        {/* curved bottom divider */}
        <div className="relative h-12 md:h-16">
          <div className="absolute inset-x-0 bottom-0 h-12 rounded-t-[2.5rem] bg-[#eee6d5] md:h-16 md:rounded-t-[3.5rem] dark:bg-[#120e0a]" />
        </div>
      </section>

      {/* ── Branches ──────────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
        <div className="flex flex-col items-center text-center">
          <span className="text-sm font-semibold text-gold-deep dark:text-teal-glow">
            <span className="font-mono">{'// '}</span>
            فروع المادة
          </span>
          <h2 className="mt-3 text-balance font-heading text-3xl font-extrabold text-foreground md:text-4xl dark:text-foreground">
            اختار الفرع اللي محتاجه، أو خد المرحلة كاملة
          </h2>
          <p className="mt-3 max-w-2xl text-pretty leading-relaxed text-foreground-soft dark:text-muted-foreground">
            كل فرع مشروح من الصفر خطوة بخطوة، وكل محاضرة وراها امتحان يثبّت المعلومة.
          </p>
        </div>

        <div className="mt-12 grid gap-7 md:grid-cols-3">
          {stage.branches.map((branch, i) => (
            <Link
              key={branch.id}
              href={`/stages/${stage.id}/${branch.id}`}
              className="group relative flex flex-col overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-sm ring-1 ring-transparent transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-navy/10 hover:ring-gold/40 dark:border-border dark:bg-card dark:hover:ring-teal-glow/40"
            >
              {/* branch image with overlays */}
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                <Image
                  src={branch.image}
                  alt={branch.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/70 via-navy/10 to-transparent"
                  aria-hidden="true"
                />
                <span className="absolute right-4 top-4 grid size-11 place-items-center rounded-2xl border border-white/20 bg-primary/80 font-mono text-sm font-bold text-primary-foreground backdrop-blur">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {/* title sits over the image bottom */}
                <h3 className="absolute inset-x-5 bottom-4 font-heading text-2xl font-extrabold text-primary-foreground drop-shadow">
                  {branch.title}
                </h3>
              </div>

              <div className="flex flex-1 flex-col p-6">
                <p className="text-pretty text-sm leading-relaxed text-foreground-soft dark:text-muted-foreground">
                  {branch.description}
                </p>

                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-foreground-soft dark:text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Layers className="size-4 text-emerald-deep" />
                    {(branch.monthlyCourses ?? []).length} كورس
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <PlayCircle className="size-4 text-emerald-deep" />
                    {(branch.monthlyCourses ?? []).reduce(
                      (sum, c) =>
                        sum + c.lectures.reduce((ls, l) => ls + l.lessons.length, 0),
                      0,
                    )} محاضرة
                  </span>
                </div>

                <ul className="mt-5 space-y-2.5 border-t border-border pt-5 dark:border-border">
                  {branch.topics.map((topic) => (
                    <li key={topic} className="flex items-center gap-2.5 text-sm text-foreground dark:text-foreground">
                      <Check className="size-4 shrink-0 text-emerald-deep" />
                      {topic}
                    </li>
                  ))}
                </ul>

                {/* footer: CTA pinned to bottom — no price (prices live on lectures) */}
                <div className="mt-auto flex items-center justify-between gap-3 pt-6">
                  <span className="text-sm font-semibold text-foreground-soft dark:text-muted-foreground">
                    شوف الكورسات والأسعار
                  </span>
                  <span className="inline-flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all duration-200 group-hover:bg-gold group-hover:text-foreground-deep dark:bg-[#120e0a] dark:text-foreground dark:group-hover:bg-violet-glow dark:group-hover:text-white">
                    <ArrowRight className="size-5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>


    </main>
  )
}
