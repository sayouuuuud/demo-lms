import { StudentMessagesPage } from '@/components/student/messages/student-messages-page'
import { getStudentConversations } from './actions'

export default async function Page() {
  const conversations = await getStudentConversations()
  return <StudentMessagesPage initialConversations={conversations} />
}
