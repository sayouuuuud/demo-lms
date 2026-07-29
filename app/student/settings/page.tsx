import { StudentSettingsPanel } from '@/components/student/settings/student-settings-panel'
import { getStudentProfile } from '../actions'

export default async function Page() {
  const profile = await getStudentProfile()

  return (
    <div className="space-y-6">
        <div className="text-right">
          <h2 className="text-2xl font-bold text-foreground">الإعدادات</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            إدارة معلومات حسابك وتفضيلاتك والإشعارات والأمان
          </p>
        </div>
        <StudentSettingsPanel profile={profile} />
      </div>
  )
}
