import { notFound } from 'next/navigation'
import { ExamDetail } from '@/components/student/exams/exam-detail'
import { getStudentExam } from '../actions'

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const exam = await getStudentExam(id)
  if (!exam) notFound()

  return <ExamDetail exam={exam} />
}
