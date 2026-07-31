// Client + server safe. No Node-only imports here.

export type ClientHints = {
  ua: string
  platform: string
  language: string
  timezone: string
  screen: string          // "1920x1080x24"
  cores: number
  memory: number
  touch: boolean
}

/** يتنادى من الكلاينت فقط. آمن لو أي API مش موجود. */
export function collectClientHints(): ClientHints {
  const nav = typeof navigator !== 'undefined' ? (navigator as any) : {}
  const scr = typeof screen !== 'undefined' ? screen : ({} as any)
  let timezone = ''
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  } catch {
    timezone = ''
  }
  return {
    ua: String(nav.userAgent || '').slice(0, 400),
    platform: String(nav.platform || nav.userAgentData?.platform || '').slice(0, 60),
    language: String(nav.language || '').slice(0, 20),
    timezone: String(timezone).slice(0, 60),
    screen: `${scr.width || 0}x${scr.height || 0}x${scr.colorDepth || 0}`,
    cores: Number(nav.hardwareConcurrency) || 0,
    memory: Number(nav.deviceMemory) || 0,
    touch: typeof window !== 'undefined' ? 'ontouchstart' in window : false,
  }
}

/** تسمية ودّية للجهاز — تتحسب على السيرفر من الـ UA. */
export function describeDevice(ua: string): { browser: string; os: string; deviceType: string; label: string } {
  const u = (ua || '').toLowerCase()

  let browser = 'متصفح غير معروف'
  if (u.includes('edg/')) browser = 'Edge'
  else if (u.includes('opr/') || u.includes('opera')) browser = 'Opera'
  else if (u.includes('chrome') && !u.includes('chromium')) browser = 'Chrome'
  else if (u.includes('firefox')) browser = 'Firefox'
  else if (u.includes('safari')) browser = 'Safari'

  let os = 'نظام غير معروف'
  if (u.includes('windows nt 10') || u.includes('windows nt 11')) os = 'Windows'
  else if (u.includes('windows')) os = 'Windows'
  else if (u.includes('android')) os = 'Android'
  else if (u.includes('iphone') || u.includes('ipad') || u.includes('ios')) os = 'iOS'
  else if (u.includes('mac os')) os = 'macOS'
  else if (u.includes('linux')) os = 'Linux'

  let deviceType = 'كمبيوتر'
  if (u.includes('ipad') || u.includes('tablet')) deviceType = 'تابلت'
  else if (u.includes('mobile') || u.includes('android') || u.includes('iphone')) deviceType = 'موبايل'

  return { browser, os, deviceType, label: `${browser} على ${os}` }
}
