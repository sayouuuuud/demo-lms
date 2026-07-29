import { MessagesPageHeader } from '@/components/messages/messages-page-header'
import { MessagesInbox } from '@/components/messages/messages-inbox'
import { getConversations } from './actions'

export default async function MessagesPage() {
  const conversations = await getConversations()

  return (
    <div className="space-y-6">
      <MessagesPageHeader />
      <MessagesInbox initialConversations={conversations} />
    </div>
  )
}
