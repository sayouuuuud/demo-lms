import { AssignmentsPageHeader } from '@/components/assignments/assignments-page-header'
import { AssignmentsOverviewWidgets } from '@/components/assignments/assignments-overview-widgets'
import { AssignmentsExplorer } from '@/components/assignments/assignments-explorer'
import { getAssignmentRows, getAssignmentsOverview, getAssignmentsFilters } from './actions'

export default async function AdminAssignmentsPage() {
  const [rows, overview, filters] = await Promise.all([
    getAssignmentRows(),
    getAssignmentsOverview(),
    getAssignmentsFilters(),
  ])

  return (
    <div className="space-y-6">
      <AssignmentsPageHeader rows={rows} />
      <AssignmentsOverviewWidgets overview={overview} />
      <AssignmentsExplorer rows={rows} filters={filters} />
    </div>
  )
}
