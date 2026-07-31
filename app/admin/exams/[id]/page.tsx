import { notFound } from 'next/navigation'
import { getExamDetails } from './actions'
import { getContentTree } from '@/app/admin/question-bank/actions'
import { ExamDetailsClient } from './exam-details-client'

export default async function ExamDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [exam, tree] = await Promise.all([getExamDetails(id), getContentTree()])

  if (!exam) notFound()

  return <ExamDetailsClient exam={exam} tree={tree} />
}
