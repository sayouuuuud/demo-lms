import { StudentSchedulePage } from '@/components/student/schedule/student-schedule-page'
import { getStudentFullSchedule } from '../actions'

export default async function Page() {
  const schedule = await getStudentFullSchedule()
  return (
    <StudentSchedulePage scheduleEvents={schedule} />
  )
}
