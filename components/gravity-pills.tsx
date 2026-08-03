'use client'

import { useEffect, useRef } from 'react'
import Matter from 'matter-js'

type Pill = {
  label: string
  /** tailwind bg + text classes */
  className: string
  /** shape used by the physics body */
  shape?: 'pill' | 'circle'
  /** relative font scale */
  big?: boolean
}

const PILLS: Pill[] = [
  { label: 'نحو', className: 'bg-primary text-primary-foreground', big: true },
  { label: 'صرف', className: 'bg-brown text-background dark:bg-secondary dark:text-secondary-foreground dark:ring-1 dark:ring-border', big: true },
  { label: 'بلاغة', className: 'bg-green text-[oklch(0.97_0.01_90)]', big: true },
  { label: 'إملاء', className: 'bg-gold text-primary-foreground' },
  { label: 'أدب', className: 'bg-brown text-background dark:bg-secondary dark:text-secondary-foreground dark:ring-1 dark:ring-border' },
  { label: 'نصوص', className: 'bg-green text-[oklch(0.97_0.01_90)]' },
  { label: 'قراءة', className: 'bg-primary text-primary-foreground', big: true },
  { label: 'تعبير', className: 'bg-green text-[oklch(0.97_0.01_90)]' },
  { label: 'ض', className: 'bg-primary text-primary-foreground', shape: 'circle', big: true },
  { label: 'ألف', className: 'bg-green text-[oklch(0.97_0.01_90)]', shape: 'circle', big: true },
  { label: 'يا', className: 'bg-brown text-background dark:bg-secondary dark:text-secondary-foreground dark:ring-1 dark:ring-border', shape: 'circle', big: true },
  { label: 'واو', className: 'bg-gold text-primary-foreground', shape: 'circle' },
]

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}

export function GravityPills() {
  const sceneRef = useRef<HTMLDivElement>(null)
  const pillRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const w = scene.clientWidth
    // الحجم يتناسب مع عرض المشهد نفسه، فتبقى الكثافة البصرية ثابتة على أي شاشة
    // (درجة ثابتة للديسكتوب كانت تبان ضخمة على 1100px وصغيرة على 1900px).
    // الحد الأدنى يمنعها من الاختفاء على الموبايل، والأقصى يمنعها من التضخّم.
    const scale = Math.min(1.3, Math.max(0.46, w / 1450))

    pillRefs.current.forEach((el, i) => {
      if (!el) return
      const p = PILLS[i]
      const base = p.shape === 'circle' ? (p.big ? 128 : 96) : p.big ? 104 : 84
      const h = Math.round(base * scale)
      el.style.height = `${h}px`
      if (p.shape === 'circle') {
        el.style.width = `${h}px`
      } else {
        const pad = Math.max(12, Math.round(32 * scale))
        el.style.paddingInline = `${pad}px`
      }
      el.style.fontSize = `${Math.round((p.big ? 40 : 30) * scale)}px`
    })

    const { Engine, Runner, World, Bodies, Body, Mouse, MouseConstraint, Composite, Events } = Matter

    const engine = Engine.create()
    engine.gravity.y = 1

    let width = scene.clientWidth
    let height = scene.clientHeight
    const wall = 80

    const createWalls = () => [
      Bodies.rectangle(width / 2, height + wall / 2, width + wall * 2, wall, { isStatic: true }),
      Bodies.rectangle(-wall / 2, height / 2, wall, height * 3, { isStatic: true }),
      Bodies.rectangle(width + wall / 2, height / 2, wall, height * 3, { isStatic: true }),
    ]

    let walls = createWalls()
    World.add(engine.world, walls)

    const bodies: { body: Matter.Body; el: HTMLDivElement }[] = []
    pillRefs.current.forEach((el, i) => {
      if (!el) return
      const bw = el.offsetWidth
      const bh = el.offsetHeight
      const isCircle = PILLS[i].shape === 'circle'
      const cols = pillRefs.current.length
      const colW = width / cols
      const startX = Math.min(width - bw / 2, Math.max(bw / 2, colW * (i + 0.5) + rand(-colW / 3, colW / 3)))
      const startY = rand(-700, -60)
      const body = isCircle
        ? Bodies.circle(startX, startY, bh / 2, { restitution: 0.35, friction: 0.4, frictionAir: 0.02 })
        : Bodies.rectangle(startX, startY, bw, bh, {
            chamfer: { radius: bh / 2 },
            restitution: 0.35,
            friction: 0.4,
            frictionAir: 0.02,
          })
      Body.setAngle(body, rand(-0.4, 0.4))
      bodies.push({ body, el })
      World.add(engine.world, body)
    })

    // سحب بالماوس
    const mouse = Mouse.create(scene)
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: { stiffness: 0.2, render: { visible: false } },
    })
    World.add(engine.world, mouseConstraint)
    // السماح بتمرير الصفحة فوق المشهد
    mouse.element.removeEventListener('wheel', (mouse as unknown as { mousewheel: EventListener }).mousewheel)
    mouse.element.removeEventListener('DOMMouseScroll', (mouse as unknown as { mousewheel: EventListener }).mousewheel)

    const runner = Runner.create()

    const syncDom = () => {
      for (const { body, el } of bodies) {
        const { x, y } = body.position
        el.style.transform = `translate(${x - el.offsetWidth / 2}px, ${y - el.offsetHeight / 2}px) rotate(${body.angle}rad)`
      }
    }

    Events.on(engine, 'afterUpdate', syncDom)

    // ثبّت كل جسم في مكانه قبل أول رسم
    pillRefs.current.forEach((el, i) => {
      const entry = bodies[i]
      if (!el || !entry) return
      const { x, y } = entry.body.position
      el.style.transform = `translate(${x - el.offsetWidth / 2}px, ${y - el.offsetHeight / 2}px) rotate(${entry.body.angle}rad)`
      el.style.opacity = '1'
    })

    let started = false
    let io: IntersectionObserver | null = null

    if (prefersReduced) {
      // كومة مستقرة مسبقًا بدون حركة ظاهرة
      for (let i = 0; i < 480; i++) Engine.update(engine, 1000 / 60)
      syncDom()
      started = true
      Runner.run(runner, engine)
    } else {
      const startDrop = () => {
        if (started) return
        started = true
        width = scene.clientWidth
        height = scene.clientHeight
        Composite.remove(engine.world, walls)
        walls = createWalls()
        World.add(engine.world, walls)
        Runner.run(runner, engine)
      }
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) startDrop()
        },
        { threshold: 0.15 },
      )
      io.observe(scene)
      const rect = scene.getBoundingClientRect()
      if (rect.top < window.innerHeight && rect.bottom > 0) startDrop()
      window.setTimeout(startDrop, 1800)
    }

    const handleResize = () => {
      const newW = scene.clientWidth
      const newH = scene.clientHeight
      if (newW === width && newH === height) return
      width = newW
      height = newH
      Composite.remove(engine.world, walls)
      walls = createWalls()
      World.add(engine.world, walls)
    }
    const ro = new ResizeObserver(handleResize)
    ro.observe(scene)

    return () => {
      io?.disconnect()
      ro.disconnect()
      Runner.stop(runner)
      World.clear(engine.world, false)
      Engine.clear(engine)
      Events.off(engine, 'afterUpdate', syncDom)
    }
  }, [])

  return (
    <div ref={sceneRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" aria-hidden="true">
      {PILLS.map((p, i) => (
        <div
          key={p.label}
          ref={(el) => {
            pillRefs.current[i] = el
          }}
          className={`absolute left-0 top-0 flex select-none items-center justify-center font-extrabold shadow-xl will-change-transform ${
            p.shape === 'circle' ? 'rounded-full' : 'rounded-full px-8'
          } ${p.className}`}
          style={{
            opacity: 0,
            height: p.shape === 'circle' ? (p.big ? 128 : 96) : p.big ? 104 : 84,
            width: p.shape === 'circle' ? (p.big ? 128 : 96) : undefined,
            fontSize: p.big ? 40 : 30,
          }}
        >
          {p.label}
        </div>
      ))}
    </div>
  )
}
