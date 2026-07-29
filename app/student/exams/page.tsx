import { StudentExamsPage } from '@/components/student/exams/student-exams-page'
import { getStudentExams } from '../actions'

export default async function Page() {
  const exams = await getStudentExams()

  return (
      <StudentExamsPage exams={exams} />
  )
}
