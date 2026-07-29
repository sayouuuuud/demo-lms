import { NotificationsFeed } from '@/components/notifications/notifications-feed'
import { getNotifications, getNotificationTargets } from './actions'

export default async function NotificationsPage() {
  const [notifications, targets] = await Promise.all([
    getNotifications(),
    getNotificationTargets(),
  ])

  return (
    <NotificationsFeed initialNotifications={notifications} targets={targets} />
  )
}
