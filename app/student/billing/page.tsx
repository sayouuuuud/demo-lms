import { StudentBillingPage } from '@/components/student/billing/student-billing-page'
import { getStudentInvoices } from '@/app/student/actions'

export default async function Page() {
  const invoices = await getStudentInvoices()
  return <StudentBillingPage initialInvoices={invoices} />
}
