import 'server-only'
import { getGlobalSettings } from '@/lib/settings-data'

export type DevicePenalties = {
  newDevice: number
  deviceLimit: number
  concurrent: number
  cityChange: number
  countryChange: number
  impossibleTravel: number
  proxy: number
  ipChurn: number
}

export type DeviceSecurityConfig = {
  enabled: boolean
  enforceLimit: boolean
  enforceConcurrency: boolean
  autoBlock: boolean
  maxDevices: number
  blockThreshold: number
  concurrencyWindowSeconds: number
  cityChangeHours: number
  maxSpeedKmh: number
  ipChurnLimit: number
  dailyRecovery: number
  penalties: DevicePenalties
}

export type GeoConfig = {
  enabled: boolean
  provider: 'bigdatacloud'
  apiKey: string
  cacheDays: number
  oncePerSession: boolean
}

const DEFAULT_PENALTIES: DevicePenalties = {
  newDevice: 5,
  deviceLimit: 10,
  concurrent: 15,
  cityChange: 10,
  countryChange: 20,
  impossibleTravel: 25,
  proxy: 10,
  ipChurn: 10,
}

export const DEVICE_DEFAULTS: DeviceSecurityConfig = {
  enabled: true,
  enforceLimit: true,
  enforceConcurrency: true,
  autoBlock: true,
  maxDevices: 3,
  blockThreshold: 40,
  concurrencyWindowSeconds: 120,
  cityChangeHours: 6,
  maxSpeedKmh: 500,
  ipChurnLimit: 5,
  dailyRecovery: 1,
  penalties: DEFAULT_PENALTIES,
}

export const GEO_DEFAULTS: GeoConfig = {
  enabled: false,
  provider: 'bigdatacloud',
  apiKey: '',
  cacheDays: 30,
  oncePerSession: true,
}

function num(v: unknown, fallback: number): number {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

export async function getDeviceSecurityConfig(): Promise<DeviceSecurityConfig> {
  const s = await getGlobalSettings()
  const raw = ((s.security as any)?.devices ?? {}) as Record<string, unknown>
  const rawPen = (raw.penalties ?? {}) as Record<string, unknown>
  return {
    enabled: raw.enabled !== false,
    enforceLimit: raw.enforceLimit !== false,
    enforceConcurrency: raw.enforceConcurrency !== false,
    autoBlock: raw.autoBlock !== false,
    maxDevices: Math.max(1, num(raw.maxDevices, DEVICE_DEFAULTS.maxDevices)),
    blockThreshold: num(raw.blockThreshold, DEVICE_DEFAULTS.blockThreshold),
    concurrencyWindowSeconds: Math.max(30, num(raw.concurrencyWindowSeconds, DEVICE_DEFAULTS.concurrencyWindowSeconds)),
    cityChangeHours: num(raw.cityChangeHours, DEVICE_DEFAULTS.cityChangeHours),
    maxSpeedKmh: Math.max(100, num(raw.maxSpeedKmh, DEVICE_DEFAULTS.maxSpeedKmh)),
    ipChurnLimit: Math.max(2, num(raw.ipChurnLimit, DEVICE_DEFAULTS.ipChurnLimit)),
    dailyRecovery: num(raw.dailyRecovery, DEVICE_DEFAULTS.dailyRecovery),
    penalties: {
      newDevice: num(rawPen.newDevice, DEFAULT_PENALTIES.newDevice),
      deviceLimit: num(rawPen.deviceLimit, DEFAULT_PENALTIES.deviceLimit),
      concurrent: num(rawPen.concurrent, DEFAULT_PENALTIES.concurrent),
      cityChange: num(rawPen.cityChange, DEFAULT_PENALTIES.cityChange),
      countryChange: num(rawPen.countryChange, DEFAULT_PENALTIES.countryChange),
      impossibleTravel: num(rawPen.impossibleTravel, DEFAULT_PENALTIES.impossibleTravel),
      proxy: num(rawPen.proxy, DEFAULT_PENALTIES.proxy),
      ipChurn: num(rawPen.ipChurn, DEFAULT_PENALTIES.ipChurn),
    },
  }
}

export async function getGeoConfig(): Promise<GeoConfig> {
  const s = await getGlobalSettings()
  const raw = ((s.security as any)?.geo ?? {}) as Record<string, unknown>
  const apiKey = typeof raw.apiKey === 'string' ? raw.apiKey.trim() : ''
  return {
    enabled: raw.enabled === true && apiKey.length > 0,
    provider: 'bigdatacloud',
    apiKey,
    cacheDays: Math.max(1, num(raw.cacheDays, GEO_DEFAULTS.cacheDays)),
    oncePerSession: raw.oncePerSession !== false,
  }
}
