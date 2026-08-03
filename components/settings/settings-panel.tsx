'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateSettings, updateAdminProfile, updatePlatformSettings, updateAdminPassword } from '@/app/admin/settings/actions'

import { uploadFiles } from '@/lib/uploadthing'
import { useTheme } from '@/components/theme-provider'
import {
  User,
  Bell,
  Shield,
  SlidersHorizontal,
  Camera,
  Check,
  Loader2,
  LayoutTemplate,
  UsersRound,
  DatabaseBackup,
  Video,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ToggleSwitch } from '@/components/settings/toggle-switch'
import { SiteContentTab } from '@/components/settings/site-content-tab'
import { AssistantsTab } from '@/components/settings/assistants-tab'
import { BackupTab } from '@/components/settings/backup-tab'
import { StreamingTab } from '@/components/settings/streaming-tab'
import type { AssistantRecord } from '@/app/admin/settings/assistants-actions'
import type { SiteContent } from '@/lib/site-content-defaults'
import { DEFAULT_SITE_CONTENT } from '@/lib/site-content-defaults'
import { neonPresets, applyNeonPreset, type NeonPresetId } from '@/lib/neon-presets'
import { lightPresets, applyLightPreset, type LightPresetId } from '@/lib/light-presets'

// ── Color presets ──────────────────────────────────────────────
const colorPresets = [
  {
    id: 'navy',
    label: 'كحلي',
    light: { primary: 'oklch(0.27 0.066 264)', sidebar: 'oklch(0.3 0.066 264)', ring: 'oklch(0.3 0.066 264)' },
    dark: { primary: 'oklch(0.45 0.08 264)', sidebar: 'oklch(0.45 0.08 264)', ring: 'oklch(0.45 0.08 264)' },
    swatch: '#1e2a4a',
  },
  {
    id: 'violet',
    label: 'بنفسجي',
    light: { primary: 'oklch(0.55 0.21 287)', sidebar: 'oklch(0.6 0.21 287)', ring: 'oklch(0.55 0.21 287)' },
    dark: { primary: 'oklch(0.62 0.21 287)', sidebar: 'oklch(0.62 0.21 287)', ring: 'oklch(0.62 0.21 287)' },
    swatch: '#7c3aed',
  },
  {
    id: 'blue',
    label: 'أزرق',
    light: { primary: 'oklch(0.55 0.2 240)', sidebar: 'oklch(0.6 0.2 240)', ring: 'oklch(0.55 0.2 240)' },
    dark: { primary: 'oklch(0.62 0.2 240)', sidebar: 'oklch(0.62 0.2 240)', ring: 'oklch(0.62 0.2 240)' },
    swatch: '#2563eb',
  },
  {
    id: 'cyan',
    label: 'سماوي',
    light: { primary: 'oklch(0.58 0.18 210)', sidebar: 'oklch(0.62 0.18 210)', ring: 'oklch(0.58 0.18 210)' },
    dark: { primary: 'oklch(0.65 0.18 210)', sidebar: 'oklch(0.65 0.18 210)', ring: 'oklch(0.65 0.18 210)' },
    swatch: '#0891b2',
  },
  {
    id: 'green',
    label: 'أخضر',
    light: { primary: 'oklch(0.55 0.18 160)', sidebar: 'oklch(0.6 0.18 160)', ring: 'oklch(0.55 0.18 160)' },
    dark: { primary: 'oklch(0.62 0.18 160)', sidebar: 'oklch(0.62 0.18 160)', ring: 'oklch(0.62 0.18 160)' },
    swatch: '#16a34a',
  },
  {
    id: 'orange',
    label: 'برتقالي',
    light: { primary: 'oklch(0.65 0.2 55)', sidebar: 'oklch(0.68 0.2 55)', ring: 'oklch(0.65 0.2 55)' },
    dark: { primary: 'oklch(0.7 0.2 55)', sidebar: 'oklch(0.7 0.2 55)', ring: 'oklch(0.7 0.2 55)' },
    swatch: '#ea580c',
  },
  {
    id: 'rose',
    label: 'وردي',
    light: { primary: 'oklch(0.58 0.22 10)', sidebar: 'oklch(0.62 0.22 10)', ring: 'oklch(0.58 0.22 10)' },
    dark: { primary: 'oklch(0.65 0.22 10)', sidebar: 'oklch(0.65 0.22 10)', ring: 'oklch(0.65 0.22 10)' },
    swatch: '#e11d48',
  },
] as const

type PresetId = (typeof colorPresets)[number]['id']

function applyColorPreset(id: PresetId) {
  const preset = colorPresets.find((p) => p.id === id)
  if (!preset) return
  
  let styleEl = document.getElementById('dynamic-theme') as HTMLStyleElement
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'dynamic-theme'
    document.head.appendChild(styleEl)
  }
  
  styleEl.innerHTML = `.theme-dashboard { --primary: ${preset.light.primary}; --ring: ${preset.light.ring}; --sidebar-primary: ${preset.light.sidebar}; --sidebar-accent: ${preset.light.sidebar}; --sidebar-ring: ${preset.light.ring}; }
.dark .theme-dashboard { --primary: ${preset.dark.primary}; --ring: ${preset.dark.ring}; --sidebar-primary: ${preset.dark.sidebar}; --sidebar-accent: ${preset.dark.sidebar}; --sidebar-ring: ${preset.dark.ring}; }`
  localStorage.setItem('color-preset', id)
}

const baseTabs = [
  { id: 'profile',    label: 'الملف الشخصي',     icon: User },
  { id: 'security',   label: 'الأمان',            icon: Shield },
  { id: 'preferences',label: 'التفضيلات',         icon: SlidersHorizontal },
  { id: 'content',    label: 'محتوى الموقع',      icon: LayoutTemplate },
  { id: 'streaming',  label: 'الفيديو والـ Streaming', icon: Video },
  { id: 'assistants', label: 'المساعدون',         icon: UsersRound },
  { id: 'backup',     label: 'النسخ الاحتياطي',   icon: DatabaseBackup },
] as const

type TabId = (typeof baseTabs)[number]['id']

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-right text-sm font-medium text-foreground">
      {children}
    </label>
  )
}

export function SettingsPanel({
  initialSettings,
  adminProfile,
  initialSiteContent,
  initialPlatformSettings,
  initialStreamingSettings = null,
  initialStreamingJobs = [],
  initialStreamingVideos = [],
  isFullAdmin = false,
  initialAssistants = [],
}: {
  initialSettings?: any
  adminProfile?: {
    fullName: string
    email: string
    phone: string
    avatarUrl: string
    role: string
    initials: string
  } | null
  initialSiteContent?: SiteContent
  initialPlatformSettings?: { is_streaming_enabled: boolean; whatsapp_payment_notify: boolean } | null
  initialStreamingSettings?: any
  initialStreamingJobs?: any[]
  initialStreamingVideos?: any[]
  isFullAdmin?: boolean
  initialAssistants?: AssistantRecord[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<TabId>('profile')

  // The "assistants", "backup", and "streaming" tabs are restricted to full admins only.
  const tabs = baseTabs.filter(
    (t) => (t.id !== 'assistants' && t.id !== 'backup' && t.id !== 'streaming') || isFullAdmin,
  )

  const settings = initialSettings || {
    profile: { firstName: 'محمد', lastName: 'أحمد', email: 'mohamed@platform.com', phone: '+20 100 123 4567', bio: 'مدير منصة تعليمية متخصصة في الدورات التقنية.' },
    notifications: { emailNotif: true, pushNotif: true, smsNotif: false, marketingNotif: false, weeklyReport: true },
    security: { requireEmailVerification: true, allowRegistrations: true },
    preferences: { darkMode: false, autoPublish: false, activeColor: 'navy' as PresetId, neonPreset: 'teal-violet' as NeonPresetId }
  }

  // Real admin profile is the source of truth for name/email/phone/avatar.
  const nameParts = (adminProfile?.fullName || '').trim().split(/\s+/).filter(Boolean)
  const [firstName, setFirstName] = useState(nameParts[0] ?? settings.profile.firstName)
  const [lastName, setLastName] = useState(
    nameParts.length > 1 ? nameParts.slice(1).join(' ') : settings.profile.lastName,
  )
  const [email] = useState(adminProfile?.email || settings.profile.email)
  const [phone, setPhone] = useState(adminProfile?.phone || settings.profile.phone)
  const [bio, setBio] = useState(settings.profile.bio)

  // Avatar upload state.
  const [avatarUrl, setAvatarUrl] = useState(adminProfile?.avatarUrl || '')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const roleLabel = adminProfile?.role === 'admin' ? 'مدير المنصة' : adminProfile?.role || 'مدير المنصة'
  const displayName = `${firstName} ${lastName}`.trim() || 'مدير المنصة'
  const initials = (displayName || 'أ').trim().slice(0, 2)

  async function handleAvatarFile(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('من فضلك اختر ملف صورة')
      return
    }
    setUploadingAvatar(true)
    try {
      const res = await uploadFiles('siteImage', { files: [file] })
      if (!res || !res[0]) throw new Error('فشل الرفع')
      const url = res[0].url
      setAvatarUrl(url)
      toast.success('تم رفع الصورة، اضغط حفظ التغييرات لتثبيتها')
    } catch (e) {
      toast.error(`فشل رفع الصورة: ${e instanceof Error ? e.message : 'خطأ غير معروف'}`)
    } finally {
      setUploadingAvatar(false)
    }
  }

  function handleProfileSave() {
    const fullName = `${firstName} ${lastName}`.trim()
    startTransition(async () => {
      const res = await updateAdminProfile({ fullName, phone, avatarUrl })
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success('تم حفظ الملف الشخصي بنجاح')
        router.refresh()
      }
    })
  }

  const [emailNotif, setEmailNotif] = useState(settings.notifications.emailNotif)
  const [pushNotif, setPushNotif] = useState(settings.notifications.pushNotif)
  const [smsNotif, setSmsNotif] = useState(settings.notifications.smsNotif)
  const [marketingNotif, setMarketingNotif] = useState(settings.notifications.marketingNotif)
  const [weeklyReport, setWeeklyReport] = useState(settings.notifications.weeklyReport)

  // Dark mode is driven by the shared theme provider so the toggle flips the
  // whole UI immediately and persists across reloads.
  const { isDark, toggleTheme } = useTheme()
  const darkMode = isDark
  const setDarkMode = (_v: boolean) => toggleTheme()
  const [autoPublish, setAutoPublish] = useState(settings.preferences.autoPublish)
  const [activeColor, setActiveColor] = useState<PresetId>(settings.preferences.activeColor as PresetId)
  const [neonPreset, setNeonPreset] = useState<NeonPresetId>(
    (settings.preferences.neonPreset ?? 'teal-violet') as NeonPresetId,
  )
  const [lightPreset, setLightPreset] = useState<LightPresetId>(
    (settings.preferences.lightPreset ?? 'navy-gold') as LightPresetId,
  )

  // Email verification on signup (defaults to ON when not previously saved).
  const [requireEmailVerification, setRequireEmailVerification] = useState(
    settings.security?.requireEmailVerification !== false,
  )

  const [deviceSecurity, setDeviceSecurity] = useState(() => ({
    enabled: settings.security?.devices?.enabled !== false,
    enforceLimit: settings.security?.devices?.enforceLimit !== false,
    enforceConcurrency: settings.security?.devices?.enforceConcurrency !== false,
    autoBlock: settings.security?.devices?.autoBlock !== false,
    notifyWhatsApp: settings.security?.devices?.notifyWhatsApp === true,
    maxDevices: Number(settings.security?.devices?.maxDevices) || 3,
    blockThreshold: Number(settings.security?.devices?.blockThreshold) || 40,
    concurrencyWindowSeconds: Number(settings.security?.devices?.concurrencyWindowSeconds) || 120,
    cityChangeHours: Number(settings.security?.devices?.cityChangeHours) || 6,
    maxSpeedKmh: Number(settings.security?.devices?.maxSpeedKmh) || 500,
    ipChurnLimit: Number(settings.security?.devices?.ipChurnLimit) || 5,
    dailyRecovery: Number(settings.security?.devices?.dailyRecovery ?? 1),
    penalties: {
      newDevice: Number(settings.security?.devices?.penalties?.newDevice ?? 5),
      deviceLimit: Number(settings.security?.devices?.penalties?.deviceLimit ?? 10),
      concurrent: Number(settings.security?.devices?.penalties?.concurrent ?? 15),
      cityChange: Number(settings.security?.devices?.penalties?.cityChange ?? 10),
      countryChange: Number(settings.security?.devices?.penalties?.countryChange ?? 20),
      impossibleTravel: Number(settings.security?.devices?.penalties?.impossibleTravel ?? 25),
      proxy: Number(settings.security?.devices?.penalties?.proxy ?? 10),
      ipChurn: Number(settings.security?.devices?.penalties?.ipChurn ?? 10),
    },
  }))

  const [geoSettings, setGeoSettings] = useState(() => ({
    enabled: settings.security?.geo?.enabled === true,
    provider: 'bigdatacloud' as const,
    apiKey: String(settings.security?.geo?.apiKey ?? ''),
    cacheDays: Number(settings.security?.geo?.cacheDays) || 30,
    oncePerSession: settings.security?.geo?.oncePerSession !== false,
  }))

  const [showGeoKey, setShowGeoKey] = useState(false)

  const [isStreamingEnabled, setIsStreamingEnabled] = useState(
    initialPlatformSettings?.is_streaming_enabled ?? false,
  )

  const [whatsappPaymentNotify, setWhatsappPaymentNotify] = useState(
    initialPlatformSettings?.whatsapp_payment_notify ?? true,
  )

  // Whether new students can register (defaults to ON when not previously saved).
  const [allowRegistrations, setAllowRegistrations] = useState(
    settings.security?.allowRegistrations !== false,
  )

  // Password change fields.
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  async function handlePasswordUpdate() {
    if (newPassword.length < 6) {
      toast.error('كلمة المرور لازم تكون 6 أحرف على الأقل.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('كلمتا المرور غير متطابقتين.')
      return
    }
    startTransition(async () => {
      const res = await updateAdminPassword(newPassword)
      if (res?.error) {
        toast.error(res.error || 'تعذّر تحديث كلمة المرور. حاول تاني.')
      } else {
        toast.success('تم تحديث كلمة المرور بنجاح')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    })
  }

  async function handleSave() {
    startTransition(async () => {
      const newSettings = {
        profile: { firstName, lastName, email, phone, bio },
        notifications: { emailNotif, pushNotif, smsNotif, marketingNotif, weeklyReport },
        security: {
          ...(initialSettings?.security ?? {}),
          requireEmailVerification,
          allowRegistrations,
          devices: deviceSecurity,
          geo: geoSettings,
        },
        preferences: { darkMode, autoPublish, activeColor, neonPreset, lightPreset }
      }

      const res = await updateSettings(newSettings)
      const resPlatform = await updatePlatformSettings({
        is_streaming_enabled: isStreamingEnabled,
        whatsapp_payment_notify: whatsappPaymentNotify,
      })

      if (res.error || resPlatform?.error) {
        toast.error(res.error || resPlatform?.error)
      } else {
        toast.success('تم حفظ التفضيلات بنجاح')
        router.refresh()
      }
    })
  }

  function handleColorChange(id: PresetId) {
    setActiveColor(id)
    applyColorPreset(id)
  }

  function handleNeonChange(id: NeonPresetId) {
    setNeonPreset(id)
    applyNeonPreset(id)
  }

  function handleLightChange(id: LightPresetId) {
    setLightPreset(id)
    applyLightPreset(id)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      {/* Tabs nav */}
      <div className="rounded-2xl border border-border bg-card p-2">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col">
          {tabs.map((tab) => {
            const active = tab.id === activeTab
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <tab.icon className="size-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Panel content */}
      <div className="rounded-2xl border border-border bg-card p-6">
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="text-right">
              <h3 className="text-lg font-bold text-foreground">الملف الشخصي</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                حدّث معلوماتك الشخصية وصورة الحساب
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="size-20 ring-2 ring-primary/30">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                  <AvatarFallback className="bg-primary/15 text-xl font-semibold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleAvatarFile(e.target.files?.[0])}
                />
                <button
                  type="button"
                  disabled={uploadingAvatar}
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute -bottom-1 -left-1 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow transition-transform hover:scale-105 disabled:opacity-70"
                  aria-label="تغيير الصورة"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Camera className="size-3.5" />
                  )}
                </button>
              </div>
              <div className="text-right">
                <p className="text-base font-semibold text-foreground">{displayName}</p>
                <p className="text-sm text-muted-foreground">{roleLabel}</p>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>الاسم الأول</FieldLabel>
                <Input value={firstName} onChange={e => setFirstName(e.target.value)} className="text-right" />
              </div>
              <div>
                <FieldLabel>الاسم الأخير</FieldLabel>
                <Input value={lastName} onChange={e => setLastName(e.target.value)} className="text-right" />
              </div>
              <div>
                <FieldLabel>البريد الإلكتروني</FieldLabel>
                <Input
                  type="email"
                  value={email}
                  readOnly
                  disabled
                  className="text-right"
                  dir="ltr"
                />
              </div>
              <div>
                <FieldLabel>رقم الهاتف</FieldLabel>
                <Input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="text-right"
                  dir="ltr"
                />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel>نبذة تعريفية</FieldLabel>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-right text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>

            <div className="flex justify-start gap-3">
              <Button onClick={handleProfileSave} disabled={isPending || uploadingAvatar}>حفظ التغييرات</Button>
              <Button variant="outline">إلغاء</Button>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="text-right">
              <h3 className="text-lg font-bold text-foreground">الأمان</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                إدارة كلمة المرور وحماية حسابك
              </p>
            </div>
            <Separator />
            <div className="grid gap-4 sm:max-w-md">
              <div>
                <FieldLabel>كلمة المرور الحالية</FieldLabel>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  dir="ltr"
                />
              </div>
              <div>
                <FieldLabel>كلمة المرور الجديدة</FieldLabel>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  dir="ltr"
                />
              </div>
              <div>
                <FieldLabel>تأكيد كلمة المرور</FieldLabel>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  dir="ltr"
                />
              </div>
            </div>
            <div className="flex justify-start gap-3">
              <Button onClick={handlePasswordUpdate} disabled={isPending}>
                تحديث كلمة المرور
              </Button>
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <ToggleSwitch
                  checked={requireEmailVerification}
                  onChange={setRequireEmailVerification}
                  label="التحقق من البريد الإلكتروني عند التسجيل"
                  description="لما يكون مفعّل، الطالب الجديد بيستلم كود تفعيل على إيميله. قفله يخلّي الحساب يتفعّل على طول من غير تأكيد البريد."
                />
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <ToggleSwitch
                  checked={allowRegistrations}
                  onChange={setAllowRegistrations}
                  label="السماح بتسجيل طلاب جدد"
                  description="لما يكون مفعّل، أي طالب يقدر ينشئ حساب جديد. قفله يوقف التسجيل تمامًا (مفيد وقت إغلاق القبول)."
                />
              </div>
              <div className="flex justify-start gap-3 pt-1">
                <Button onClick={handleSave} disabled={isPending}>
                  حفظ إعدادات الأمان
                </Button>
              </div>
            </div>

            <Separator />

            {/* قسم الأجهزة وسكور الأمان */}
            <div className="space-y-3">
              <div className="text-right">
                <h4 className="text-base font-semibold text-foreground">الأجهزة وسكور الأمان</h4>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  تحكّم في حد الأجهزة ونظام التقييم الأمني للطلاب
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <ToggleSwitch
                  checked={deviceSecurity.enabled}
                  onChange={(v) => setDeviceSecurity((s) => ({ ...s, enabled: v }))}
                  label="تشغيل نظام الأجهزة"
                  description="تتبع أجهزة الطلاب، وتسجيل الجلسات، ومنع الوصول من أجهزة زائدة."
                />
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <ToggleSwitch
                  checked={deviceSecurity.enforceLimit}
                  onChange={(v) => setDeviceSecurity((s) => ({ ...s, enforceLimit: v }))}
                  label="فرض حد الأجهزة"
                  description="لو مقفول، الجهاز الزائد بيتسجّل بس بدون منع — بيسجّل حدث أمني بس."
                />
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <ToggleSwitch
                  checked={deviceSecurity.enforceConcurrency}
                  onChange={(v) => setDeviceSecurity((s) => ({ ...s, enforceConcurrency: v }))}
                  label="منع الدخول المتزامن"
                  description="منع الطالب من فتح أكتر من جلسة نشطة في نفس الوقت."
                />
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <ToggleSwitch
                  checked={deviceSecurity.autoBlock}
                  onChange={(v) => setDeviceSecurity((s) => ({ ...s, autoBlock: v }))}
                  label="الحظر التلقائي"
                  description="يحظر الطالب تلقائيًا لو السكور نزل تحت الحد المحدد."
                />
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <ToggleSwitch
                  checked={deviceSecurity.notifyWhatsApp}
                  onChange={(v) => setDeviceSecurity((s) => ({ ...s, notifyWhatsApp: v }))}
                  label="إشعار واتساب للأحداث الخطيرة"
                  description="يبعت رسالة واتساب للطالب عند رصد دخول متزامن أو تغيير دولة أو انتقال مريب. يتطلب إعداد Evolution API في متغيرات البيئة."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <FieldLabel>الحد الأقصى للأجهزة (1–10)</FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={deviceSecurity.maxDevices}
                    onChange={(e) => setDeviceSecurity((s) => ({ ...s, maxDevices: Math.min(10, Math.max(1, Number(e.target.value))) }))}
                    className="text-left"
                    dir="ltr"
                  />
                </div>
                <div>
                  <FieldLabel>حد الحظر للسكور (0–99)</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    value={deviceSecurity.blockThreshold}
                    onChange={(e) => setDeviceSecurity((s) => ({ ...s, blockThreshold: Math.min(99, Math.max(0, Number(e.target.value))) }))}
                    className="text-left"
                    dir="ltr"
                  />
                </div>
                <div>
                  <FieldLabel>نافذة التزامن (ثانية، min 30)</FieldLabel>
                  <Input
                    type="number"
                    min={30}
                    value={deviceSecurity.concurrencyWindowSeconds}
                    onChange={(e) => setDeviceSecurity((s) => ({ ...s, concurrencyWindowSeconds: Math.max(30, Number(e.target.value)) }))}
                    className="text-left"
                    dir="ltr"
                  />
                </div>
                <div>
                  <FieldLabel>تعافي يومي للسكور (0–10)</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={deviceSecurity.dailyRecovery}
                    onChange={(e) => setDeviceSecurity((s) => ({ ...s, dailyRecovery: Math.min(10, Math.max(0, Number(e.target.value))) }))}
                    className="text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* شبكة العقوبات */}
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="mb-3 text-right text-sm font-medium text-foreground">عقوبات السكور</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {(
                    [
                      { key: 'newDevice', label: 'جهاز جديد' },
                      { key: 'deviceLimit', label: 'تجاوز حد الأجهزة' },
                      { key: 'concurrent', label: 'دخول متزامن' },
                      { key: 'cityChange', label: 'تغيير المدينة' },
                      { key: 'countryChange', label: 'تغيير الدولة' },
                      { key: 'impossibleTravel', label: 'سفر مستحيل' },
                      { key: 'proxy', label: 'استخدام بروكسي' },
                      { key: 'ipChurn', label: 'تغيير IP كثير' },
                    ] as const
                  ).map(({ key, label }) => (
                    <div key={key}>
                      <FieldLabel>{label}</FieldLabel>
                      <Input
                        type="number"
                        min={0}
                        max={50}
                        value={deviceSecurity.penalties[key]}
                        onChange={(e) =>
                          setDeviceSecurity((s) => ({
                            ...s,
                            penalties: { ...s.penalties, [key]: Math.min(50, Math.max(0, Number(e.target.value))) },
                          }))
                        }
                        className="text-left"
                        dir="ltr"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            {/* قسم خدمة تحديد الموقع */}
            <div className="space-y-3">
              <div className="text-right">
                <h4 className="text-base font-semibold text-foreground">خدمة تحديد الموقع (IP Geolocation)</h4>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  تحديد موقع الطالب من عنوان الـ IP لرصد النشاط المريب
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <ToggleSwitch
                  checked={geoSettings.enabled}
                  onChange={(v) => setGeoSettings((s) => ({ ...s, enabled: v }))}
                  label="تشغيل خدمة الموقع"
                  description="تحديد مدينة ودولة الطالب من عنوان الـ IP عند كل جلسة دخول جديدة."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>المزوّد</FieldLabel>
                  <Input value="BigDataCloud" readOnly disabled className="text-left" dir="ltr" />
                </div>
                <div>
                  <FieldLabel>مفتاح API</FieldLabel>
                  <div className="relative" dir="ltr">
                    <Input
                      type={showGeoKey ? 'text' : 'password'}
                      value={geoSettings.apiKey}
                      onChange={(e) => setGeoSettings((s) => ({ ...s, apiKey: e.target.value }))}
                      placeholder="Enter BigDataCloud API key"
                      className="text-left pe-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeoKey((v) => !v)}
                      className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showGeoKey ? 'إخفاء المفتاح' : 'إظهار المفتاح'}
                    >
                      {showGeoKey ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <FieldLabel>مدة الكاش (أيام، min 1)</FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    value={geoSettings.cacheDays}
                    onChange={(e) => setGeoSettings((s) => ({ ...s, cacheDays: Math.max(1, Number(e.target.value)) }))}
                    className="text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <ToggleSwitch
                  checked={geoSettings.oncePerSession}
                  onChange={(v) => setGeoSettings((s) => ({ ...s, oncePerSession: v }))}
                  label="استدعاء مرة واحدة لكل جلسة"
                  description="موصى به بشدة لتوفير رصيد الخدمة. بيمنع الاستدعاء المتكرر في نفس الجلسة."
                />
              </div>

              <p className="rounded-xl border border-border bg-muted/20 p-3 text-right text-xs text-muted-foreground leading-relaxed">
                اعمل حساب على{' '}
                <a
                  href="https://www.bigdatacloud.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  bigdatacloud.com
                </a>{' '}
                واستخدم مفتاح IP Geolocation. الاستدعاء بيحصل مرة واحدة لكل جلسة دخول ومع كاش لكل IP.
              </p>
            </div>

            <div className="flex justify-start gap-3 pt-1">
              <Button onClick={handleSave} disabled={isPending}>
                حفظ إعدادات الأجهزة والموقع
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="space-y-2">
            <div className="text-right">
              <h3 className="text-lg font-bold text-foreground">التفضيلات</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                خصّص تجربتك داخل لوحة الإدارة
              </p>
            </div>
            <Separator className="my-4" />
            <div className="divide-y divide-border">
              <ToggleSwitch
                checked={darkMode}
                onChange={setDarkMode}
                label="الوضع الليلي"
                description="استخدام السمة الداكنة للواجهة"
              />
              <ToggleSwitch
                checked={autoPublish}
                onChange={setAutoPublish}
                label="النشر التلقائي"
                description="نشر المحاضرات الجديدة تلقائياً بعد المراجعة"
              />
              <ToggleSwitch
                checked={isStreamingEnabled}
                onChange={setIsStreamingEnabled}
                label="تفعيل تحويل الفيديو (HLS Streaming)"
                description="تشفير وتقطيع الفيديوهات لمنع التحميل وتحسين سرعة التشغيل. يتطلب إعداد Cloudflare R2."
              />
              <ToggleSwitch
                checked={whatsappPaymentNotify}
                onChange={setWhatsappPaymentNotify}
                label="إشعارات الواتساب عند قبول المدفوعات"
                description="لما يتقبل طلب دفع، يوصل للطالب رسالة واتساب تلقائية بتفاصيل الطلب. قفله يوقف الإرسال من غير ما يأثر على قبول الطلب."
              />
            </div>

            {/* Color picker */}
            <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
              <p className="mb-3 text-right text-sm font-medium text-foreground">
                لون الموقع
              </p>
              <p className="mb-4 text-right text-xs text-muted-foreground">
                اختر اللون الرئيسي للواجهة وسيتطبق فوراً على السايدبار والأزرار
              </p>
              <div className="flex flex-wrap gap-3">
                {colorPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleColorChange(preset.id)}
                    title={preset.label}
                    aria-label={preset.label}
                    className={cn(
                      'group relative flex size-10 items-center justify-center rounded-full transition-transform hover:scale-110',
                      activeColor === preset.id && 'ring-2 ring-offset-2 ring-offset-card ring-foreground/30',
                    )}
                    style={{ backgroundColor: preset.swatch }}
                  >
                    {activeColor === preset.id && (
                      <Check className="size-4 text-white drop-shadow" strokeWidth={3} />
                    )}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-right text-xs text-muted-foreground">
                اللون الحالي:{' '}
                <span className="font-semibold text-foreground">
                  {colorPresets.find((p) => p.id === activeColor)?.label}
                </span>
              </p>
            </div>

            {/* Public-page dark theme picker */}
            <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
              <p className="mb-3 text-right text-sm font-medium text-foreground">
                ثيمات الصفحات العامة — الوضع الداكن
              </p>
              <p className="mb-4 text-right text-xs text-muted-foreground">
                اختر لوحة الألوان المناسبة للصفحة الرئيسية والصفحات العامة عند تفعيل الوضع الداكن.
              </p>
              <div className="flex flex-wrap gap-3">
                {neonPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleNeonChange(preset.id)}
                    title={preset.label}
                    aria-label={preset.label}
                    className={cn(
                      'group relative flex size-10 items-center justify-center overflow-hidden rounded-full transition-transform hover:scale-110',
                      neonPreset === preset.id && 'ring-2 ring-offset-2 ring-offset-card ring-foreground/30',
                    )}
                    style={{
                      background: `linear-gradient(135deg, ${preset.swatch1} 0 50%, ${preset.swatch2} 50% 100%)`,
                    }}
                  >
                    {neonPreset === preset.id && (
                      <Check className="size-4 text-white drop-shadow" strokeWidth={3} />
                    )}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-right text-xs text-muted-foreground">
                الثيم الحالي:{' '}
                <span className="font-semibold text-foreground">
                  {neonPresets.find((p) => p.id === neonPreset)?.label}
                </span>
              </p>
            </div>

            {/* Public-page light theme picker */}
            <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
              <p className="mb-3 text-right text-sm font-medium text-foreground">
                ثيمات الصفحات العامة — الوضع الفاتح
              </p>
              <p className="mb-4 text-right text-xs text-muted-foreground">
                اختر لوحة الألوان المناسبة للصفحة الرئيسية والصفحات العامة عند تفعيل الوضع الفاتح.
              </p>
              <div className="flex flex-wrap gap-3">
                {lightPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleLightChange(preset.id)}
                    title={preset.label}
                    aria-label={preset.label}
                    className={cn(
                      'group relative flex size-10 items-center justify-center overflow-hidden rounded-full transition-transform hover:scale-110 border border-border/50',
                      lightPreset === preset.id && 'ring-2 ring-offset-2 ring-offset-card ring-foreground/30',
                    )}
                    style={{
                      background: `linear-gradient(135deg, ${preset.swatch1} 0 50%, ${preset.swatch2} 50% 100%)`,
                    }}
                  >
                    {lightPreset === preset.id && (
                      <Check className="size-4 text-white drop-shadow" strokeWidth={3} />
                    )}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-right text-xs text-muted-foreground">
                الثيم الحالي:{' '}
                <span className="font-semibold text-foreground">
                  {lightPresets.find((p) => p.id === lightPreset)?.label}
                </span>
              </p>
            </div>

            <div className="flex justify-start pt-4">
              <Button onClick={handleSave} disabled={isPending}>حفظ التفضيلات</Button>
            </div>
          </div>
        )}

        {activeTab === 'content' && (
          <SiteContentTab
            initialContent={initialSiteContent ?? DEFAULT_SITE_CONTENT}
          />
        )}

        {activeTab === 'streaming' && isFullAdmin && (
          <StreamingTab
            settings={initialStreamingSettings}
            jobs={initialStreamingJobs}
            videos={initialStreamingVideos}
          />
        )}

        {activeTab === 'assistants' && isFullAdmin && (
          <AssistantsTab initialAssistants={initialAssistants} />
        )}

        {activeTab === 'backup' && isFullAdmin && <BackupTab />}
      </div>
    </div>
  )
}
