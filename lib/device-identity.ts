import 'server-only'
import crypto from 'crypto'
import { cookies } from 'next/headers'
import type { ClientHints } from '@/lib/device-fingerprint'

export const DEVICE_COOKIE = 'sd_device'
export const SESSION_COOKIE = 'sd_session'

const ONE_YEAR = 60 * 60 * 24 * 365
const THIRTY_DAYS = 60 * 60 * 24 * 30

function secret(): string {
  return process.env.DEVICE_SECRET || 'dev-only-device-secret-change-me'
}

function sign(value: string): string {
  return crypto.createHmac('sha256', secret()).update(value).digest('hex').slice(0, 32)
}

function pack(value: string): string {
  return `${value}.${sign(value)}`
}

function unpack(raw: string | undefined): string | null {
  if (!raw) return null
  const idx = raw.lastIndexOf('.')
  if (idx <= 0) return null
  const value = raw.slice(0, idx)
  const sig = raw.slice(idx + 1)
  const expected = sign(value)
  if (sig.length !== expected.length) return null
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  return value
}

/** بصمة الجهاز = sha256(تلميحات مستقرّة). مش بناخد الـ IP لأنه بيتغيّر. */
export function fingerprintFrom(hints: ClientHints): string {
  const stable = [
    hints.platform,
    hints.timezone,
    hints.screen,
    String(hints.cores),
    String(hints.memory),
    hints.touch ? 't' : 'f',
    // نستخدم عائلة المتصفح بس، مش رقم النسخة (بيتغيّر كل تحديث)
    (hints.ua.match(/(Chrome|Firefox|Safari|Edg|OPR)/) || ['x'])[0],
  ].join('|')
  return crypto.createHash('sha256').update(`${secret()}|${stable}`).digest('hex')
}

/** يقرأ deviceKey من الكوكي (null لو مش موجود أو التوقيع غلط). */
export async function readDeviceKey(): Promise<string | null> {
  const jar = await cookies()
  return unpack(jar.get(DEVICE_COOKIE)?.value)
}

/** يكتب/يحدّث كوكي الجهاز. يتنادى من Server Action أو Route Handler فقط. */
export async function writeDeviceKey(deviceKey: string): Promise<void> {
  const jar = await cookies()
  jar.set(DEVICE_COOKIE, pack(deviceKey), {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'development' ? 'lax' : 'none',
    secure: process.env.NODE_ENV !== 'development',
    path: '/',
    maxAge: ONE_YEAR,
  })
}

export async function readSessionKey(): Promise<string | null> {
  const jar = await cookies()
  return unpack(jar.get(SESSION_COOKIE)?.value)
}

export async function writeSessionKey(sessionKey: string): Promise<void> {
  const jar = await cookies()
  jar.set(SESSION_COOKIE, pack(sessionKey), {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'development' ? 'lax' : 'none',
    secure: process.env.NODE_ENV !== 'development',
    path: '/',
    maxAge: THIRTY_DAYS,
  })
}

export function newKey(): string {
  return crypto.randomUUID()
}
