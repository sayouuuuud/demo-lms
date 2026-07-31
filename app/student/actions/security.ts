'use server'

import { prisma } from '@/lib/prisma'
import { logError } from '@/lib/logger'
import { revalidatePath } from 'next/cache'
import { getCurrentStudent } from '@/lib/auth-guard'
import { evaluateDeviceSession, touchDeviceSession } from '@/lib/device-guard'
import { readDeviceKey } from '@/lib/device-identity'
import { ensureSecurityState, scoreLabel } from '@/lib/security-score'
import { getDeviceSecurityConfig } from '@/lib/device-settings'
import type { ClientHints } from '@/lib/device-fingerprint'
import type { DeviceVerdict } from '@/lib/device-guard'

/** وقت نسبي بالعربي */
function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'الآن'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `قبل ${diffMin} دقيقة`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `قبل ${diffHour} ساعة`
  const diffDay = Math.floor(diffHour / 24)
  return `قبل ${diffDay} يوم`
}

/**
 * التحقق من الجهاز الحالي.
 * Fail-open: أي استثناء = skipped (ممنوع نقفل على الطالب بسبب باگ أمني).
 */
export async function checkCurrentDevice(hints: ClientHints): Promise<DeviceVerdict> {
  try {
    return await evaluateDeviceSession(hints)
  } catch (e) {
    logError('checkCurrentDevice', e)
    return { status: 'skipped', reason: 'disabled' }
  }
}

/** نبضة الجلسة — تحدّث last_seen_at بدون أي فحوصات. */
export async function pingDeviceSession(): Promise<{ ok: boolean }> {
  try {
    await touchDeviceSession()
    return { ok: true }
  } catch (e) {
    logError('pingDeviceSession', e)
    return { ok: true }
  }
}

/** بيانات صفحة أجهزتي. */
export async function getMyDevices() {
  const student = await getCurrentStudent()

  const empty = {
    maxDevices: 3,
    score: 100,
    scoreLabel: { label: 'آمن', tone: 'success' as const },
    blocked: false,
    currentDeviceKey: null as string | null,
    devices: [] as Array<{
      id: string
      label: string
      browser: string
      os: string
      deviceType: string
      lastCity: string
      lastCountry: string
      lastActiveLabel: string
      isCurrent: boolean
      createdAtLabel: string
      hasPendingRequest: boolean
    }>,
    pendingRequests: 0,
  }

  if (!student) return empty

  try {
    const [cfg, state, devices, currentDeviceKey, pendingCount] = await Promise.all([
      getDeviceSecurityConfig(),
      ensureSecurityState(student.id),
      prisma.student_trusted_devices.findMany({
        where: { student_id: student.id, status: 'active' },
        orderBy: { last_active_at: 'desc' },
      }),
      readDeviceKey(),
      prisma.device_removal_requests.count({
        where: { student_id: student.id, status: 'pending' },
      }),
    ])

    // جيب طلبات الإزالة للأجهزة بتاعته
    const deviceIds = devices.map((d) => d.id)
    const pendingRequests = await prisma.device_removal_requests.findMany({
      where: { device_id: { in: deviceIds }, status: 'pending' },
      select: { device_id: true },
    })
    const pendingSet = new Set(pendingRequests.map((r) => r.device_id))

    return {
      maxDevices: cfg.maxDevices,
      score: state.score,
      scoreLabel: scoreLabel(state.score),
      blocked: state.blocked,
      currentDeviceKey,
      devices: devices.map((d) => ({
        id: d.id,
        label: d.label,
        browser: d.browser,
        os: d.os,
        deviceType: d.device_type,
        lastCity: d.last_city,
        lastCountry: d.last_country,
        lastActiveLabel: relativeTime(d.last_active_at),
        isCurrent: d.device_key === currentDeviceKey,
        createdAtLabel: relativeTime(d.created_at),
        hasPendingRequest: pendingSet.has(d.id),
      })),
      pendingRequests: pendingCount,
    }
  } catch (e) {
    logError('getMyDevices', e)
    return empty
  }
}

/** طلب إزالة جهاز — الطالب مش بيشيل بنفسه. */
export async function requestDeviceRemoval(
  deviceId: string,
  reason: string,
): Promise<{ success?: true; error?: string }> {
  const student = await getCurrentStudent()
  if (!student) return { error: 'يجب تسجيل الدخول أولًا.' }

  const cleanReason = String(reason ?? '').trim().slice(0, 300)

  // تحقق إن الجهاز بتاعه وفعّال
  const device = await prisma.student_trusted_devices.findFirst({
    where: { id: deviceId, student_id: student.id, status: 'active' },
  })
  if (!device) return { error: 'الجهاز غير موجود.' }

  // منع طلب مكرّر لنفس الجهاز
  const existingForDevice = await prisma.device_removal_requests.findFirst({
    where: { device_id: deviceId, status: 'pending' },
  })
  if (existingForDevice) return { error: 'فيه طلب قيد المراجعة بالفعل لنفس الجهاز.' }

  // حد 3 طلبات pending كأقصى للطالب
  const totalPending = await prisma.device_removal_requests.count({
    where: { student_id: student.id, status: 'pending' },
  })
  if (totalPending >= 3) return { error: 'عندك طلبات كثيرة قيد المراجعة. استنى مراجعة الإدارة.' }

  await prisma.device_removal_requests.create({
    data: {
      student_id: student.id,
      device_id: deviceId,
      reason: cleanReason,
    },
  })

  revalidatePath('/student/devices')
  return { success: true }
}
