'use server'

import { prisma } from '@/lib/prisma'
import { hasResourceAccess } from '@/lib/auth-guard'
import { logActivity } from '@/lib/audit-log'
import { revalidatePath } from 'next/cache'
import {
  type AssignmentType,
  type DerivedSubmissionStatus,
  normalizeStatus,
  deriveStatus,
} from '@/lib/assignments-shared'

// ─── Exported types ───────────────────────────────────────────────────────────

export type AssignmentScopeOption = { id: string; title: string }

export type AssignmentsFilters = {
  stages: AssignmentScopeOption[]
  branches: (AssignmentScopeOption & { stageId: string })[]
  courses: (AssignmentScopeOption & { branchId: string })[]
  lectures: (AssignmentScopeOption & { branchId: string; courseId: string | null })[]
}

export type AdminAssignmentRow = {
  id: string
  code: string
  title: string
  type: AssignmentType
  points: number
  dueDate: string | null
  dueDateLabel: string
  createdAt: string
  questionsCount: number
  // context
  stageId: string | null
  stageTitle: string
  branchId: string | null
  branchTitle: string
  courseId: string | null
  courseTitle: string
  lectureId: string | null
  lectureTitle: string
  // stats
  eligible: number
  submitted: number
  graded: number
  late: number
  missing: number
  submissionRate: number
  avgScorePercent: number | null
}

export type AssignmentsOverview = {
  totalAssignments: number
  totalSubmissions: number
  overallRate: number
  needsGrading: number
  overdueMissing: number
  avgScorePercent: number
  byStage: { stageId: string; stageTitle: string; assignments: number; rate: number }[]
  statusBreakdown: { label: string; value: number }[]
  recent: { id: string; studentName: string; assignmentTitle: string; status: string; at: string }[]
}

export type AssignmentDetail = {
  id: string
  code: string
  title: string
  type: AssignmentType
  points: number
  dueDate: string | null
  dueDateLabel: string
  description: string | null
  instructions: string[]
  stageTitle: string
  branchTitle: string
  courseTitle: string
  lectureTitle: string
  questions: {
    id: string
    question: string
    options: string[]
    correctIndex: number | null
    position: number
    kind: string
  }[]
  submissions: {
    studentId: string
    studentCode: string
    studentName: string
    status: string
    score: number | null
    scorePercent: number | null
    attachmentUrl: string | null
    submittedAt: string | null
  }[]
  eligible: number
  submitted: number
  late: number
  needsGrading: number
}

// ─── UUID helper ──────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** الحالات المشتقّة اللي تُحسب "سلّم" */
const SUBMITTED_DERIVED: DerivedSubmissionStatus[] = ['تم التسليم', 'مصحّح', 'متأخر']

// ─── Filters ─────────────────────────────────────────────────────────────────

export async function getAssignmentsFilters(): Promise<AssignmentsFilters> {
  if (!(await hasResourceAccess('assignments'))) {
    return { stages: [], branches: [], courses: [], lectures: [] }
  }

  const stages = await prisma.stages.findMany({
    select: {
      id: true,
      title: true,
      branches: {
        select: {
          id: true,
          title: true,
          monthly_courses: {
            select: { id: true, title: true, sort_order: true },
            orderBy: { sort_order: 'asc' },
          },
          lectures: {
            select: { id: true, title: true, monthly_course_id: true, sort_order: true },
            orderBy: { sort_order: 'asc' },
          },
        },
        orderBy: { sort_order: 'asc' },
      },
    },
    orderBy: { sort_order: 'asc' },
  })

  const result: AssignmentsFilters = { stages: [], branches: [], courses: [], lectures: [] }

  for (const s of stages) {
    result.stages.push({ id: s.id, title: s.title })
    for (const b of s.branches) {
      result.branches.push({ id: b.id, title: b.title, stageId: s.id })
      for (const c of b.monthly_courses) {
        result.courses.push({ id: c.id, title: c.title, branchId: b.id })
      }
      for (const l of b.lectures) {
        result.lectures.push({
          id: l.id,
          title: l.title,
          branchId: b.id,
          courseId: l.monthly_course_id ?? null,
        })
      }
    }
  }

  return result
}

// ─── Rows ─────────────────────────────────────────────────────────────────────

export async function getAssignmentRows(): Promise<AdminAssignmentRow[]> {
  if (!(await hasResourceAccess('assignments'))) return []

  const [rawRows, perStage] = await Promise.all([
    prisma.assignments.findMany({
      select: {
        id: true,
        code: true,
        title: true,
        type: true,
        points: true,
        due_date: true,
        created_at: true,
        lecture_id: true,
        course_id: true,
        _count: { select: { assignment_questions: true } },
        lectures: {
          select: {
            id: true,
            title: true,
            monthly_course_id: true,
            monthly_courses: { select: { id: true, title: true } },
            branches: {
              select: {
                id: true,
                title: true,
                stage_id: true,
                stages: { select: { id: true, title: true } },
              },
            },
          },
        },
        courses: { select: { id: true, title: true } },
        assignment_submissions: {
          select: { status: true, score: true, submitted_at: true },
        },
      },
      orderBy: [{ due_date: 'desc' }, { created_at: 'desc' }],
    }),
    prisma.students.groupBy({
      by: ['stage_id'],
      where: { status: 'نشط' },
      _count: { _all: true },
    }),
  ])

  const activeTotal = perStage.reduce((a, r) => a + r._count._all, 0)
  const stageCount = new Map(
    perStage.filter((r) => r.stage_id).map((r) => [r.stage_id as string, r._count._all]),
  )

  return rawRows.map((row) => {
    const branch = row.lectures?.branches
    const stageId = branch?.stage_id ?? null
    const stageTitle = branch?.stages?.title ?? 'غير مرتبط'
    const branchId = branch?.id ?? null
    const branchTitle = branch?.title ?? '—'
    const courseId = row.lectures?.monthly_course_id ?? null
    const courseTitle = row.lectures?.monthly_courses?.title ?? row.courses?.title ?? '—'
    const lectureId = row.lecture_id ?? null
    const lectureTitle = row.lectures?.title ?? '—'

    // المستحقّون = طلاب ستيج المحاضرة، وإلا كل الطلاب النشطين.
    // لو الستيج مفيهوش طلاب، نرجع لعدد التسليمات الفعلية عشان النسبة ما تبقاش 0/0
    // (بدون ما نخترع مستحقّين وهميين لما يكون مفيش تسليمات خالص).
    const baseEligible = stageId ? (stageCount.get(stageId) ?? 0) : activeTotal
    const eligible = baseEligible > 0 ? baseEligible : row.assignment_submissions.length

    // due_date نوعه @db.Date — المقارنة لازم تكون على نهاية اليوم مش منتصف الليل
    const rawDue = row.due_date ? new Date(row.due_date) : null
    if (rawDue) rawDue.setHours(23, 59, 59, 999)

    const subs = row.assignment_submissions.map((s) => {
      const normalized = normalizeStatus(s.status)
      return {
        derived: deriveStatus({ stored: normalized, submittedAt: s.submitted_at, dueDate: rawDue }),
        score: s.score,
      }
    })

    const submitted = subs.filter((s) => SUBMITTED_DERIVED.includes(s.derived)).length
    const graded = subs.filter((s) => s.derived === 'مصحّح').length
    const late = subs.filter((s) => s.derived === 'متأخر').length
    const missing = Math.max(eligible - submitted, 0)
    const submissionRate = eligible > 0 ? Math.round((submitted / eligible) * 100) : 0

    const scoredSubs = subs.filter((s) => s.score != null)
    const avgScorePercent =
      scoredSubs.length > 0 && row.points > 0
        ? Math.round(
            scoredSubs.reduce((a, s) => a + (s.score! / row.points) * 100, 0) / scoredSubs.length,
          )
        : null

    const dueDateLabel = rawDue
      ? rawDue.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
      : '—'

    return {
      id: row.id,
      code: row.code,
      title: row.title,
      type: (row.type ?? 'تسليم') as AssignmentType,
      points: row.points ?? 0,
      dueDate: rawDue?.toISOString() ?? null,
      dueDateLabel,
      createdAt: row.created_at.toISOString(),
      questionsCount: row._count.assignment_questions,
      stageId,
      stageTitle,
      branchId,
      branchTitle,
      courseId,
      courseTitle,
      lectureId,
      lectureTitle,
      eligible,
      submitted,
      graded,
      late,
      missing,
      submissionRate,
      avgScorePercent,
    }
  })
}

// ─── Overview ────────────────────────────────────────────────────────────────

/**
 * @param prefetchedRows مرّر نتيجة getAssignmentRows() لو الصفحة جابتها أصلًا،
 * عشان ما نعيدش نفس الاستعلام التقيل مرتين.
 */
export async function getAssignmentsOverview(
  prefetchedRows?: AdminAssignmentRow[],
): Promise<AssignmentsOverview | null> {
  if (!(await hasResourceAccess('assignments'))) return null

  const [rows, recentSubs] = await Promise.all([
    prefetchedRows ?? getAssignmentRows(),
    prisma.assignment_submissions.findMany({
      where: { submitted_at: { not: null } },
      select: {
        id: true,
        status: true,
        submitted_at: true,
        students: { select: { name: true } },
        assignments: { select: { title: true } },
      },
      orderBy: { submitted_at: 'desc' },
      take: 8,
    }),
  ])

  const totalAssignments = rows.length
  const totalSubmitted = rows.reduce((a, r) => a + r.submitted, 0)
  const totalEligible = rows.reduce((a, r) => a + r.eligible, 0)
  const overallRate = totalEligible > 0 ? Math.round((totalSubmitted / totalEligible) * 100) : 0

  const needsGrading = rows.reduce((a, r) => a + (r.submitted - r.graded), 0)

  const now = new Date()
  const overdueMissing = rows.reduce((a, r) => {
    if (!r.dueDate) return a
    return new Date(r.dueDate) < now ? a + r.missing : a
  }, 0)

  const scoredRows = rows.filter((r) => r.avgScorePercent != null)
  const avgScorePercent =
    scoredRows.length > 0
      ? Math.round(scoredRows.reduce((a, r) => a + r.avgScorePercent!, 0) / scoredRows.length)
      : 0

  // byStage
  const stageMap = new Map<string, { stageTitle: string; assignments: number; submittedSum: number; eligibleSum: number }>()
  for (const r of rows) {
    const key = r.stageId ?? 'unlinked'
    const existing = stageMap.get(key)
    if (existing) {
      existing.assignments++
      existing.submittedSum += r.submitted
      existing.eligibleSum += r.eligible
    } else {
      stageMap.set(key, { stageTitle: r.stageTitle, assignments: 1, submittedSum: r.submitted, eligibleSum: r.eligible })
    }
  }
  const byStage = Array.from(stageMap.entries()).map(([stageId, v]) => ({
    stageId,
    stageTitle: v.stageTitle,
    assignments: v.assignments,
    rate: v.eligibleSum > 0 ? Math.round((v.submittedSum / v.eligibleSum) * 100) : 0,
  }))

  const statusBreakdown = [
    { label: 'مصحّح', value: rows.reduce((a, r) => a + r.graded, 0) },
    { label: 'تم التسليم', value: rows.reduce((a, r) => a + Math.max(r.submitted - r.graded - r.late, 0), 0) },
    { label: 'متأخر', value: rows.reduce((a, r) => a + r.late, 0) },
    { label: 'لم يسلّم', value: rows.reduce((a, r) => a + r.missing, 0) },
  ]

  const recent = recentSubs.map((s) => ({
    id: s.id,
    studentName: s.students?.name ?? '—',
    assignmentTitle: s.assignments?.title ?? '—',
    status: normalizeStatus(s.status),
    at: s.submitted_at!.toISOString(),
  }))

  return {
    totalAssignments,
    totalSubmissions: totalSubmitted,
    overallRate,
    needsGrading,
    overdueMissing,
    avgScorePercent,
    byStage,
    statusBreakdown,
    recent,
  }
}

// ─── Detail ──────────────────────────────────────────────────────────────────

export async function getAssignmentDetail(assignmentId: string): Promise<AssignmentDetail | null> {
  if (!(await hasResourceAccess('assignments'))) return null
  if (!UUID_RE.test(assignmentId)) return null

  const assignment = await prisma.assignments.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      code: true,
      title: true,
      type: true,
      points: true,
      due_date: true,
      description: true,
      instructions: true,
      lecture_id: true,
      lectures: {
        select: {
          id: true,
          title: true,
          monthly_course_id: true,
          monthly_courses: { select: { title: true } },
          branches: {
            select: {
              id: true,
              title: true,
              stage_id: true,
              stages: { select: { id: true, title: true } },
            },
          },
        },
      },
      assignment_questions: {
        select: { id: true, question: true, options: true, correct_index: true, position: true, kind: true },
        orderBy: { position: 'asc' },
      },
    },
  })

  if (!assignment) return null

  const stageId = assignment.lectures?.branches?.stage_id ?? null
  const stageTitle = assignment.lectures?.branches?.stages?.title ?? 'غير مرتبط'
  const branchTitle = assignment.lectures?.branches?.title ?? '—'
  const courseTitle = assignment.lectures?.monthly_courses?.title ?? '—'
  const lectureTitle = assignment.lectures?.title ?? '—'

  const rawDue = assignment.due_date ? new Date(assignment.due_date) : null
  if (rawDue) rawDue.setHours(23, 59, 59, 999)

  const [eligibleStudents, rawSubs] = await Promise.all([
    stageId
      ? prisma.students.findMany({ where: { stage_id: stageId }, select: { id: true, code: true, name: true } })
      : prisma.students.findMany({ where: { status: 'نشط' }, select: { id: true, code: true, name: true } }),
    prisma.assignment_submissions.findMany({
      where: { assignment_id: assignmentId },
      select: { student_id: true, status: true, score: true, attachment_url: true, submitted_at: true },
    }),
  ])

  const subMap = new Map(rawSubs.map((s) => [s.student_id, s]))

  const submissions = eligibleStudents.map((st) => {
    const sub = subMap.get(st.id)
    const normalized = sub ? normalizeStatus(sub.status) : null
    const derived = deriveStatus({ stored: normalized, submittedAt: sub?.submitted_at ?? null, dueDate: rawDue })
    const score = sub?.score ?? null
    const scorePercent =
      score != null && assignment.points > 0 ? Math.round((score / assignment.points) * 100) : null

    return {
      studentId: st.id,
      studentCode: st.code,
      studentName: st.name,
      status: derived,
      score,
      scorePercent,
      attachmentUrl: sub?.attachment_url ?? null,
      submittedAt: sub?.submitted_at?.toISOString() ?? null,
    }
  })

  const submitted = submissions.filter((s) => ['تم التسليم', 'مصحّح', 'متأخر'].includes(s.status)).length
  const late = submissions.filter((s) => s.status === 'متأخر').length
  const needsGrading = submissions.filter((s) => s.status === 'تم التسليم' || s.status === 'متأخر').length

  return {
    id: assignment.id,
    code: assignment.code,
    title: assignment.title,
    type: (assignment.type ?? 'تسليم') as AssignmentType,
    points: assignment.points ?? 0,
    dueDate: rawDue?.toISOString() ?? null,
    dueDateLabel: rawDue
      ? rawDue.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
      : '—',
    description: assignment.description ?? null,
    instructions: (assignment.instructions as string[]) ?? [],
    stageTitle,
    branchTitle,
    courseTitle,
    lectureTitle,
    questions: assignment.assignment_questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: (q.options as string[]) ?? [],
      correctIndex: q.correct_index ?? null,
      position: q.position ?? 0,
      kind: q.kind ?? 'mcq',
    })),
    submissions,
    eligible: eligibleStudents.length,
    submitted,
    late,
    needsGrading,
  }
}

// ─── Write actions ────────────────────────────────────────────────────────────

export async function gradeAssignmentSubmission(input: {
  assignmentId: string
  studentId: string
  score: number
}) {
  if (!(await hasResourceAccess('assignments', 'manage'))) {
    return { error: 'غير مسموح. لازم تكون أدمن.' }
  }
  if (!UUID_RE.test(input.assignmentId) || !UUID_RE.test(input.studentId)) {
    return { error: 'معرّف غير صالح.' }
  }
  if (!Number.isFinite(input.score) || input.score < 0) {
    return { error: 'الدرجة لازم تكون رقم موجب.' }
  }

  const assignment = await prisma.assignments.findUnique({
    where: { id: input.assignmentId },
    select: { points: true, title: true },
  })
  if (!assignment) return { error: 'الواجب مش موجود.' }

  if (input.score > assignment.points) {
    return { error: `الدرجة لازم تكون بين 0 و${assignment.points}` }
  }

  const student = await prisma.students.findUnique({
    where: { id: input.studentId },
    select: { name: true, user_id: true },
  })

  await prisma.assignment_submissions.upsert({
    where: {
      assignment_id_student_id: {
        assignment_id: input.assignmentId,
        student_id: input.studentId,
      },
    },
    update: { score: input.score, status: 'مصحّح' },
    create: {
      assignment_id: input.assignmentId,
      student_id: input.studentId,
      score: input.score,
      status: 'مصحّح',
      submitted_at: new Date(),
    },
  })

  // ── تحديث student_content_progress لتنعكس الدرجة في واجهة الطالب ──
  if (student?.user_id) {
    await prisma.student_content_progress.upsert({
      where: {
        user_id_item_type_item_id: {
          user_id: student.user_id,
          item_type: 'assignment',
          item_id: input.assignmentId,
        },
      },
      create: {
        user_id: student.user_id,
        item_type: 'assignment',
        item_id: input.assignmentId,
        status: 'مصحّح',
        score: input.score,
        updated_at: new Date(),
      },
      update: {
        status: 'مصحّح',
        score: input.score,
        updated_at: new Date(),
      },
    })
  }

  logActivity({
    action: 'update',
    resource: 'assignments',
    targetId: input.assignmentId,
    targetLabel: `تصحيح واجب: ${assignment.title} — ${student?.name ?? input.studentId}`,
  }).catch(() => {})

  revalidatePath('/admin/assignments')
  revalidatePath(`/admin/assignments/${input.assignmentId}`)
  revalidatePath('/student', 'layout')
  revalidatePath('/student/assignments')

  return { success: true }
}

export async function updateAssignmentDueDate(assignmentId: string, dueDate: string | null) {
  if (!(await hasResourceAccess('assignments', 'manage'))) {
    return { error: 'غير مسموح. لازم تكون أدمن.' }
  }
  if (!UUID_RE.test(assignmentId)) return { error: 'معرّف غير صالح.' }

  const assignment = await prisma.assignments.findUnique({
    where: { id: assignmentId },
    select: { title: true },
  })
  if (!assignment) return { error: 'الواجب مش موجود.' }

  await prisma.assignments.update({
    where: { id: assignmentId },
    data: { due_date: dueDate ? new Date(dueDate) : null },
  })

  logActivity({
    action: 'update',
    resource: 'assignments',
    targetId: assignmentId,
    targetLabel: `تعديل آخر ميعاد: ${assignment.title} — ${dueDate ?? 'بدون ميعاد'}`,
  }).catch(() => {})

  revalidatePath('/admin/assignments')
  revalidatePath(`/admin/assignments/${assignmentId}`)

  return { success: true }
}
