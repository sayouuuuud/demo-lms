import { logError, logDebug } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import type { Stage, Branch, Lecture, Lesson, MonthlyCourse, Term } from '@/lib/landing-data'

export async function getCurriculum(includeUnpublished = false): Promise<Stage[]> {
  let stagesRes: any[] = []
  try {
    stagesRes = await prisma.stages.findMany({
      orderBy: { sort_order: 'asc' },
      include: {
        terms: {
          orderBy: { sort_order: 'asc' }
        },
        branches: {
          orderBy: { sort_order: 'asc' },
          include: {
            monthly_courses: {
              where: includeUnpublished ? undefined : { is_published: true },
              orderBy: { sort_order: 'asc' },
              include: {
                monthly_course_sections: {
                  orderBy: { sort_order: 'asc' }
                }
              }
            },
            lectures: {
              orderBy: { sort_order: 'asc' },
              include: {
                lessons: {
                  orderBy: { sort_order: 'asc' }
                }
              }
            }
          }
        }
      }
    })
  } catch (err) {
    if (
      err &&
      typeof err === 'object' &&
      'digest' in err &&
      typeof (err as any).digest === 'string' &&
      ((err as any).digest === 'DYNAMIC_SERVER_USAGE' ||
        (err as any).digest.startsWith('NEXT_'))
    ) {
      throw err
    }
    logError('curriculum.getCurriculum', err)
    return []
  }

  return stagesRes.map((stageRow) => {
    const terms = stageRow.terms.map((termRow: { id: string; title: string | null; price: unknown; old_price: unknown }) => ({
      id: termRow.id,
      title: termRow.title ?? '',
      price: Number(termRow.price ?? 0),
      oldPrice: termRow.old_price != null ? Number(termRow.old_price) : undefined,
    }))

    const branches = stageRow.branches.map((branchRow: { slug: string | null; title: string | null; description: string | null; image: string | null; topics: unknown; lectures: any[]; monthly_courses: any[] }) => {
      const branchLectures = branchRow.lectures.map((lectureRow: { slug: string | null; id: string; title: string | null; description: string | null; price: unknown; old_price: unknown; badge: string | null; image: string | null; lessons: any[]; monthly_course_section_id: string | null; is_free: boolean | null; course_sort_order: number | null; monthly_course_id: string | null }) => {
        const lessons = lectureRow.lessons.map((lessonRow: { slug: string | null; title: string | null; duration: string | null; is_free: boolean | null; video_url: string | null }) => ({
          id: lessonRow.slug ?? '',
          title: lessonRow.title ?? '',
          duration: lessonRow.duration ?? '',
          isFree: lessonRow.is_free ?? false,
          videoUrl: lessonRow.video_url ?? null,
        }))
        return {
          id: lectureRow.slug ?? '',
          dbId: lectureRow.id,
          title: lectureRow.title ?? '',
          description: lectureRow.description ?? '',
          price: Number(lectureRow.price ?? 0),
          oldPrice: lectureRow.old_price != null ? Number(lectureRow.old_price) : undefined,
          badge: lectureRow.badge ?? undefined,
          image: lectureRow.image ?? undefined,
          lessons,
          sectionId: lectureRow.monthly_course_section_id ?? null,
          isFree: lectureRow.is_free ?? false,
          courseSortOrder: lectureRow.course_sort_order ?? 0,
          monthlyCourseId: lectureRow.monthly_course_id,
        }
      })

      const monthlyCourses = branchRow.monthly_courses.map((courseRow: { id: string; slug: string | null; title: string | null; description: string | null; image: string | null; price: unknown; old_price: unknown; badge: string | null; is_published: boolean | null; monthly_course_sections: any[] }) => {
        const sections = courseRow.monthly_course_sections.map((sec: { id: string; title: string | null }) => ({
          id: sec.id,
          title: sec.title ?? '',
        }))

        // Map lectures that belong to this course
        const courseLectures = branchLectures
          .filter((l: { monthlyCourseId: string | null; courseSortOrder: number }) => l.monthlyCourseId === courseRow.id)
          .sort((a: { courseSortOrder: number }, b: { courseSortOrder: number }) => a.courseSortOrder - b.courseSortOrder)
          .map(({ courseSortOrder, monthlyCourseId, ...rest }: { courseSortOrder: number; monthlyCourseId: string | null; [key: string]: unknown }) => rest)

        return {
          id: courseRow.slug ?? '',
          dbId: courseRow.id,
          title: courseRow.title ?? '',
          description: courseRow.description ?? '',
          image: courseRow.image ?? undefined,
          price: Number(courseRow.price ?? 0),
          oldPrice: courseRow.old_price != null ? Number(courseRow.old_price) : undefined,
          badge: courseRow.badge ?? undefined,
          isPublished: courseRow.is_published ?? true,
          lectures: courseLectures,
          sections,
        }
      })

      return {
        id: branchRow.slug ?? '',
        title: branchRow.title ?? '',
        description: branchRow.description ?? '',
        image: branchRow.image ?? '',
        topics: (branchRow.topics as string[]) ?? [],
        lectures: branchLectures.map(({ courseSortOrder, monthlyCourseId, ...rest }: { courseSortOrder: number; monthlyCourseId: string | null; [key: string]: unknown }) => rest),
        monthlyCourses,
      }
    })

    return {
      id: stageRow.slug ?? '',
      index: stageRow.idx ?? '',
      title: stageRow.title ?? '',
      subtitle: stageRow.subtitle ?? '',
      rows: (stageRow.rows as string[]) ?? [],
      formula: stageRow.formula ?? '',
      image: stageRow.image ?? '',
      accent: (stageRow.accent as Stage['accent']) ?? 'emerald',
      termPrice: Number(stageRow.term_price ?? 0),
      termOldPrice: stageRow.term_old_price != null ? Number(stageRow.term_old_price) : undefined,
      terms,
      branches,
    }
  })
}

export async function getStageBySlug(slug: string): Promise<Stage | undefined> {
  const all = await getCurriculum()
  logDebug('curriculum.getStageBySlug', { slug, count: all.length })
  return all.find((s) => s.id === slug)
}

export async function getBranchBySlug(
  stageSlug: string,
  branchSlug: string,
): Promise<{ stage: Stage; branch: Branch } | undefined> {
  const stage = await getStageBySlug(stageSlug)
  if (!stage) return undefined
  const branch = stage.branches.find((b) => b.id === branchSlug)
  if (!branch) return undefined
  return { stage, branch }
}

export async function getCourseBySlug(
  stageSlug: string,
  branchSlug: string,
  courseSlug: string,
): Promise<{ stage: Stage; branch: Branch; course: MonthlyCourse } | undefined> {
  const result = await getBranchBySlug(stageSlug, branchSlug)
  if (!result) return undefined
  const course = (result.branch.monthlyCourses ?? []).find((c) => c.id === courseSlug)
  if (!course) return undefined
  return { stage: result.stage, branch: result.branch, course }
}

export async function getFreeLectureBySlug(
  stageSlug: string,
  branchSlug: string,
  courseSlug: string,
  lectureSlug: string,
): Promise<
  { stage: Stage; branch: Branch; course: MonthlyCourse; lecture: Lecture } | undefined
> {
  const result = await getCourseBySlug(stageSlug, branchSlug, courseSlug)
  logDebug('curriculum.getFreeLectureBySlug', { stageSlug, branchSlug, courseSlug, lectureSlug })
  logDebug('curriculum.getCourseBySlug', result
    ? `OK - course.id="${result.course.id}" lectures=[${result.course.lectures.map((l) => l.id).join(', ')}]`
    : 'NOT FOUND')
  if (!result) return undefined
  const lecture = result.course.lectures.find((l) => l.id === lectureSlug)
  logDebug('curriculum.lecture find result', lecture
    ? `FOUND id="${lecture.id}" isFree=${lecture.isFree} price=${lecture.price}`
    : `NOT FOUND - lectureSlug="${lectureSlug}" available ids: [${result.course.lectures.map((l) => `"${l.id}"`).join(', ')}]`)
  // Allow watch if: lecture is explicitly free (isFree=true), OR the whole course is free (price 0)
  if (!lecture || (!lecture.isFree && Number(result.course.price) !== 0)) return undefined
  return { ...result, lecture }
}
