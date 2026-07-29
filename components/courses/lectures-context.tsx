'use client'

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  type AdminLecture,
  type AdminLesson,
  type BranchOption,
  type LectureInput,
  type LessonInput,
  createLecture,
  updateLecture,
  deleteLecture,
  createLesson,
  updateLesson,
  deleteLesson,
} from '@/app/admin/courses/actions'

type LecturesContextValue = {
  lectures: AdminLecture[]
  branchOptions: BranchOption[]
  // lecture actions
  openCreateLecture: () => void
  openEditLecture: (lecture: AdminLecture) => void
  requestDeleteLecture: (lecture: AdminLecture) => void
  // lesson actions
  openCreateLesson: (lectureId: string) => void
  openEditLesson: (lectureId: string, lesson: AdminLesson) => void
  requestDeleteLesson: (lesson: AdminLesson) => void
  // lecture modal state
  lectureFormOpen: boolean
  editingLecture: AdminLecture | null
  closeLectureForm: () => void
  submitLectureForm: (values: LectureInput) => void
  deletingLecture: AdminLecture | null
  closeDeleteLecture: () => void
  confirmDeleteLecture: () => void
  // lesson modal state
  lessonFormOpen: boolean
  editingLesson: AdminLesson | null
  lessonLectureId: string | null
  closeLessonForm: () => void
  submitLessonForm: (values: LessonInput) => void
  deletingLesson: AdminLesson | null
  closeDeleteLesson: () => void
  confirmDeleteLesson: () => void
}

const LecturesContext = createContext<LecturesContextValue | null>(null)

export function useLectures() {
  const ctx = useContext(LecturesContext)
  if (!ctx) throw new Error('useLectures must be used within LecturesProvider')
  return ctx
}

export function LecturesProvider({
  children,
  initialLectures,
  branchOptions,
}: {
  children: ReactNode
  initialLectures: AdminLecture[]
  branchOptions: BranchOption[]
}) {
  const router = useRouter()
  const [lectureFormOpen, setLectureFormOpen] = useState(false)
  const [editingLecture, setEditingLecture] = useState<AdminLecture | null>(null)
  const [deletingLecture, setDeletingLecture] = useState<AdminLecture | null>(null)

  const [lessonFormOpen, setLessonFormOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState<AdminLesson | null>(null)
  const [lessonLectureId, setLessonLectureId] = useState<string | null>(null)
  const [deletingLesson, setDeletingLesson] = useState<AdminLesson | null>(null)

  const value = useMemo<LecturesContextValue>(
    () => ({
      lectures: initialLectures,
      branchOptions,
      openCreateLecture: () => {
        setEditingLecture(null)
        setLectureFormOpen(true)
      },
      openEditLecture: (lecture) => {
        setEditingLecture(lecture)
        setLectureFormOpen(true)
      },
      requestDeleteLecture: (lecture) => setDeletingLecture(lecture),
      openCreateLesson: (lectureId) => {
        setEditingLesson(null)
        setLessonLectureId(lectureId)
        setLessonFormOpen(true)
      },
      openEditLesson: (lectureId, lesson) => {
        setEditingLesson(lesson)
        setLessonLectureId(lectureId)
        setLessonFormOpen(true)
      },
      requestDeleteLesson: (lesson) => setDeletingLesson(lesson),

      lectureFormOpen,
      editingLecture,
      closeLectureForm: () => setLectureFormOpen(false),
      submitLectureForm: async (values) => {
        const isEdit = !!editingLecture
        const id = editingLecture?.id
        setLectureFormOpen(false)
        setEditingLecture(null)
        const res = isEdit
          ? await updateLecture(id!, values)
          : await createLecture(values)
        if (res.error) {
          toast.error(res.error)
        } else {
          toast.success(isEdit ? 'تم تحديث المحاضرة' : 'تمت إضافة المحاضرة')
          router.refresh()
        }
      },
      deletingLecture,
      closeDeleteLecture: () => setDeletingLecture(null),
      confirmDeleteLecture: async () => {
        if (!deletingLecture) return
        const id = deletingLecture.id
        setDeletingLecture(null)
        const res = await deleteLecture(id)
        if (res.error) {
          toast.error(res.error)
        } else {
          toast.success('تم حذف المحاضرة')
          router.refresh()
        }
      },

      lessonFormOpen,
      editingLesson,
      lessonLectureId,
      closeLessonForm: () => setLessonFormOpen(false),
      submitLessonForm: async (values) => {
        const isEdit = !!editingLesson
        const id = editingLesson?.id
        const lectureId = lessonLectureId
        setLessonFormOpen(false)
        setEditingLesson(null)
        const res = isEdit
          ? await updateLesson(id!, values)
          : await createLesson(lectureId!, values)
        if (res.error) {
          toast.error(res.error)
        } else {
          toast.success(isEdit ? 'تم تحديث الدرس' : 'تمت إضافة الدرس')
          router.refresh()
        }
      },
      deletingLesson,
      closeDeleteLesson: () => setDeletingLesson(null),
      confirmDeleteLesson: async () => {
        if (!deletingLesson) return
        const id = deletingLesson.id
        setDeletingLesson(null)
        const res = await deleteLesson(id)
        if (res.error) {
          toast.error(res.error)
        } else {
          toast.success('تم حذف الدرس')
          router.refresh()
        }
      },
    }),
    [
      initialLectures,
      branchOptions,
      lectureFormOpen,
      editingLecture,
      deletingLecture,
      lessonFormOpen,
      editingLesson,
      lessonLectureId,
      deletingLesson,
      router,
    ],
  )

  return (
    <LecturesContext.Provider value={value}>
      {children}
    </LecturesContext.Provider>
  )
}
