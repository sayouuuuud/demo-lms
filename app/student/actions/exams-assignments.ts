'use server'

import { prisma } from '@/lib/prisma'
import { getCurrentStudent } from '@/lib/auth-guard'
import { getStudentTargeting } from './notifications'
import type { AssignmentStatus } from '@/lib/student-types'
import { normalizeStatus } from '@/lib/assignments-shared'
import { getPurchasedLectureIds } from '@/lib/student-lectures-data'

export async function getStudentExams() {
  const student = await getCurrentStudent()
  if (!student) return []

  const { stageId, branchIds } = await getStudentTargeting(student)

  const exams = await prisma.exams.findMany({
    where: { status: 'منشور' },
    select: {
      id: true, code: true, title: true, course: true, duration: true,
      pass_mark: true, questions: true, status: true, created_at: true,
      stage_id: true, branch_id: true
    },
    orderBy: { created_at: 'desc' }
  })

  const branchSet = new Set(branchIds)
  const visibleExams = exams.filter((e) => {
    const hasStageTarget = !!e.stage_id
    const hasBranchTarget = !!e.branch_id
    if (!hasStageTarget && !hasBranchTarget) return true
    if (hasStageTarget && stageId && e.stage_id === stageId) return true
    if (hasBranchTarget && e.branch_id && branchSet.has(e.branch_id)) return true
    return false
  })

  if (visibleExams.length === 0) return []
  const examIds = visibleExams.map((e) => e.id)

  const submissions = await prisma.exam_submissions.findMany({
    where: {
      student_id: student.id,
      exam_id: { in: examIds }
    },
    select: { exam_id: true, score: true, total: true, status: true, grading_status: true, submitted_at: true }
  })

  return visibleExams.map((e) => {
    const sub = submissions.find((s) => s.exam_id === e.id)
    const pending = sub?.grading_status === 'pending'
    const graded = sub && sub.grading_status === 'graded'

    const status: 'متاح' | 'مكتمل' = sub ? 'مكتمل' : 'متاح'
    const totalPoints = sub?.total ?? 0

    return {
      id: e.code,
      title: e.title,
      course: e.course || 'عام',
      category: 'اختبار',
      status,
      pending,
      questionsCount: e.questions ?? 0,
      durationMinutes: e.duration || 30,
      totalPoints,
      passingPercent: e.pass_mark ?? 50,
      score: graded ? (sub?.score ?? 0) : null,
      date: pending
        ? 'قيد التصحيح'
        : sub
          ? 'تم التسليم'
          : 'متاح الآن',
      time: '—',
    }
  })
}

export async function getStudentAssignments() {
  const student = await getCurrentStudent()
  if (!student) return []

  // الشجرة القديمة: enrollments → courses.id (legacy)
  const enrollments = await prisma.enrollments.findMany({
    where: { student_id: student.id },
    select: { course_id: true },
  })
  const legacyCourseIds = enrollments.map((e) => e.course_id).filter(Boolean) as string[]

  // الشجرة الجديدة: الطالب → stage → branches → lectures
  const { branchIds } = await getStudentTargeting(student)
  const lectures = await prisma.lectures.findMany({
    where:
      branchIds.length > 0
        ? { branch_id: { in: branchIds } }
        : { id: '00000000-0000-0000-0000-000000000000' },
    select: { id: true },
  })
  const lectureIds = new Set(lectures.map((l) => l.id))

  // المحاضرات المشتراة عبر الأوردرات
  if (student.user_id) {
    const purchasedLectureIds = await getPurchasedLectureIds(student.user_id)
    for (const lid of purchasedLectureIds) lectureIds.add(lid)
  }

  const allLectureIds = [...lectureIds]

  if (allLectureIds.length === 0 && legacyCourseIds.length === 0) return []

  const orClauses = [
    ...(allLectureIds.length > 0 ? [{ lecture_id: { in: allLectureIds } }] : []),
    ...(legacyCourseIds.length > 0 ? [{ course_id: { in: legacyCourseIds } }] : []),
  ]

  const rows = await prisma.assignments.findMany({
    where: { OR: orClauses },
    select: {
      id: true, code: true, title: true, type: true, due_date: true, points: true,
      description: true, instructions: true, lecture_id: true,
      lectures: { select: { title: true } }
    },
    orderBy: { due_date: 'asc' },
  })

  if (rows.length === 0) return []
  const assignmentIds = rows.map((a) => a.id)

  const submissions = await prisma.assignment_submissions.findMany({
    where: {
      student_id: student.id,
      assignment_id: { in: assignmentIds }
    },
    select: { assignment_id: true, status: true, score: true, submitted_at: true }
  })

  const subMap = new Map(submissions.map((s) => [s.assignment_id, s]))

  return rows.map((a) => {
    const sub = subMap.get(a.id)
    const dueDate = a.due_date
      ? a.due_date.toLocaleDateString('ar-EG', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : '—'

    const status: AssignmentStatus = normalizeStatus(sub?.status)

    return {
      id: a.code ?? a.id,
      courseId: a.lecture_id ?? '',
      title: a.title,
      type: (a.type === 'اختبار' ? 'اختبار' : 'تسليم') as 'اختبار' | 'تسليم',
      description: a.description ?? '',
      instructions: a.instructions ?? [],
      dueDate,
      points: a.points ?? 10,
      score: sub?.score ?? null,
      status,
      attachments: [] as { name: string; size: string }[],
      lectureTitle: a.lectures?.title ?? '',
    }
  })
}
