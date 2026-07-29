import { StudentAssignmentsPage } from '@/components/student/assignments/student-assignments-page'
import { getStudentAssignments } from '../actions'

export default async function Page() {
  const assignments = await getStudentAssignments()
  
  return (
      <StudentAssignmentsPage assignments={assignments} />
  )
}
