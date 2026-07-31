'use server'

import { prisma } from '@/lib/prisma'
import { hasResourceAccess } from '@/lib/auth-guard'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/audit-log'
import { auth } from '@/auth'
import { Prisma } from '@prisma/client'
import {
  computeAutoDifficulty,
  normalizeDifficulty,
  type BankQuestion,
  type Difficulty,
  type ScopeType,
} from '@/lib/question-bank'

// ─── خرائط الشجرة ─────────────────────────────────────────────────────────────

export type TreeStage = {
  id: string
  title: string
  branches: {
    id: string
    title: string
    monthlyCourses: {
      id: string
      title: string
      lectures: { id: string; title: string }[]
    }[]
    looseLectures: { id: string; title: string }[]
  }[]
}

export async function getContentTree(): Promise<TreeStage[]> {
  if (!(await hasResourceAccess('question-bank'))) return []

  const [stages, branches, monthlyCourses, lectures] = await Promise.all([
    prisma.stages.findMany({ select: { id: true, title: true, sort_order: true }, orderBy: [{ sort_order: 'asc' }, { title: 'asc' }] }),
    prisma.branches.findMany({ select: { id: true, title: true, stage_id: true }, orderBy: { title: 'asc' } }),
    prisma.monthly_courses.findMany({ select: { id: true, title: true, branch_id: true }, orderBy: [{ sort_order: 'asc' }, { title: 'asc' }] }),
    prisma.lectures.findMany({ select: { id: true, title: true, branch_id: true, monthly_course_id: true }, orderBy: [{ course_sort_order: 'asc' }, { sort_order: 'asc' }] }),
  ])

  const branchMap   = new Map(branches.map(b  => [b.id, b]))
  const courseMap   = new Map(monthlyCourses.map(c => [c.id, c]))

  // بناء الشجرة
  const stageTree = new Map<string, TreeStage>()
  for (const s of stages) {
    stageTree.set(s.id, { id: s.id, title: s.title, branches: [] })
  }

  const branchTree = new Map<string, TreeStage['branches'][0]>()
  for (const b of branches) {
    const node = { id: b.id, title: b.title, monthlyCourses: [], looseLectures: [] }
    branchTree.set(b.id, node)
    const stageNode = stageTree.get(b.stage_id)
    if (stageNode) stageNode.branches.push(node)
  }

  const courseTree = new Map<string, TreeStage['branches'][0]['monthlyCourses'][0]>()
  for (const c of monthlyCourses) {
    const node = { id: c.id, title: c.title, lectures: [] }
    courseTree.set(c.id, node)
    const branchNode = branchTree.get(c.branch_id)
    if (branchNode) branchNode.monthlyCourses.push(node)
  }

  for (const l of lectures) {
    const lectureRef = { id: l.id, title: l.title }
    if (l.monthly_course_id) {
      const courseNode = courseTree.get(l.monthly_course_id)
      if (courseNode) courseNode.lectures.push(lectureRef)
    } else {
      const branchNode = branchTree.get(l.branch_id)
      if (branchNode) branchNode.looseLectures.push(lectureRef)
    }
  }

  return Array.from(stageTree.values())
}

// ─── توسيع النطاقات أوتوماتيك (private) ──────────────────────────────────────

type ScopeInput = { scopeType: ScopeType; scopeId: string }

/** أي client — الـ prisma العام أو الـ tx جوه transaction */
type DbClient = Pick<typeof prisma, 'lectures' | 'monthly_courses' | 'branches'>

async function autoExpandScopes(inputs: ScopeInput[], db: DbClient = prisma): Promise<ScopeInput[]> {
  const seen = new Set<string>()
  const result: ScopeInput[] = []

  const add = (scopeType: ScopeType, scopeId: string) => {
    const key = `${scopeType}:${scopeId}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push({ scopeType, scopeId })
    }
  }

  for (const inp of inputs) {
    add(inp.scopeType, inp.scopeId)
  }

  for (const inp of inputs) {
    if (inp.scopeType === 'lecture') {
      const lec = await db.lectures.findUnique({
        where: { id: inp.scopeId },
        select: { branch_id: true, monthly_course_id: true, branches: { select: { stage_id: true } } },
      })
      if (!lec) continue
      if (lec.monthly_course_id) add('monthly_course', lec.monthly_course_id)
      add('branch', lec.branch_id)
      if (lec.branches?.stage_id) add('stage', lec.branches.stage_id)
    } else if (inp.scopeType === 'monthly_course') {
      const course = await db.monthly_courses.findUnique({
        where: { id: inp.scopeId },
        select: { branch_id: true, branches: { select: { stage_id: true } } },
      })
      if (!course) continue
      add('branch', course.branch_id)
      if (course.branches?.stage_id) add('stage', course.branches.stage_id)
    } else if (inp.scopeType === 'branch') {
      const branch = await db.branches.findUnique({
        where: { id: inp.scopeId },
        select: { stage_id: true },
      })
      if (branch?.stage_id) add('stage', branch.stage_id)
    }
  }

  return result
}

// ─── محوّل الصف لـ BankQuestion (private) ─────────────────────────────────────

type QBRow = {
  id: string
  question_text: string
  question_type: string
  content_mode: string
  image_url: string | null
  options: Prisma.JsonValue
  correct_answer: string | null
  model_answer: string | null
  points: number
  difficulty: string
  auto_difficulty: string | null
  usage_count: number
  last_used_at: Date | null
  answers_count: number
  correct_count: number
  notes: string | null
  created_at: Date
  scopes: { scope_type: string; scope_id: string }[]
  topics: { topic: { id: string; title: string } }[]
}

function toBankQuestion(row: QBRow, labelMap: Map<string, string>): BankQuestion {
  const opts = Array.isArray(row.options) ? (row.options as unknown[]).map(String) : []
  return {
    id:             row.id,
    type:           row.question_type as BankQuestion['type'],
    contentMode:    row.content_mode as 'text' | 'image',
    text:           row.question_text,
    imageUrl:       row.image_url ?? '',
    options:        opts,
    correctAnswer:  row.correct_answer,
    modelAnswer:    row.model_answer ?? '',
    points:         row.points,
    difficulty:     normalizeDifficulty(row.difficulty),
    autoDifficulty: row.auto_difficulty ? normalizeDifficulty(row.auto_difficulty) : null,
    usageCount:     row.usage_count,
    lastUsedAt:     row.last_used_at ? row.last_used_at.toISOString() : null,
    answersCount:   row.answers_count,
    correctCount:   row.correct_count,
    successRate:    row.answers_count > 0 ? row.correct_count / row.answers_count : null,
    notes:          row.notes ?? '',
    topics:         row.topics.map(t => ({ id: t.topic.id, title: t.topic.title })),
    scopes:         row.scopes.map(s => ({
      scopeType: s.scope_type as ScopeType,
      scopeId:   s.scope_id,
      label:     labelMap.get(`${s.scope_type}:${s.scope_id}`) ?? '(محذوف)',
    })),
    createdAt:      row.created_at.toISOString(),
  }
}

async function buildLabelMap(rows: QBRow[]): Promise<Map<string, string>> {
  const byType: Record<ScopeType, string[]> = {
    stage: [], branch: [], monthly_course: [], lecture: [],
  }
  for (const row of rows) {
    for (const s of row.scopes) {
      const t = s.scope_type as ScopeType
      if (byType[t] && !byType[t].includes(s.scope_id)) byType[t].push(s.scope_id)
    }
  }

  const [stages, branches, courses, lectures] = await Promise.all([
    byType.stage.length ? prisma.stages.findMany({ where: { id: { in: byType.stage } }, select: { id: true, title: true } }) : [],
    byType.branch.length ? prisma.branches.findMany({ where: { id: { in: byType.branch } }, select: { id: true, title: true } }) : [],
    byType.monthly_course.length ? prisma.monthly_courses.findMany({ where: { id: { in: byType.monthly_course } }, select: { id: true, title: true } }) : [],
    byType.lecture.length ? prisma.lectures.findMany({ where: { id: { in: byType.lecture } }, select: { id: true, title: true } }) : [],
  ])

  const map = new Map<string, string>()
  for (const s of stages)   map.set(`stage:${s.id}`, s.title)
  for (const b of branches)  map.set(`branch:${b.id}`, b.title)
  for (const c of courses)   map.set(`monthly_course:${c.id}`, c.title)
  for (const l of lectures)  map.set(`lecture:${l.id}`, l.title)

  return map
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export type SaveBankQuestionInput = {
  id?: string | null
  type: 'mcq' | 'essay' | 'file'
  contentMode: 'text' | 'image'
  text: string
  imageUrl: string
  options: string[]
  correctAnswer: string | null
  modelAnswer: string
  points: number
  difficulty: Difficulty
  notes: string
  topics: string[]
  scopes: ScopeInput[]
}

export async function saveBankQuestion(input: SaveBankQuestionInput): Promise<{ success?: true; id?: string; error?: string }> {
  if (!(await hasResourceAccess('question-bank', 'manage'))) {
    return { error: 'غير مسموح. لازم تكون أدمن.' }
  }

  // تحقق
  if (input.contentMode === 'text' && !input.text.trim()) return { error: 'اكتب نص السؤال' }
  if (input.contentMode === 'image' && !input.imageUrl.trim()) return { error: 'ارفع صورة السؤال' }

  if (input.type === 'mcq') {
    const cleanedOpts = input.options.map(o => o.trim()).filter(Boolean)
    if (cleanedOpts.length < 2) return { error: 'لازم خيارين على الأقل' }
    if (!cleanedOpts.includes((input.correctAnswer ?? '').trim())) return { error: 'حدّد الإجابة الصحيحة' }
  }

  if (input.points < 1 || input.points > 100) return { error: 'الدرجة لازم بين 1 و100' }

  const session = await auth()
  const userId = (session?.user as any)?.id as string | undefined

  try {
    let q: { id: string }

    await prisma.$transaction(async (tx) => {
      // options + correctAnswer حسب النوع
      const isMcq    = input.type === 'mcq'
      const isEssay  = input.type === 'essay'
      const isText   = input.contentMode === 'text'
      const cleanedOpts = isMcq ? input.options.map(o => o.trim()).filter(Boolean) : []

      const data = {
        question_text:  input.text.trim(),
        question_type:  input.type,
        content_mode:   input.contentMode,
        image_url:      isText ? null : (input.imageUrl || null),
        options:        isMcq  ? cleanedOpts : [],
        correct_answer: isMcq  ? ((input.correctAnswer ?? '').trim() || null) : null,
        model_answer:   isEssay ? (input.modelAnswer || null) : null,
        points:         input.points,
        difficulty:     input.difficulty,
        notes:          input.notes || null,
      }

      if (input.id) {
        q = await tx.question_bank_questions.update({
          where: { id: input.id },
          data: { ...data, updated_at: new Date() },
          select: { id: true },
        })
      } else {
        q = await tx.question_bank_questions.create({
          data: { ...data, created_by: userId ?? null },
          select: { id: true },
        })
      }

      // مواضيع
      const uniqueTitles = [...new Set(input.topics.map(t => t.trim()).filter(Boolean).map(t => t.toLowerCase()))]
        .map(low => input.topics.find(t => t.trim().toLowerCase() === low)!.trim())
        .filter(Boolean)

      const topicIds: string[] = []
      for (const title of uniqueTitles) {
        const topic = await tx.question_bank_topics.upsert({
          where: { title },
          create: { title },
          update: {},
          select: { id: true },
        })
        topicIds.push(topic.id)
      }

      await tx.question_bank_question_topics.deleteMany({ where: { question_id: q.id } })
      if (topicIds.length) {
        await tx.question_bank_question_topics.createMany({
          data: topicIds.map(topic_id => ({ question_id: q.id, topic_id })),
          skipDuplicates: true,
        })
      }

      // نطاقات
      const expanded = await autoExpandScopes(input.scopes, tx)
      await tx.question_bank_scopes.deleteMany({ where: { question_id: q.id } })
      if (expanded.length) {
        await tx.question_bank_scopes.createMany({
          data: expanded.map(s => ({ question_id: q.id, scope_type: s.scopeType, scope_id: s.scopeId })),
          skipDuplicates: true,
        })
      }
    })

    logActivity({
      action:      input.id ? 'update' : 'create',
      resource:    'question-bank',
      targetId:    q!.id,
      targetLabel: 'سؤال في بنك الأسئلة',
    }).catch(() => {})

    revalidatePath('/admin/question-bank')
    return { success: true, id: q!.id }
  } catch {
    return { error: 'تعذّر حفظ السؤال. حاول تاني.' }
  }
}

export async function archiveBankQuestions(ids: string[]): Promise<{ success?: true; error?: string }> {
  if (!(await hasResourceAccess('question-bank', 'manage'))) return { error: 'غير مسموح.' }
  if (!ids.length) return { error: 'لم تحدد أي أسئلة.' }
  await prisma.question_bank_questions.updateMany({ where: { id: { in: ids } }, data: { archived_at: new Date() } })
  revalidatePath('/admin/question-bank')
  return { success: true }
}

export async function restoreBankQuestions(ids: string[]): Promise<{ success?: true; error?: string }> {
  if (!(await hasResourceAccess('question-bank', 'manage'))) return { error: 'غير مسموح.' }
  if (!ids.length) return { error: 'لم تحدد أي أسئلة.' }
  await prisma.question_bank_questions.updateMany({ where: { id: { in: ids } }, data: { archived_at: null } })
  revalidatePath('/admin/question-bank')
  return { success: true }
}

export async function deleteBankQuestions(ids: string[]): Promise<{ success?: true; deleted?: number; archived?: number; message?: string; error?: string }> {
  if (!(await hasResourceAccess('question-bank', 'manage'))) return { error: 'غير مسموح.' }
  if (!ids.length) return { error: 'لم تحدد أي أسئلة.' }

  // الأسئلة المستخدمة في اختبارات
  const usedRows = await prisma.exam_questions.findMany({
    where: { bank_question_id: { in: ids } },
    select: { bank_question_id: true },
  })
  const usedIds = [...new Set(usedRows.map(r => r.bank_question_id!).filter(Boolean))]
  const deleteIds = ids.filter(id => !usedIds.includes(id))

  if (usedIds.length) {
    await prisma.question_bank_questions.updateMany({ where: { id: { in: usedIds } }, data: { archived_at: new Date() } })
  }
  if (deleteIds.length) {
    await prisma.question_bank_questions.deleteMany({ where: { id: { in: deleteIds } } })
  }

  revalidatePath('/admin/question-bank')

  const parts: string[] = []
  if (deleteIds.length) parts.push(`اتحذف ${deleteIds.length} سؤال.`)
  if (usedIds.length)   parts.push(`${usedIds.length} سؤال مستخدم في اختبارات فاتّأرشف بدل الحذف.`)

  return {
    success:  true,
    deleted:  deleteIds.length,
    archived: usedIds.length,
    message:  parts.join(' '),
  }
}

// ─── القائمة والفلترة ─────────────────────────────────────────────────────────

export type BankListFilters = {
  search?:     string
  difficulty?: Difficulty | 'all'
  type?:       'mcq' | 'essay' | 'file' | 'all'
  scopeType?:  ScopeType | 'all'
  scopeId?:    string | null
  topicId?:    string | null
  archived?:   boolean
  page?:       number
  perPage?:    number
}

export async function getBankQuestions(filters: BankListFilters = {}): Promise<{
  items: BankQuestion[]
  total: number
  page:  number
  perPage: number
}> {
  const empty = { items: [], total: 0, page: 1, perPage: 20 }
  if (!(await hasResourceAccess('question-bank'))) return empty

  const page    = Math.max(1, filters.page ?? 1)
  const perPage = Math.min(100, Math.max(1, filters.perPage ?? 20))

  const where: Prisma.question_bank_questionsWhereInput = {}

  // أرشفة
  where.archived_at = filters.archived ? { not: null } : null

  // بحث
  if (filters.search && filters.search.trim().length >= 2) {
    where.question_text = { contains: filters.search.trim(), mode: 'insensitive' }
  }

  // صعوبة
  if (filters.difficulty && filters.difficulty !== 'all') {
    where.difficulty = filters.difficulty
  }

  // نوع
  if (filters.type && filters.type !== 'all') {
    where.question_type = filters.type
  }

  // نطاق
  if (filters.scopeId) {
    where.scopes = {
      some: {
        scope_type: filters.scopeType && filters.scopeType !== 'all' ? filters.scopeType : undefined,
        scope_id:   filters.scopeId,
      },
    }
  }

  // موضوع
  if (filters.topicId) {
    where.topics = { some: { topic_id: filters.topicId } }
  }

  const include = {
    scopes: { select: { scope_type: true, scope_id: true } },
    topics: { include: { topic: { select: { id: true, title: true } } } },
  }

  const [rows, total] = await Promise.all([
    prisma.question_bank_questions.findMany({
      where,
      include,
      orderBy: [{ created_at: 'desc' }],
      skip:  (page - 1) * perPage,
      take:  perPage,
    }),
    prisma.question_bank_questions.count({ where }),
  ])

  const labelMap = await buildLabelMap(rows as unknown as QBRow[])
  const items = (rows as unknown as QBRow[]).map(r => toBankQuestion(r, labelMap))

  return { items, total, page, perPage }
}

/**
 * يجيب أسئلة محددة بالـ ids (private).
 * لازم يكون بديل استخدام getBankQuestions مع perPage ثابت — ده كان بيسقّط
 * أسئلة برّه أول صفحة. هنا مفيش pagination خالص، بنجيب الـ ids المطلوبة بالظبط.
 */
async function fetchBankQuestionsByIds(ids: string[]): Promise<Map<string, BankQuestion>> {
  if (!ids.length) return new Map()

  const rows = await prisma.question_bank_questions.findMany({
    where: { id: { in: ids } },
    include: {
      scopes: { select: { scope_type: true, scope_id: true } },
      topics: { include: { topic: { select: { id: true, title: true } } } },
    },
  })

  const labelMap = await buildLabelMap(rows as unknown as QBRow[])
  return new Map((rows as unknown as QBRow[]).map(r => [r.id, toBankQuestion(r, labelMap)]))
}

export async function getBankTopics(): Promise<{ id: string; title: string; count: number }[]> {
  if (!(await hasResourceAccess('question-bank'))) return []

  const topics = await prisma.question_bank_topics.findMany({
    include: { questions: { select: { question_id: true } } },
    orderBy: { title: 'asc' },
  })

  return topics.map(t => ({ id: t.id, title: t.title, count: t.questions.length }))
}

export async function getBankStats(): Promise<{
  total:       number
  byDifficulty: Record<Difficulty, number>
  byType:      Record<'mcq' | 'essay' | 'file', number>
  archived:    number
  unscoped:    number
  unused:      number
}> {
  const zero = { total: 0, byDifficulty: { easy: 0, medium: 0, hard: 0 }, byType: { mcq: 0, essay: 0, file: 0 }, archived: 0, unscoped: 0, unused: 0 }
  if (!(await hasResourceAccess('question-bank'))) return zero

  const [total, byDiff, byType, archived, unscoped, unused] = await Promise.all([
    prisma.question_bank_questions.count({ where: { archived_at: null } }),
    prisma.question_bank_questions.groupBy({ by: ['difficulty'], where: { archived_at: null }, _count: { id: true } }),
    prisma.question_bank_questions.groupBy({ by: ['question_type'], where: { archived_at: null }, _count: { id: true } }),
    prisma.question_bank_questions.count({ where: { archived_at: { not: null } } }),
    prisma.question_bank_questions.count({ where: { archived_at: null, scopes: { none: {} } } }),
    prisma.question_bank_questions.count({ where: { archived_at: null, usage_count: 0 } }),
  ])

  const byDifficulty: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 }
  for (const row of byDiff) byDifficulty[normalizeDifficulty(row.difficulty)] += row._count.id

  const byTypeMap: Record<string, number> = {}
  for (const row of byType) byTypeMap[row.question_type] = row._count.id

  return {
    total,
    byDifficulty,
    byType: { mcq: byTypeMap['mcq'] ?? 0, essay: byTypeMap['essay'] ?? 0, file: byTypeMap['file'] ?? 0 },
    archived,
    unscoped,
    unused,
  }
}

// ─── التوليد والاستبدال ────────────────────────────────────────────────────────

export type GenerateInput = {
  scope?:      { scopeType: ScopeType; scopeId: string } | null
  counts:      { easy: number; medium: number; hard: number }
  types?:      ('mcq' | 'essay' | 'file')[]
  topicIds?:   string[]
  excludeIds?: string[]
}

export async function generateExamQuestions(input: GenerateInput): Promise<{
  questions: BankQuestion[]
  shortage:  Partial<Record<Difficulty, number>>
  error?:    string
}> {
  if (!(await hasResourceAccess('question-bank'))) return { questions: [], shortage: {} }

  const total = (input.counts.easy ?? 0) + (input.counts.medium ?? 0) + (input.counts.hard ?? 0)
  if (total < 1 || total > 100) return { questions: [], shortage: {}, error: 'حدّد عدد أسئلة بين 1 و100' }

  const allIds: string[] = []
  const shortage: Partial<Record<Difficulty, number>> = {}

  const difficulties: Difficulty[] = ['easy', 'medium', 'hard']

  for (const difficulty of difficulties) {
    const n = input.counts[difficulty] ?? 0
    if (n <= 0) continue

    // بناء شروط إضافية آمنة بـ Prisma.sql
    const fragments: Prisma.Sql[] = [
      Prisma.sql`q.archived_at IS NULL`,
      Prisma.sql`q.difficulty = ${difficulty}`,
    ]

    if (input.excludeIds?.length) {
      fragments.push(Prisma.sql`NOT (q.id = ANY(${input.excludeIds}::uuid[]))`)
    }

    if (input.types?.length) {
      fragments.push(Prisma.sql`q.question_type = ANY(${input.types}::text[])`)
    }

    if (input.scope) {
      fragments.push(Prisma.sql`EXISTS (
        SELECT 1 FROM public.question_bank_scopes s
        WHERE s.question_id = q.id
          AND s.scope_type = ${input.scope.scopeType}
          AND s.scope_id   = ${input.scope.scopeId}::uuid
      )`)
    }

    if (input.topicIds?.length) {
      fragments.push(Prisma.sql`EXISTS (
        SELECT 1 FROM public.question_bank_question_topics qt
        WHERE qt.question_id = q.id
          AND qt.topic_id = ANY(${input.topicIds}::uuid[])
      )`)
    }

    const whereClause = Prisma.join(fragments, ' AND ')

    const rows = await prisma.$queryRaw<{ id: string }[]>(
      Prisma.sql`SELECT q.id FROM public.question_bank_questions q WHERE ${whereClause} ORDER BY random() LIMIT ${n}`
    )

    for (const r of rows) allIds.push(r.id)
    if (rows.length < n) shortage[difficulty] = n - rows.length
  }

  if (!allIds.length) return { questions: [], shortage }

  const byId = await fetchBankQuestionsByIds(allIds)

  const ordered: BankQuestion[] = []
  for (const diff of difficulties) {
    for (const id of allIds) {
      const q = byId.get(id)
      if (q && q.difficulty === diff) ordered.push(q)
    }
  }

  return { questions: ordered, shortage }
}

export async function pickReplacementQuestion(input: {
  difficulty:  Difficulty
  type?:       'mcq' | 'essay' | 'file' | null
  scope?:      { scopeType: ScopeType; scopeId: string } | null
  excludeIds:  string[]
}): Promise<{ question: BankQuestion | null; error?: string }> {
  if (!(await hasResourceAccess('question-bank'))) return { question: null }

  const fragments: Prisma.Sql[] = [
    Prisma.sql`q.archived_at IS NULL`,
    Prisma.sql`q.difficulty = ${input.difficulty}`,
  ]

  if (input.excludeIds?.length) {
    fragments.push(Prisma.sql`NOT (q.id = ANY(${input.excludeIds}::uuid[]))`)
  }
  if (input.type) {
    fragments.push(Prisma.sql`q.question_type = ${input.type}`)
  }
  if (input.scope) {
    fragments.push(Prisma.sql`EXISTS (
      SELECT 1 FROM public.question_bank_scopes s
      WHERE s.question_id = q.id
        AND s.scope_type = ${input.scope.scopeType}
        AND s.scope_id   = ${input.scope.scopeId}::uuid
    )`)
  }

  const whereClause = Prisma.join(fragments, ' AND ')
  const rows = await prisma.$queryRaw<{ id: string }[]>(
    Prisma.sql`SELECT q.id FROM public.question_bank_questions q WHERE ${whereClause} ORDER BY random() LIMIT 1`
  )

  if (!rows.length) return { question: null, error: 'مفيش سؤال بديل بنفس المواصفات في البنك' }

  const byId = await fetchBankQuestionsByIds([rows[0].id])
  return { question: byId.get(rows[0].id) ?? null }
}

// ─── الاستيراد من اختبار ──────────────────────────────────────────────────────

export async function importQuestionsFromExam(examId: string, scopes: ScopeInput[]): Promise<{
  success?: true; imported?: number; skipped?: number; error?: string
}> {
  if (!(await hasResourceAccess('question-bank', 'manage'))) return { error: 'غير مسموح.' }

  const exam = await prisma.exams.findUnique({ where: { id: examId }, select: { id: true, code: true } })
  if (!exam) return { error: 'الاختبار مش موجود.' }

  const questions = await prisma.exam_questions.findMany({
    where: { exam_id: examId },
  })

  const toImport = questions.filter(q => !q.bank_question_id)
  let imported = 0

  const expanded = await autoExpandScopes(scopes)

  for (const eq of toImport) {
    const created = await prisma.question_bank_questions.create({
      data: {
        question_text:  eq.question_text,
        question_type:  eq.question_type,
        content_mode:   eq.content_mode,
        image_url:      eq.image_url,
        options:        eq.options ?? [],
        correct_answer: eq.correct_answer,
        model_answer:   eq.model_answer,
        points:         eq.points,
        difficulty:     'medium',
        notes:          `مستورد من اختبار ${exam.code}`,
      },
      select: { id: true },
    })

    if (expanded.length) {
      await prisma.question_bank_scopes.createMany({
        data: expanded.map(s => ({ question_id: created.id, scope_type: s.scopeType, scope_id: s.scopeId })),
        skipDuplicates: true,
      })
    }

    await prisma.exam_questions.update({ where: { id: eq.id }, data: { bank_question_id: created.id } })
    imported++
  }

  revalidatePath('/admin/question-bank')
  return { success: true, imported, skipped: questions.length - imported }
}

// ─── تحديث مجمّع ─────────────────────────────────────────────────────────────

export async function bulkUpdateBankQuestions(input: {
  ids:           string[]
  difficulty?:   Difficulty | null
  addTopics?:    string[]
  addScopes?:    ScopeInput[]
  removeScopes?: ScopeInput[]
}): Promise<{ success?: true; updated?: number; error?: string }> {
  if (!(await hasResourceAccess('question-bank', 'manage'))) return { error: 'غير مسموح.' }
  if (!input.ids.length || input.ids.length > 500) return { error: 'عدد الأسئلة لازم يكون بين 1 و500.' }

  if (input.difficulty) {
    await prisma.question_bank_questions.updateMany({
      where: { id: { in: input.ids } },
      data:  { difficulty: input.difficulty, updated_at: new Date() },
    })
  }

  if (input.addTopics?.length) {
    const titles = [...new Set(input.addTopics.map(t => t.trim()).filter(Boolean))]
    for (const title of titles) {
      const topic = await prisma.question_bank_topics.upsert({
        where:  { title },
        create: { title },
        update: {},
        select: { id: true },
      })
      await prisma.question_bank_question_topics.createMany({
        data: input.ids.map(question_id => ({ question_id, topic_id: topic.id })),
        skipDuplicates: true,
      })
    }
  }

  if (input.addScopes?.length) {
    const expanded = await autoExpandScopes(input.addScopes)
    for (const s of expanded) {
      await prisma.question_bank_scopes.createMany({
        data: input.ids.map(question_id => ({ question_id, scope_type: s.scopeType, scope_id: s.scopeId })),
        skipDuplicates: true,
      })
    }
  }

  if (input.removeScopes?.length) {
    for (const s of input.removeScopes) {
      await prisma.question_bank_scopes.deleteMany({
        where: { question_id: { in: input.ids }, scope_type: s.scopeType, scope_id: s.scopeId },
      })
    }
  }

  revalidatePath('/admin/question-bank')
  return { success: true, updated: input.ids.length }
}

// ─── تحديث الإحصائيات ────────────────────────────────────────────────────────

export async function refreshBankQuestionStats(): Promise<{ success: true; updated: number }> {
  if (!(await hasResourceAccess('question-bank', 'manage'))) return { success: true, updated: 0 }

  await prisma.$executeRaw`
    WITH uses AS (
      SELECT bank_question_id AS qid,
             count(*)::int       AS uses,
             max(created_at)     AS last_used
      FROM public.exam_questions
      WHERE bank_question_id IS NOT NULL
      GROUP BY 1
    ),
    ans AS (
      SELECT eq.bank_question_id                               AS qid,
             count(*)::int                                     AS total,
             count(*) FILTER (WHERE ea.is_correct IS TRUE)::int AS correct
      FROM public.exam_answers ea
      JOIN public.exam_questions eq ON eq.id = ea.question_id
      WHERE eq.bank_question_id IS NOT NULL
      GROUP BY 1
    )
    UPDATE public.question_bank_questions q
    SET usage_count   = COALESCE(uses.uses,  0),
        last_used_at  = uses.last_used,
        answers_count = COALESCE(ans.total,  0),
        correct_count = COALESCE(ans.correct, 0)
    FROM (SELECT q2.id FROM public.question_bank_questions q2) ids
    LEFT JOIN uses ON uses.qid = ids.id
    LEFT JOIN ans  ON ans.qid  = ids.id
    WHERE q.id = ids.id
  `

  // تحديث auto_difficulty
  const all = await prisma.question_bank_questions.findMany({
    select: { id: true, answers_count: true, correct_count: true },
  })

  const groups: Record<Difficulty, string[]> = { easy: [], medium: [], hard: [] }
  for (const row of all) {
    const d = computeAutoDifficulty(row.answers_count, row.correct_count)
    if (d) groups[d].push(row.id)
  }

  for (const [diff, ids] of Object.entries(groups) as [Difficulty, string[]][]) {
    if (ids.length) {
      await prisma.question_bank_questions.updateMany({
        where: { id: { in: ids } },
        data:  { auto_difficulty: diff },
      })
    }
  }

  revalidatePath('/admin/question-bank')
  return { success: true, updated: all.length }
}

// ─── صيانة النطاقات اليتيمة ────────────────────────────────────────────────────

export async function cleanupOrphanScopes(): Promise<{ success: true } | { error: string }> {
  if (!(await hasResourceAccess('question-bank', 'manage')))
    return { error: 'غير مسموح' }
  try {
    await prisma.$executeRaw`SELECT public.qb_cleanup_orphan_scopes()`
    revalidatePath('/admin/question-bank')
    return { success: true }
  } catch {
    return { error: 'تعذّر تنظيف الروابط' }
  }
}

// ─── الإدخال المجمّع ──────────────────────────────────────────────────────────

export async function bulkCreateBankQuestions(input: {
  questions: {
    text: string
    type: 'mcq' | 'essay'
    options: string[]
    correctAnswer: string | null
    points: number
    difficulty: Difficulty
  }[]
  scopes: { scopeType: ScopeType; scopeId: string }[]
  topics: string[]
}): Promise<{ success?: true; created?: number; failed?: number; error?: string }> {
  if (!(await hasResourceAccess('question-bank', 'manage')))
    return { error: 'غير مسموح. لازم تكون أدمن.' }

  if (!input.questions.length || input.questions.length > 200)
    return { error: 'عدد الأسئلة لازم يكون بين 1 و200' }

  // العميل مش مصدر ثقة — نتحقق من كل سؤال قبل الحفظ
  const questions = input.questions.filter(q => {
    if (!q.text?.trim()) return false
    if (q.points < 1 || q.points > 100) return false
    if (q.type === 'mcq') {
      const opts = q.options.map(o => o.trim()).filter(Boolean)
      if (opts.length < 2) return false
      if (!opts.includes((q.correctAnswer ?? '').trim())) return false
    }
    return true
  })
  const invalidCount = input.questions.length - questions.length

  if (!questions.length) return { error: 'مفيش أسئلة صالحة للاستيراد' }

  const session = await auth()
  const userId = session?.user?.id ?? null

  // Expand scopes once + get-or-create topics once before loop
  const expanded = await autoExpandScopes(input.scopes)
  const topicIds: string[] = []
  for (const raw of input.topics) {
    const title = raw.trim()
    if (!title) continue
    const topic = await prisma.question_bank_topics.upsert({
      where: { title },
      create: { title },
      update: {},
      select: { id: true },
    })
    topicIds.push(topic.id)
  }

  let created = 0
  let failed  = invalidCount

  for (const q of questions) {
    try {
      await prisma.$transaction(async tx => {
        const cleanedOpts = q.type === 'mcq' ? q.options.map(o => o.trim()).filter(Boolean) : []
        const row = await tx.question_bank_questions.create({
          data: {
            question_text:  q.text.trim(),
            question_type:  q.type,
            content_mode:   'text',
            options:        cleanedOpts,
            correct_answer: q.type === 'mcq' ? ((q.correctAnswer ?? '').trim() || null) : null,
            points:         q.points,
            difficulty:     q.difficulty,
            created_by:     userId,
          },
          select: { id: true },
        })

        if (topicIds.length) {
          await tx.question_bank_question_topics.createMany({
            data: topicIds.map(tid => ({ question_id: row.id, topic_id: tid })),
            skipDuplicates: true,
          })
        }

        if (expanded.length) {
          await tx.question_bank_scopes.createMany({
            data: expanded.map(s => ({ question_id: row.id, scope_type: s.scopeType, scope_id: s.scopeId })),
            skipDuplicates: true,
          })
        }
      })
      created++
    } catch {
      failed++
    }
  }

  logActivity({ action: 'create', resource: 'question-bank', targetId: 'bulk', targetLabel: `استيراد مجمّع: ${created} سؤال` }).catch(() => {})
  revalidatePath('/admin/question-bank')
  return { success: true, created, failed }
}
