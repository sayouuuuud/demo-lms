import { SecurityDashboard } from '@/components/admin/security/security-dashboard'
import {
  getSecurityOverview,
  listStudentSecurity,
  listSecurityEvents,
  listDeviceRemovalRequests,
} from './actions'

export const metadata = { title: 'الأمان والأجهزة' }
export const dynamic = 'force-dynamic'

export default async function AdminSecurityPage() {
  const [overviewRes, studentsRes, eventsRes, requestsRes] = await Promise.all([
    getSecurityOverview(),
    listStudentSecurity({ filter: 'all', page: 1 }),
    listSecurityEvents({ page: 1, pageSize: 30 }),
    listDeviceRemovalRequests('pending'),
  ])

  return (
    <SecurityDashboard
      overview={'error' in overviewRes ? null : overviewRes}
      initialStudents={'error' in studentsRes ? { rows: [], total: 0 } : studentsRes}
      initialEvents={'error' in eventsRes ? { rows: [], total: 0 } : eventsRes}
      initialRequests={'error' in requestsRes ? { rows: [] } : requestsRes}
    />
  )
}
