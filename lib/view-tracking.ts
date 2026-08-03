import 'server-only'

/** شبّاك 30 دقيقة يُستخدم كمفتاح منع التكرار: 'YYYY-MM-DDTHH:MM'. */
export function currentViewBucket(now: Date = new Date()): string {
  const y = now.getUTCFullYear()
  const mo = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  const h = String(now.getUTCHours()).padStart(2, '0')
  const halfHour = now.getUTCMinutes() < 30 ? '00' : '30'
  return `${y}-${mo}-${d}T${h}:${halfHour}`
}

/** مصنّف أجهزة صغير — نفس منطق /api/track بدون أي مكتبة. */
export function classifyDevice(
  ua: string,
): 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown' {
  if (!ua) return 'unknown'
  const s = ua.toLowerCase()
  if (/bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly/.test(s)) return 'bot'
  if (/ipad|tablet|(android(?!.*mobile))/.test(s)) return 'tablet'
  if (/mobi|iphone|ipod|android.*mobile|windows phone/.test(s)) return 'mobile'
  return 'desktop'
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v)
}

/** يحصر رقمًا بين حدّين ويرجّع عددًا صحيحًا. مضاد للتلاعب من العميل. */
export function clampInt(v: unknown, min: number, max: number): number {
  const n = Math.floor(Number(v))
  if (!Number.isFinite(n)) return min
  if (n < min) return min
  if (n > max) return max
  return n
}
