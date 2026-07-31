import type { Metadata } from 'next'
import { getMyDevices } from '@/app/student/actions/security'
import { StudentDevicesPage } from '@/components/student/security/student-devices-page'

export const metadata: Metadata = {
  title: 'أجهزتي',
}

export default async function DevicesPage() {
  const data = await getMyDevices()
  return <StudentDevicesPage data={data} />
}
