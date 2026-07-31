import { ExamBuilder } from '@/components/exams/builder/exam-builder'
import { ExamBuilderHeader } from '@/components/exams/builder/exam-builder-header'
import { getStagesWithBranches } from '@/app/admin/exams/actions'
import { getContentTree, getBankTopics } from '@/app/admin/question-bank/actions'

export default async function CreateExamPage() {
  const [stages, tree, topicsRaw] = await Promise.all([
    getStagesWithBranches(),
    getContentTree(),
    getBankTopics(),
  ])
  const topics = topicsRaw.map(t => ({ id: t.id, title: t.title }))
  return (
    <>
      <ExamBuilderHeader />
      <ExamBuilder stages={stages} tree={tree} topics={topics} />
    </>
  )
}
