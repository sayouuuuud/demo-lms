import 'server-only'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { logError } from '@/lib/logger'
import { auth } from '@/auth'
import { getDeviceSecurityConfig, getGeoConfig } from '@/lib/device-settings'
import { extractIp, lookupIp, distanceKm } from '@/lib/ip-geo'
import { recordSecurityEvent, ensureSecurityState, applyDailyRecovery } from '@/lib/security-score'
import {
  readDeviceKey, writeDeviceKey, readSessionKey, writeSessionKey, newKey, fingerprintFrom,
} from '@/lib/device-identity'
import { describeDevice, type ClientHints } from '@/lib/device-fingerprint'

export type DeviceVerdict =
  | { status: 'ok'; score: number; deviceId: string }
  | { status: 'skipped'; reason: 'disabled' | 'not-student' | 'no-student-row' }
  | { status: 'blocked'; reason: 'limit' | 'concurrent' | 'score'; message: string; score: number }

/**
 * التقييم الكامل لجلسة الجهاز الحالي.
 * تُستدعى من Server Action فقط (بتكتب كوكيز).
 */
export async function evaluateDeviceSession(hints: ClientHints): Promise<DeviceVerdict> {
  const cfg = await getDeviceSecurityConfig()
  if (!cfg.enabled) return { status: 'skipped', reason: 'disabled' }

  const session = await auth()
  const user = session?.user as any
  if (!user?.id) return { status: 'skipped', reason: 'not-student' }
  if (user.role !== 'student') return { status: 'skipped', reason: 'not-student' }

  const student = await prisma.students.findFirst({
    where: { user_id: user.id },
    select: { id: true, name: true, status: true },
  })
  if (!student) return { status: 'skipped', reason: 'no-student-row' }

  const hdrs = await headers()
  const ip = extractIp(hdrs)
  const ua = hdrs.get('user-agent') || hints.ua || ''
  const fingerprint = fingerprintFrom(hints)
  const info = describeDevice(ua)

  // 0) تعافي تدريجي + حالة محظورة مسبقًا
  await applyDailyRecovery(student.id)
  const state = await ensureSecurityState(student.id)
  if (state.blocked) {
    return {
      status: 'blocked',
      reason: 'score',
      message: 'حسابك موقوف لأسباب أمنية. تواصل مع الدعم.',
      score: state.score,
    }
  }

  // 1) تحديد الجهاز: الكوكي أولًا، وبعدين البصمة
  let deviceKey = await readDeviceKey()
  let device = deviceKey
    ? await prisma.student_trusted_devices.findFirst({
        where: { student_id: student.id, device_key: deviceKey },
      })
    : null

  if (!device && fingerprint) {
    // الكوكي ضاع/اتمسح → طابق بالبصمة عشان ما نستهلكش خانة جديدة
    device = await prisma.student_trusted_devices.findFirst({
      where: { student_id: student.id, fingerprint_hash: fingerprint, status: 'active' },
      orderBy: { last_active_at: 'desc' },
    })
    if (device) {
      deviceKey = device.device_key
      await writeDeviceKey(deviceKey)
    }
  }

  const isNewDevice = !device

  // 2) حد الأجهزة
  if (isNewDevice) {
    const activeCount = await prisma.student_trusted_devices.count({
      where: { student_id: student.id, status: 'active' },
    })

    if (activeCount >= cfg.maxDevices) {
      await recordSecurityEvent({
        studentId: student.id,
        type: 'deviceLimit',
        delta: -cfg.penalties.deviceLimit,
        ip,
        details: { activeCount, maxDevices: cfg.maxDevices, ua },
      })

      if (cfg.enforceLimit) {
        return {
          status: 'blocked',
          reason: 'limit',
          message: `وصلت للحد الأقصى (${cfg.maxDevices} أجهزة). لو عايز تسجّل من جهاز جديد، اطلب من الدعم إزالة جهاز من أجهزتك.`,
          score: (await ensureSecurityState(student.id)).score,
        }
      }
    }
  }

  // 3) إنشاء/تحديث صف الجهاز
  if (isNewDevice) {
    deviceKey = newKey()
    await writeDeviceKey(deviceKey)
    device = await prisma.student_trusted_devices.create({
      data: {
        student_id: student.id,
        device_key: deviceKey,
        fingerprint_hash: fingerprint,
        label: info.label,
        browser: info.browser,
        os: info.os,
        device_type: info.deviceType,
        first_ip: ip,
        last_ip: ip,
      },
    })

    const totalDevices = await prisma.student_trusted_devices.count({
      where: { student_id: student.id, status: 'active' },
    })
    // أول جهاز مجاني — اللي بعده بيخصم
    if (totalDevices > 1) {
      await recordSecurityEvent({
        studentId: student.id,
        type: 'newDevice',
        delta: -cfg.penalties.newDevice,
        deviceId: device.id,
        ip,
        details: { label: info.label, totalDevices },
      })
    } else {
      await recordSecurityEvent({
        studentId: student.id,
        type: 'newDevice',
        delta: 0,
        deviceId: device.id,
        ip,
        details: { label: info.label, first: true },
      })
    }
  } else {
    device = await prisma.student_trusted_devices.update({
      where: { id: device!.id },
      data: {
        last_active_at: new Date(),
        last_ip: ip || device!.last_ip,
        login_count: { increment: 1 },
        // نحدّث البصمة لو كانت فاضية (أجهزة قديمة)
        ...(device!.fingerprint_hash ? {} : { fingerprint_hash: fingerprint }),
      },
    })
  }

  // 4) الجلسة الحالية
  let sessionKey = await readSessionKey()
  let deviceSession = sessionKey
    ? await prisma.student_device_sessions.findUnique({ where: { session_key: sessionKey } })
    : null

  // جلسة ملغاة أو بتاعة طالب تاني → اعمل جديدة
  if (deviceSession && (deviceSession.revoked_at || deviceSession.student_id !== student.id)) {
    deviceSession = null
    sessionKey = null
  }

  const isNewSession = !deviceSession

  // 5) التزامن — قبل إنشاء الجلسة الجديدة
  if (isNewSession && cfg.enforceConcurrency) {
    const windowStart = new Date(Date.now() - cfg.concurrencyWindowSeconds * 1000)
    const otherActive = await prisma.student_device_sessions.findFirst({
      where: {
        student_id: student.id,
        revoked_at: null,
        last_seen_at: { gte: windowStart },
        device_id: { not: device!.id },
      },
      orderBy: { last_seen_at: 'desc' },
      include: { device: { select: { label: true } } },
    })

    if (otherActive) {
      await recordSecurityEvent({
        studentId: student.id,
        type: 'concurrent',
        delta: -cfg.penalties.concurrent,
        deviceId: device!.id,
        ip,
        details: {
          otherDevice: otherActive.device?.label ?? '',
          otherLastSeen: otherActive.last_seen_at.toISOString(),
        },
      })

      const fresh = await ensureSecurityState(student.id)
      return {
        status: 'blocked',
        reason: 'concurrent',
        message: `في جهاز تاني مسجّل دخول بحسابك دلوقتي (${otherActive.device?.label || 'جهاز آخر'}). اقفل الجلسة من الجهاز التاني وحاول تاني بعد دقيقتين.`,
        score: fresh.score,
      }
    }
  }

  if (isNewSession) {
    sessionKey = newKey()
    await writeSessionKey(sessionKey)
    deviceSession = await prisma.student_device_sessions.create({
      data: {
        student_id: student.id,
        device_id: device!.id,
        session_key: sessionKey,
        ip,
        user_agent: ua.slice(0, 400),
      },
    })
  } else {
    deviceSession = await prisma.student_device_sessions.update({
      where: { id: deviceSession!.id },
      data: { last_seen_at: new Date(), ip: ip || deviceSession!.ip, device_id: device!.id },
    })
  }

  // 6) الجغرافيا — مرة واحدة لكل جلسة
  const geoCfg = await getGeoConfig()
  const needGeo = geoCfg.enabled && (!geoCfg.oncePerSession || !deviceSession!.geo_fetched)
  if (needGeo && ip) {
    await runGeoChecks({
      studentId: student.id,
      deviceId: device!.id,
      sessionId: deviceSession!.id,
      ip,
      cfg,
    })
  }

  const finalState = await ensureSecurityState(student.id)
  if (finalState.blocked) {
    return {
      status: 'blocked',
      reason: 'score',
      message: 'حسابك موقوف لأسباب أمنية. تواصل مع الدعم.',
      score: finalState.score,
    }
  }

  return { status: 'ok', score: finalState.score, deviceId: device!.id }
}

/** فحوصات الموقع الجغرافي. مفصولة عشان القراءة. */
async function runGeoChecks(args: {
  studentId: string
  deviceId: string
  sessionId: string
  ip: string
  cfg: Awaited<ReturnType<typeof getDeviceSecurityConfig>>
}): Promise<void> {
  const { studentId, deviceId, sessionId, ip, cfg } = args
  try {
    const geo = await lookupIp(ip)

    // علّم الجلسة إنها اتسألت — حتى لو فشل الاستدعاء، عشان ما نكرّرش الاستهلاك
    await prisma.student_device_sessions.update({
      where: { id: sessionId },
      data: {
        geo_fetched: true,
        ...(geo
          ? { city: geo.city, country: geo.country, lat: geo.lat, lon: geo.lon }
          : {}),
      },
    })

    if (!geo) return

    const state = await ensureSecurityState(studentId)

    await prisma.student_trusted_devices.update({
      where: { id: deviceId },
      data: {
        last_city: geo.city, last_country: geo.country,
        last_lat: geo.lat, last_lon: geo.lon,
      },
    }).catch(() => {})

    // (أ) بروكسي / VPN
    if (geo.isProxy) {
      await recordSecurityEvent({
        studentId, type: 'proxy', delta: -cfg.penalties.proxy,
        deviceId, ip, city: geo.city, country: geo.country,
        details: { ip },
      })
    }

    // (ب) تغيّر الدولة
    if (state.last_country && geo.country && state.last_country !== geo.country) {
      await recordSecurityEvent({
        studentId, type: 'countryChange', delta: -cfg.penalties.countryChange,
        deviceId, ip, city: geo.city, country: geo.country,
        details: { from: state.last_country, to: geo.country },
      })
    }

    // (ج) تغيّر المدينة السريع
    const hoursSince = state.last_geo_at
      ? (Date.now() - state.last_geo_at.getTime()) / (60 * 60 * 1000)
      : Number.POSITIVE_INFINITY

    if (
      state.last_city && geo.city &&
      state.last_city !== geo.city &&
      hoursSince < cfg.cityChangeHours
    ) {
      await recordSecurityEvent({
        studentId, type: 'cityChange', delta: -cfg.penalties.cityChange,
        deviceId, ip, city: geo.city, country: geo.country,
        details: { from: state.last_city, to: geo.city, hours: Number(hoursSince.toFixed(2)) },
      })
    }

    // (د) انتقال غير منطقي
    if (
      state.last_lat != null && state.last_lon != null &&
      geo.lat != null && geo.lon != null &&
      Number.isFinite(hoursSince) && hoursSince > 0
    ) {
      const km = distanceKm(state.last_lat, state.last_lon, geo.lat, geo.lon)
      const speed = km / Math.max(hoursSince, 0.05)   // نتجنب القسمة على صفر
      if (km > 50 && speed > cfg.maxSpeedKmh) {
        await recordSecurityEvent({
          studentId, type: 'impossibleTravel', delta: -cfg.penalties.impossibleTravel,
          deviceId, ip, city: geo.city, country: geo.country,
          details: { km: Math.round(km), hours: Number(hoursSince.toFixed(2)), speed: Math.round(speed) },
        })
      }
    }

    // (هـ) تغيّر IP كثير خلال 24 ساعة
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const rows = await prisma.student_device_sessions.findMany({
      where: { student_id: studentId, started_at: { gte: since } },
      select: { ip: true },
    })
    const distinct = new Set(rows.map((r) => r.ip).filter(Boolean))
    if (distinct.size > cfg.ipChurnLimit) {
      await recordSecurityEvent({
        studentId, type: 'ipChurn', delta: -cfg.penalties.ipChurn,
        deviceId, ip, city: geo.city, country: geo.country,
        details: { distinctIps: distinct.size, limit: cfg.ipChurnLimit },
      })
    }

    // حدّث آخر موقع معروف
    await prisma.student_security_state.update({
      where: { student_id: studentId },
      data: {
        last_ip: ip, last_city: geo.city, last_country: geo.country,
        last_lat: geo.lat, last_lon: geo.lon, last_geo_at: new Date(),
        updated_at: new Date(),
      },
    })
  } catch (e) {
    logError('runGeoChecks', e)
  }
}

/** نبضة خفيفة: تحدّث last_seen_at للجلسة الحالية بس. بدون أي فحوصات. */
export async function touchDeviceSession(): Promise<void> {
  try {
    const sessionKey = await readSessionKey()
    if (!sessionKey) return
    await prisma.student_device_sessions.updateMany({
      where: { session_key: sessionKey, revoked_at: null },
      data: { last_seen_at: new Date() },
    })
  } catch (e) {
    logError('touchDeviceSession', e)
  }
}

/**
 * فحص خفيف للأكشنز الحسّاسة: بيرفض لو الطالب محظور أو جلسته ملغاة.
 * ممنوع يعمل استدعاءات خارجية ولا يكتب كوكيز — دالة قراءة بس.
 */
export async function assertDeviceAllowed(): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const cfg = await getDeviceSecurityConfig()
    if (!cfg.enabled) return { ok: true }

    const session = await auth()
    const user = session?.user as any
    if (!user?.id || user.role !== 'student') return { ok: true }

    const student = await prisma.students.findFirst({
      where: { user_id: user.id },
      select: { id: true },
    })
    if (!student) return { ok: true }

    const state = await prisma.student_security_state.findUnique({
      where: { student_id: student.id },
      select: { blocked: true },
    })
    if (state?.blocked) {
      return { ok: false, message: 'حسابك موقوف لأسباب أمنية. تواصل مع الدعم.' }
    }

    const sessionKey = await readSessionKey()
    if (!sessionKey) return { ok: true }   // fail-open: الجلسة لسه ماتسجّلتش

    const row = await prisma.student_device_sessions.findUnique({
      where: { session_key: sessionKey },
      select: { revoked_at: true, student_id: true },
    })
    if (row && row.student_id === student.id && row.revoked_at) {
      return { ok: false, message: 'تم إنهاء هذه الجلسة. سجّل دخول من جديد.' }
    }

    return { ok: true }
  } catch {
    return { ok: true }   // fail-open مقصود
  }
}
