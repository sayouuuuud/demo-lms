import { ExamBuilder } from '@/components/exams/builder/exam-builder'
import { ExamBuilderHeader } from '@/components/exams/builder/exam-builder-header'
import { getStagesWithBranches } from '@/app/admin/exams/actions'

export default async function CreateExamPage() {
  const stages = await getStagesWithBranches()
  return (
    <>
      <ExamBuilderHeader />
      <ExamBuilder stages={stages} />
    </>
  )
}
