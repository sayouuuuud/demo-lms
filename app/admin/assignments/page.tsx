import { AssignmentsPageHeader } from '@/components/assignments/assignments-page-header'
import { AssignmentsOverviewWidgets } from '@/components/assignments/assignments-overview-widgets'
import { AssignmentsExplorer } from '@/components/assignments/assignments-explorer'
import { getAssignmentRows, getAssignmentsOverview, getAssignmentsFilters } from './actions'

export default async function AdminAssignmentsPage() {
  // الصفوف أول حاجة، وبعدها الـ overview بياخدها جاهزة عشان ما نكرّرش الاستعلام
  const rows = await getAssignmentRows()
  const [overview, filters] = await Promise.all([
    getAssignmentsOverview(rows),
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
