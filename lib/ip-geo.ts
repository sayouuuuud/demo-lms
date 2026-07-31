import 'server-only'
import { prisma } from '@/lib/prisma'
import { logError } from '@/lib/logger'
import { getGeoConfig } from '@/lib/device-settings'

export type GeoResult = {
  ip: string
  city: string
  country: string
  countryCode: string
  lat: number | null
  lon: number | null
  isProxy: boolean
  fromCache: boolean
}

/** يستخرج أول IP حقيقي من هيدرز الطلب. */
export function extractIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for') || ''
  const first = xff.split(',')[0]?.trim()
  return first || headers.get('x-real-ip') || ''
}

function isPrivateIp(ip: string): boolean {
  if (!ip) return true
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true
  if (/^10\./.test(ip)) return true
  if (/^192\.168\./.test(ip)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true
  return false
}

/**
 * يرجّع بيانات الموقع للـ IP.
 * - لو الـ geo مقفول أو المفتاح فاضي أو الـ IP محلي → null (بدون استدعاء خارجي).
 * - بيقرأ من ip_geo_cache الأول. الاستدعاء الخارجي بيحصل بس لو مفيش كاش صالح.
 */
export async function lookupIp(ip: string): Promise<GeoResult | null> {
  const cfg = await getGeoConfig()
  if (!cfg.enabled) return null
  if (isPrivateIp(ip)) return null

  // 1) الكاش
  try {
    const cached = await prisma.ip_geo_cache.findUnique({ where: { ip } })
    if (cached) {
      const ageMs = Date.now() - cached.fetched_at.getTime()
      if (ageMs < cfg.cacheDays * 24 * 60 * 60 * 1000) {
        return {
          ip,
          city: cached.city,
          country: cached.country,
          countryCode: cached.country_code,
          lat: cached.lat ?? null,
          lon: cached.lon ?? null,
          isProxy: cached.is_proxy,
          fromCache: true,
        }
      }
    }
  } catch (e) {
    logError('lookupIp.cache', e)
  }

  // 2) BigDataCloud
  try {
    const url =
      `https://api.bigdatacloud.net/data/ip-geolocation-full` +
      `?ip=${encodeURIComponent(ip)}&localityLanguage=ar&key=${encodeURIComponent(cfg.apiKey)}`

    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) {
      logError('lookupIp.http', new Error(`BigDataCloud ${res.status}`))
      return null
    }
    const data: any = await res.json()

    const city =
      data?.location?.city ||
      data?.location?.localityName ||
      data?.location?.principalSubdivision ||
      ''
    const country = data?.country?.name || data?.country?.isoName || ''
    const countryCode = data?.country?.isoAlpha2 || ''
    const lat = typeof data?.location?.latitude === 'number' ? data.location.latitude : null
    const lon = typeof data?.location?.longitude === 'number' ? data.location.longitude : null
    const isProxy =
      data?.securityThreat?.isProxy === true ||
      data?.securityThreat?.isTor === true ||
      data?.securityThreat?.isKnownAttacker === true ||
      data?.hazardReport?.isKnownAsProxy === true

    await prisma.ip_geo_cache.upsert({
      where: { ip },
      update: {
        city, country, country_code: countryCode, lat, lon,
        is_proxy: isProxy, provider: 'bigdatacloud',
        raw: data ?? {}, fetched_at: new Date(),
      },
      create: {
        ip, city, country, country_code: countryCode, lat, lon,
        is_proxy: isProxy, provider: 'bigdatacloud', raw: data ?? {},
      },
    }).catch(() => {})

    return { ip, city, country, countryCode, lat, lon, isProxy, fromCache: false }
  } catch (e) {
    logError('lookupIp.fetch', e)
    return null
  }
}

/** المسافة بالكيلومتر بين نقطتين (Haversine). */
export function distanceKm(
  lat1: number, lon1: number, lat2: number, lon2: number,
): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}
