import { notFound } from 'next/navigation'
import { getSubmissionForGrading } from '../../actions'
import { GradeSubmission } from '@/components/exams/grade-submission'

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; submissionId: string }>
}) {
  const { id, submissionId } = await params
  const submission = await getSubmissionForGrading(submissionId)
  if (!submission) notFound()

  return <GradeSubmission examCode={id} submission={submission} />
}
