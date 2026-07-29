import { StudentNotificationsPage } from '@/components/student/notifications/student-notifications-page'
import { getStudentNotifications } from '../actions'

export default async function Page() {
  const notifications = await getStudentNotifications()

  return (
    <StudentNotificationsPage notifications={notifications} />
  )
}
