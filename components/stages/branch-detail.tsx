'use client'

import { TopographicBackground } from '@/components/topo-background'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  PlayCircle,
  Sparkles,
  Lock,
  Play,
  Layers,
  X,
} from 'lucide-react'
import type { Stage, Branch, Lecture, MonthlyCourse } from '@/lib/landing-data'
import { Check } from 'lucide-react'
import { useCart } from '@/components/cart/cart-provider'

function formatEGP(value: number) {
  return new Intl.NumberFormat('ar-EG').format(value)
}

function LectureCard({ lecture, index }: { lecture: Lecture; index: number }) {
  const [open, setOpen] = useState(false)
  const { add, inCart, setOpen: setCartOpen } = useCart()
  const added = lecture.dbId ? inCart(lecture.dbId) : false

  async function handleAdd() {
    if (lecture.dbId) await add(lecture.dbId, lecture.title)
  }

  // Add (if needed) then open the cart so the student can checkout & pay.
  async function handleBuy() {
    if (!lecture.dbId) return
    if (!added) await add(lecture.dbId, lecture.title)
    setCartOpen(true)
  }

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-sm ring-1 ring-transparent transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-navy/10 hover:ring-emerald-brand/30 dark:border-border dark:bg-card dark:hover:ring-teal-glow/40">
      {/* lecture image with price + number overlays */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-cream to-navy/5 dark:from-ink-base dark:to-ink-raised">
        <Image
          src={lecture.image || `/lessons/${lecture.id}.png`}
          alt={lecture.title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-contain p-6 transition-transform duration-500 group-hover:scale-105"
        />
        {/* number chip */}
        <span className="absolute right-4 top-4 grid size-10 place-items-center rounded-xl border border-border bg-card/90 font-mono text-sm font-bold text-foreground backdrop-blur dark:border-border dark:bg-[#120e0a]/90 dark:text-foreground">
          {String(index + 1).padStart(2, '0')}
        </span>
        {/* badge */}
        {lecture.badge && (
          <span className="absolute left-4 top-4 rounded-full bg-gold px-3 py-1 text-xs font-bold text-foreground shadow-lg dark:bg-primary dark:text-white">
            {lecture.badge}
          </span>
        )}
        {/* price tag — clickable: jumps straight to checkout */}
        <button
          type="button"
          onClick={handleBuy}
          title="اشترك واتمم الدفع"
          className="absolute bottom-4 left-4 inline-flex items-baseline gap-1.5 rounded-2xl bg-primary px-4 py-2 shadow-lg shadow-navy/30 transition-transform hover:scale-105 hover:bg-primary-deep dark:bg-[#120e0a] dark:hover:bg-ink-raised"
        >
          {lecture.oldPrice && (
            <span className="text-xs text-primary-foreground/50 line-through">
              {formatEGP(lecture.oldPrice)}
            </span>
          )}
          <span className="font-heading text-xl font-extrabold text-primary-foreground">
            {formatEGP(lecture.price)}
          </span>
          <span className="text-xs font-bold text-gold dark:text-teal-glow">ج.م</span>
        </button>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h3 className="text-balance font-heading text-lg font-bold text-foreground sm:text-xl dark:text-foreground">{lecture.title}</h3>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-foreground-soft dark:text-muted-foreground">
          {lecture.description}
        </p>

        {/* lessons count + open modal trigger */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-5 flex w-full items-center justify-between rounded-2xl border border-border bg-[#eee6d5]/60 px-4 py-3 text-sm font-bold text-foreground transition-colors hover:bg-[#eee6d5] dark:border-border dark:bg-[#120e0a]/60 dark:text-foreground dark:hover:bg-ink-base"
        >
          <span className="inline-flex min-w-0 items-center gap-2 text-start">
            <Layers className="size-4 shrink-0 text-emerald-deep" />
            محتوى المحاضرة ({lecture.lessons.length} محاضرة)
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-emerald-deep">
            عرض
            <ArrowRight className="size-3.5 -rotate-180" />
          </span>
        </button>

        {/* CTAs pinned to bottom: primary "اشترك" goes straight to checkout,
            secondary toggles the cart. */}
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleBuy}
            className="flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-deep dark:bg-primary dark:text-white dark:hover:bg-violet-deep"
          >
            <span>{`اشترك الآن — ${formatEGP(lecture.price)} ج.م`}</span>
            <ArrowRight className="size-4 -rotate-180" />
          </button>
          <button
            type="button"
            onClick={handleAdd}
            className={`flex items-center justify-center gap-2 rounded-full border px-6 py-2.5 text-sm font-bold transition-colors ${
              added
                ? 'border-emerald-brand/30 bg-emerald-brand/15 text-emerald-deep dark:border-teal-glow/30 dark:bg-teal-glow/15 dark:text-teal-glow'
                : 'border-border text-foreground hover:bg-primary/5 dark:border-border dark:text-foreground dark:hover:bg-ink-base'
            }`}
          >
            {added ? (
              <>
                <Check className="size-4" />
                <span>{'في السلة'}</span>
              </>
            ) : (
              <span>{'أضف للسلة'}</span>
            )}
          </button>
        </div>
      </div>

      {/* lessons panel — overlays the card itself (not a centered modal) */}
      {open && (
        <div className="absolute inset-0 z-10 flex flex-col bg-card dark:bg-card">
          {/* panel header */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-[#eee6d5]/60 px-5 py-4 dark:border-border dark:bg-[#120e0a]/60">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-deep">
                <Layers className="size-3.5" />
                محتوى المحاضرة
              </span>
              <h3 className="mt-0.5 font-heading text-lg font-bold text-foreground dark:text-foreground">{lecture.title}</h3>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-9 shrink-0 place-items-center rounded-full bg-card text-foreground shadow-sm transition-colors hover:bg-primary hover:text-primary-foreground dark:bg-[#120e0a] dark:text-foreground dark:hover:bg-violet-glow dark:hover:text-white"
              aria-label="إغلاق"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* lessons list (scrollable inside the card) */}
          <ul className="flex-1 space-y-1 overflow-y-auto p-3">
            {lecture.lessons.map((lesson, li) => (
              <li
                key={lesson.id}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[#eee6d5]/60 dark:hover:bg-ink-base/60"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-lg ${
                      lesson.isFree
                        ? 'bg-emerald-brand/15 text-emerald-deep'
                        : 'bg-primary/5 text-foreground-soft dark:bg-[#120e0a] dark:text-muted-foreground'
                    }`}
                  >
                    {lesson.isFree ? <Play className="size-3.5" /> : <Lock className="size-3.5" />}
                  </span>
                  <div>
                    <span className="block text-sm font-semibold text-foreground dark:text-foreground">
                      {li + 1}. {lesson.title}
                    </span>
                    {lesson.isFree && (
                      <span className="text-xs font-bold text-emerald-deep">معاينة مجانية</span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 font-mono text-xs text-foreground-soft dark:text-muted-foreground">
                  {lesson.duration}
                </span>
              </li>
            ))}
          </ul>

          {/* panel footer CTA — go straight to checkout */}
          <div className="shrink-0 border-t border-border p-3 dark:border-border">
            <button
              type="button"
              onClick={handleBuy}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-deep dark:bg-primary dark:text-white dark:hover:bg-violet-deep"
            >
              <span>{`اشترك الآن بـ ${formatEGP(lecture.price)} ج.م`}</span>
              <ArrowRight className="size-4 -rotate-180" />
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

function MonthlyCourseCard({ course, index, href }: { course: MonthlyCourse; index: number; href: string }) {
  const { addCourse, courseInCart, setOpen: setCartOpen } = useCart()
  const added = course.dbId ? courseInCart(course.dbId) : false
  const lessonsCount = course.lectures.reduce((sum, lecture) => sum + lecture.lessons.length, 0)
  const freeCount = course.lectures.filter((lecture) => lecture.isFree).length

  async function handleAdd(openCart = false) {
    if (!course.dbId) return
    if (!added) await addCourse(course.dbId, course.title)
    if (openCart) setCartOpen(true)
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-border dark:bg-card">
      <Link href={href} className="relative block aspect-[16/10] overflow-hidden bg-[#eee6d5] dark:bg-[#120e0a]">
        <Image src={course.image || course.lectures[0]?.image || '/lessons/complex-numbers.png'} alt={course.title} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover transition-transform duration-500 hover:scale-105" />
        <span className="absolute right-4 top-4 grid size-10 place-items-center rounded-xl bg-card/90 font-mono text-sm font-bold text-foreground">{String(index + 1).padStart(2, '0')}</span>
        {course.badge && <span className="absolute left-4 top-4 rounded-full bg-gold px-3 py-1 text-xs font-bold text-foreground">{course.badge}</span>}
        {freeCount > 0 && <span className="absolute bottom-4 right-4 inline-flex items-center gap-1 rounded-full bg-emerald-deep px-3 py-1 text-xs font-bold text-primary-foreground"><Play className="size-3" />{freeCount} مجانية</span>}
      </Link>
      <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-col gap-2">
          <Link href={href}>
            <h3 className="text-balance font-heading text-lg font-bold text-foreground transition-colors hover:text-emerald-deep sm:text-xl dark:text-foreground dark:hover:text-teal-glow">{course.title}</h3>
          </Link>
          <p className="text-pretty text-sm leading-relaxed text-foreground-soft dark:text-muted-foreground">{course.description}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold text-foreground-soft dark:text-muted-foreground">
          <span className="rounded-lg bg-[#eee6d5] px-3 py-2 dark:bg-[#120e0a]">{course.lectures.length} محاضرة</span>
          <span className="rounded-lg bg-[#eee6d5] px-3 py-2 dark:bg-[#120e0a]">{lessonsCount} درس</span>
        </div>
        <Link href={href} className="flex items-center justify-between rounded-2xl border border-border bg-[#eee6d5]/60 px-4 py-3 text-sm font-bold text-foreground transition-colors hover:bg-[#eee6d5] dark:border-border dark:bg-[#120e0a] dark:text-foreground dark:hover:bg-ink-raised">
          <span className="min-w-0 flex-1 text-start">عرض تفاصيل الكورس والمحاضرات</span><ArrowRight className="size-4 shrink-0 -rotate-180" />
        </Link>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 dark:border-border">
          <div><strong className="font-heading text-xl text-foreground dark:text-foreground">{formatEGP(course.price)}</strong> <span className="text-xs font-bold text-gold-deep">ج.م</span></div>
          <button type="button" onClick={() => handleAdd(true)} className="flex-1 rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground sm:flex-none sm:px-5 dark:bg-primary">{added ? 'أكمل الشراء' : 'اشترك في الكورس'}</button>
        </div>
      </div>
    </article>
  )
}

export function BranchDetail({ stage, branch }: { stage: Stage; branch: Branch }) {
  const courses = branch.monthlyCourses ?? []
  const totalLessons = courses.reduce((sum, course) => sum + course.lectures.reduce((lectureSum, lecture) => lectureSum + lecture.lessons.length, 0), 0)

  return (
    <main className="min-h-screen bg-[#eee6d5] dark:bg-[#120e0a]">
      {/* ── Header / hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <TopographicBackground lightOpacity={0.4} darkOpacity={0.3} />
        <div
          className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-gold/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-24 sm:px-5 sm:pb-16 sm:pt-28 md:px-8 md:pb-24 md:pt-32">
          {/* breadcrumb */}
          <nav className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-foreground-soft sm:text-sm dark:text-muted-foreground">
            <Link href="/#stages" className="transition-colors hover:text-foreground dark:hover:text-ink-fg">
              المراحل
            </Link>
            <ArrowRight className="size-3.5" />
            <Link href={`/stages/${stage.id}`} className="transition-colors hover:text-foreground dark:hover:text-ink-fg">
              {stage.title}
            </Link>
            <ArrowRight className="size-3.5" />
            <span className="text-foreground dark:text-foreground">{branch.title}</span>
          </nav>

          <div className="mt-6 grid items-center gap-8 sm:mt-8 md:gap-12 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-primary/5 px-4 py-1.5 text-sm font-semibold text-gold-deep backdrop-blur dark:border-white/10 dark:bg-card/5 dark:text-teal-glow">
                <Sparkles className="size-4" />
                فرع من {stage.title}
              </span>
              <h1 className="mt-4 text-balance font-heading text-[clamp(1.75rem,7vw,2.5rem)] font-extrabold leading-tight text-foreground sm:mt-5 md:text-5xl lg:text-6xl dark:text-foreground">
                {branch.title}
              </h1>
              <p className="mt-3 max-w-2xl text-pretty text-base leading-relaxed text-foreground-soft sm:mt-4 sm:text-lg dark:text-muted-foreground">
                {branch.description}
              </p>

              <div className="mt-6 flex flex-wrap gap-2 sm:mt-8 sm:gap-3">
                <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-[#eee6d5]/60 px-3 py-2 text-xs text-foreground-soft sm:px-4 sm:py-2.5 sm:text-sm dark:border-border dark:bg-[#120e0a] dark:text-muted-foreground">
                  <Layers className="size-4 shrink-0 text-gold-deep dark:text-teal-glow" />
                  {courses.length} كورس
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-[#eee6d5]/60 px-3 py-2 text-xs text-foreground-soft sm:px-4 sm:py-2.5 sm:text-sm dark:border-border dark:bg-[#120e0a] dark:text-muted-foreground">
                  <PlayCircle className="size-4 shrink-0 text-emerald-deep dark:text-emerald-brand" />
                  {totalLessons} محاضرة
                </span>
              </div>
            </div>

            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl border border-border shadow-2xl shadow-navy/10 sm:aspect-[16/9] md:rounded-[2rem] lg:aspect-[4/5] dark:border-border">
              <Image
                src={branch.image}
                alt={branch.title}
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

      {/* ── Monthly courses ─────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-6xl px-4 py-10 sm:px-5 sm:py-12 md:px-8 md:py-16">
        <div className="flex flex-col items-center text-center">
          <span className="text-sm font-semibold text-gold-deep dark:text-teal-glow">
            <span className="font-mono">{'// '}</span>
            كورسات الفرع
          </span>
          <h2 className="mt-3 text-balance font-heading text-[clamp(1.5rem,6vw,2rem)] font-extrabold text-foreground md:text-4xl dark:text-foreground">
            اختار الكورس اللي محتاجه
          </h2>
          <p className="mt-3 max-w-2xl text-pretty text-sm leading-relaxed text-foreground-soft sm:text-base dark:text-muted-foreground">
            كل كورس بيجمع محاضرات الشهر بالترتيب، وتقدر تعرض تفاصيله وتشترك فيه كاملًا.
          </p>
        </div>

        {courses.length > 0 ? (
          <div className="mt-8 grid gap-5 sm:mt-12 sm:grid-cols-2 sm:gap-7">
            {courses.map((course, index) => <MonthlyCourseCard key={course.dbId ?? course.id} course={course} index={index} href={`/stages/${stage.id}/${branch.id}/${course.id}`} />)}
          </div>
        ) : (
          <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-dashed border-border bg-card p-10 text-center text-foreground-soft dark:border-border dark:bg-card dark:text-muted-foreground">
            لم تتم إضافة كورسات لهذا الفرع حتى الآن.
          </div>
        )}

        {/* back to stage */}
        <div className="mt-12 flex justify-center">
          <Link
            href={`/stages/${stage.id}`}
            className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-bold text-foreground transition-colors hover:bg-primary/5 dark:border-border dark:text-foreground dark:hover:bg-ink-raised"
          >
            <ArrowRight className="size-4" />
            رجوع لفروع {stage.title}
          </Link>
        </div>
      </section>
    </main>
  )
}
