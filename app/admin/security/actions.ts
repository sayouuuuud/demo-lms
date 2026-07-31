'use server'

import { prisma } from '@/lib/prisma'
import { hasResourceAccess } from '@/lib/auth-guard'
import { logActivity } from '@/lib/audit-log'
import { createNotification } from '@/lib/notify'
import { logError } from '@/lib/logger'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import {
  applyBlock,
  liftBlock,
  recordSecurityEvent,
  applyDailyRecovery,
} from '@/lib/security-score'
import { getGeoConfig } from '@/lib/device-settings'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeAr(date: Date | null | undefined): string {
  if (!date) return 'غير معروف'
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `قبل ${mins} دقيقة`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `قبل ${hrs} ساعة`
  const days = Math.floor(hrs / 24)
  return `قبل ${days} يوم`
}

async function actorId(): Promise<string | null> {
  const session = await auth()
  return (session?.user as any)?.id ?? null
}

// ---------------------------------------------------------------------------
// Read actions (view)
// ---------------------------------------------------------------------------

export async function getSecurityOverview() {
  if (!(await hasResourceAccess('security', 'view'))) {
    return { error: 'غير مسموح.' }
  }
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const geoCfg = await getGeoConfig()

    const [
      totalDevices,
      blockedStudents,
      atRiskStudents,
      eventsToday,
      pendingRequests,
      avgScoreAgg,
      geoCallsLast30Days,
    ] = await Promise.all([
      prisma.student_trusted_devices.count({ where: { status: 'active' } }),
      prisma.student_security_state.count({ where: { blocked: true } }),
      prisma.student_security_state.count({ where: { blocked: false, score: { lt: 55 } } }),
      prisma.student_security_events.count({ where: { created_at: { gte: todayStart } } }),
      prisma.device_removal_requests.count({ where: { status: 'pending' } }),
      prisma.student_security_state.aggregate({ _avg: { score: true } }),
      prisma.ip_geo_cache.count({ where: { fetched_at: { gte: thirtyDaysAgo } } }),
    ])

    return {
      totalDevices,
      blockedStudents,
      atRiskStudents,
      eventsToday,
      pendingRequests,
      avgScore: Math.round(avgScoreAgg._avg.score ?? 100),
      geoEnabled: geoCfg.enabled,
      geoCallsLast30Days,
    }
  } catch (e) {
    logError('getSecurityOverview', e)
    return { error: 'تعذّر تحميل الإحصائيات.' }
  }
}

export async function listStudentSecurity(params: {
  search?: string
  filter?: 'all' | 'blocked' | 'atRisk'
  page?: number
  pageSize?: number
}) {
  if (!(await hasResourceAccess('security', 'view'))) {
    return { error: 'غير مسموح.' }
  }
  try {
    const page = Math.max(1, params.page ?? 1)
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20))
    const skip = (page - 1) * pageSize

    const scoreWhere =
      params.filter === 'blocked'
        ? { blocked: true }
        : params.filter === 'atRisk'
        ? { blocked: false, score: { lt: 55 } }
        : {}

    const studentWhere = params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' as const } },
            { code: { contains: params.search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    const [rows, total] = await Promise.all([
      prisma.student_security_state.findMany({
        where: {
          ...scoreWhere,
          students: studentWhere,
        },
        include: {
          students: {
            select: {
              name: true,
              code: true,
              status: true,
              stages: { select: { title: true } },
            },
          },
        },
        orderBy: { updated_at: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.student_security_state.count({
        where: {
          ...scoreWhere,
          students: studentWhere,
        },
      }),
    ])

    const deviceCounts = await Promise.all(
      rows.map((r) =>
        prisma.student_trusted_devices.count({
          where: { student_id: r.student_id, status: 'active' },
        })
      )
    )

    const lastEvents = await Promise.all(
      rows.map((r) =>
        prisma.student_security_events.findFirst({
          where: { student_id: r.student_id },
          orderBy: { created_at: 'desc' },
          select: { event_type: true, created_at: true },
        })
      )
    )

    const EVENT_LABELS: Record<string, string> = {
      newDevice: 'جهاز جديد',
      deviceLimit: 'تجاوز حد الأجهزة',
      concurrent: 'دخول متزامن',
      cityChange: 'تغيّر مدينة',
      countryChange: 'تغيّر دولة',
      impossibleTravel: 'انتقال غير منطقي',
      proxy: 'بروكسي / VPN',
      ipChurn: 'تغيّر IPs كثير',
      adminAdjust: 'تعديل إداري',
      adminUnblock: 'فك حظر',
      adminRemoveDevice: 'إزالة جهاز',
      autoBlock: 'حظر تلقائي',
      recovery: 'تعافي',
    }

    return {
      rows: rows.map((r, i) => ({
        studentId: r.student_id,
        name: r.students.name,
        code: r.students.code,
        stageTitle: r.students.stages?.title ?? '',
        score: r.score,
        blocked: r.blocked,
        blockedReason: r.blocked_reason,
        deviceCount: deviceCounts[i],
        lastCity: r.last_city,
        lastCountry: r.last_country,
        lastEventLabel: lastEvents[i]
          ? (EVENT_LABELS[lastEvents[i]!.event_type] ?? lastEvents[i]!.event_type)
          : '',
        lastEventAt: lastEvents[i]?.created_at ?? null,
      })),
      total,
    }
  } catch (e) {
    logError('listStudentSecurity', e)
    return { error: 'تعذّر تحميل البيانات.' }
  }
}

export async function listSecurityEvents(params: {
  studentId?: string
  type?: string
  severity?: string
  page?: number
  pageSize?: number
}) {
  if (!(await hasResourceAccess('security', 'view'))) {
    return { error: 'غير مسموح.' }
  }
  try {
    const page = Math.max(1, params.page ?? 1)
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 30))
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}
    if (params.studentId) where.student_id = params.studentId
    if (params.type) where.event_type = params.type
    if (params.severity) where.severity = params.severity

    const [rows, total] = await Promise.all([
      prisma.student_security_events.findMany({
        where,
        include: {
          students: { select: { name: true, code: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.student_security_events.count({ where }),
    ])

    return { rows, total }
  } catch (e) {
    logError('listSecurityEvents', e)
    return { error: 'تعذّر تحميل الأحداث.' }
  }
}

export async function listDeviceRemovalRequests(status = 'pending') {
  if (!(await hasResourceAccess('security', 'view'))) {
    return { error: 'غير مسموح.' }
  }
  try {
    const rows = await prisma.device_removal_requests.findMany({
      where: { status },
      include: {
        students: { select: { name: true, code: true } },
        device: { select: { label: true, browser: true, os: true } },
      },
      orderBy: { created_at: 'desc' },
    })
    return { rows }
  } catch (e) {
    logError('listDeviceRemovalRequests', e)
    return { error: 'تعذّر تحميل الطلبات.' }
  }
}

export async function getStudentSecurityDetail(studentId: string) {
  if (!(await hasResourceAccess('security', 'view'))) {
    return { error: 'غير مسموح.' }
  }
  try {
    const [state, devices, sessions, events] = await Promise.all([
      prisma.student_security_state.findUnique({ where: { student_id: studentId } }),
      prisma.student_trusted_devices.findMany({
        where: { student_id: studentId },
        orderBy: { last_active_at: 'desc' },
      }),
      prisma.student_device_sessions.findMany({
        where: { student_id: studentId },
        include: { device: { select: { label: true } } },
        orderBy: { started_at: 'desc' },
        take: 20,
      }),
      prisma.student_security_events.findMany({
        where: { student_id: studentId },
        orderBy: { created_at: 'desc' },
        take: 50,
      }),
    ])
    return { state, devices, sessions, events }
  } catch (e) {
    logError('getStudentSecurityDetail', e)
    return { error: 'تعذّر تحميل التفاصيل.' }
  }
}

// ---------------------------------------------------------------------------
// Mutate actions (manage)
// ---------------------------------------------------------------------------

export async function adminRemoveDevice(
  deviceId: string,
  note: string,
): Promise<{ success?: true; error?: string }> {
  if (!(await hasResourceAccess('security', 'manage'))) {
    return { error: 'غير مسموح.' }
  }
  try {
    const actor = await actorId()
    const device = await prisma.student_trusted_devices.findUnique({
      where: { id: deviceId },
      select: { student_id: true, label: true },
    })
    if (!device) return { error: 'الجهاز غير موجود.' }

    await prisma.student_trusted_devices.update({
      where: { id: deviceId },
      data: {
        status: 'removed',
        removed_at: new Date(),
        removed_by: actor ?? undefined,
      },
    })

    await prisma.student_device_sessions.updateMany({
      where: { device_id: deviceId, revoked_at: null },
      data: { revoked_at: new Date(), revoked_reason: 'device removed' },
    })

    await recordSecurityEvent({
      studentId: device.student_id,
      type: 'adminRemoveDevice',
      delta: 0,
      skipAutoBlock: true,
      actorId: actor,
      deviceId,
      details: { label: device.label, note },
    })

    createNotification({
      type: 'نظام',
      title: 'تمت إزالة جهاز من أجهزتك',
      description: 'تقدر تسجّل دخول من جهاز جديد.',
      studentId: device.student_id,
    }).catch(() => {})

    logActivity({
      action: 'delete',
      resource: 'security',
      targetId: deviceId,
      targetLabel: `إزالة جهاز: ${device.label}`,
      details: note || undefined,
    }).catch(() => {})
    revalidatePath('/admin/security')
    return { success: true }
  } catch (e) {
    logError('adminRemoveDevice', e)
    return { error: 'تعذّر إزالة الجهاز.' }
  }
}

export async function adminSetScore(
  studentId: string,
  score: number,
  note: string,
): Promise<{ success?: true; error?: string }> {
  if (!(await hasResourceAccess('security', 'manage'))) {
    return { error: 'غير مسموح.' }
  }
  const rounded = Math.round(score)
  if (rounded < 0 || rounded > 100) {
    return { error: 'السكور لازم يكون بين 0 و100.' }
  }
  try {
    const actor = await actorId()

    await prisma.student_security_state.upsert({
      where: { student_id: studentId },
      update: { score: rounded, updated_at: new Date() },
      create: { student_id: studentId, score: rounded },
    })

    await recordSecurityEvent({
      studentId,
      type: 'adminAdjust',
      delta: 0,
      skipAutoBlock: true,
      actorId: actor,
      details: { newScore: rounded, note },
    })

    logActivity({
      action: 'update',
      resource: 'security',
      targetId: studentId,
      targetLabel: `تعديل السكور إلى ${rounded}`,
      details: note || undefined,
    }).catch(() => {})
    revalidatePath('/admin/security')
    return { success: true }
  } catch (e) {
    logError('adminSetScore', e)
    return { error: 'تعذّر تعديل السكور.' }
  }
}

export async function adminUnblock(
  studentId: string,
  restoreScore = 100,
): Promise<{ success?: true; error?: string }> {
  if (!(await hasResourceAccess('security', 'manage'))) {
    return { error: 'غير مسموح.' }
  }
  try {
    const actor = await actorId()
    await liftBlock(studentId, restoreScore, actor)
    logActivity({
      action: 'update',
      resource: 'security',
      targetId: studentId,
      targetLabel: `فك حظر — سكور: ${restoreScore}`,
    }).catch(() => {})
    revalidatePath('/admin/security')
    return { success: true }
  } catch (e) {
    logError('adminUnblock', e)
    return { error: 'تعذّر فك الحظر.' }
  }
}

export async function adminBlock(
  studentId: string,
  reason: string,
): Promise<{ success?: true; error?: string }> {
  if (!(await hasResourceAccess('security', 'manage'))) {
    return { error: 'غير مسموح.' }
  }
  if (!reason || reason.trim().length < 3) {
    return { error: 'اكتب سبب الحظر.' }
  }
  try {
    await prisma.student_security_state.upsert({
      where: { student_id: studentId },
      update: {
        blocked: true,
        blocked_at: new Date(),
        blocked_reason: reason.trim(),
        updated_at: new Date(),
      },
      create: {
        student_id: studentId,
        blocked: true,
        blocked_at: new Date(),
        blocked_reason: reason.trim(),
      },
    })
    await applyBlock(studentId, reason.trim())

    const actor = await actorId()
    logActivity({
      action: 'update',
      resource: 'security',
      targetId: studentId,
      targetLabel: `حظر يدوي: ${reason.trim()}`,
    }).catch(() => {})
    revalidatePath('/admin/security')
    return { success: true }
  } catch (e) {
    logError('adminBlock', e)
    return { error: 'تعذّر تنفيذ الحظر.' }
  }
}

export async function adminRevokeAllSessions(
  studentId: string,
): Promise<{ success?: true; error?: string }> {
  if (!(await hasResourceAccess('security', 'manage'))) {
    return { error: 'غير مسموح.' }
  }
  try {
    await prisma.student_device_sessions.updateMany({
      where: { student_id: studentId, revoked_at: null },
      data: { revoked_at: new Date(), revoked_reason: 'admin revoke' },
    })

    createNotification({
      type: 'نظام',
      title: 'تم إنهاء كل جلساتك النشِطة',
      description: 'تم إنهاء جلساتك بواسطة الإدارة. سجّل دخول مجدداً.',
      studentId,
    }).catch(() => {})

    logActivity({
      action: 'delete',
      resource: 'security',
      targetId: studentId,
      targetLabel: 'إنهاء كل الجلسات',
    }).catch(() => {})
    revalidatePath('/admin/security')
    return { success: true }
  } catch (e) {
    logError('adminRevokeAllSessions', e)
    return { error: 'تعذّر إنهاء الجلسات.' }
  }
}

export async function handleRemovalRequest(
  requestId: string,
  action: 'approve' | 'reject',
  note: string,
): Promise<{ success?: true; error?: string }> {
  if (!(await hasResourceAccess('security', 'manage'))) {
    return { error: 'غير مسموح.' }
  }
  try {
    const request = await prisma.device_removal_requests.findUnique({
      where: { id: requestId },
      select: { status: true, device_id: true, student_id: true },
    })
    if (!request) return { error: 'الطلب غير موجود.' }
    if (request.status !== 'pending') return { error: 'الطلب اتعامل معاه بالفعل.' }

    const actor = await actorId()

    if (action === 'approve') {
      const res = await adminRemoveDevice(request.device_id, note)
      if (res.error) return res
      await prisma.device_removal_requests.update({
        where: { id: requestId },
        data: {
          status: 'approved',
          admin_note: note,
          handled_by: actor ?? undefined,
          handled_at: new Date(),
        },
      })
    } else {
      await prisma.device_removal_requests.update({
        where: { id: requestId },
        data: {
          status: 'rejected',
          admin_note: note,
          handled_by: actor ?? undefined,
          handled_at: new Date(),
        },
      })
      createNotification({
        type: 'نظام',
        title: 'تم رفض طلب إزالة الجهاز',
        description: note ? `السبب: ${note}` : 'راجع الدعم لمزيد من التفاصيل.',
        studentId: request.student_id,
      }).catch(() => {})
    }

    logActivity({
      action: 'update',
      resource: 'security',
      targetId: requestId,
      targetLabel: action === 'approve' ? 'موافقة على طلب إزالة جهاز' : 'رفض طلب إزالة جهاز',
      details: note || undefined,
    }).catch(() => {})
    revalidatePath('/admin/security')
    return { success: true }
  } catch (e) {
    logError('handleRemovalRequest', e)
    return { error: 'تعذّر معالجة الطلب.' }
  }
}

export async function recalcSecurityScores(): Promise<{
  processed?: number
  error?: string
}> {
  if (!(await hasResourceAccess('security', 'manage'))) {
    return { error: 'غير مسموح.' }
  }
  try {
    // Clean up stale sessions first
    await prisma.student_device_sessions.updateMany({
      where: {
        revoked_at: null,
        last_seen_at: { lt: new Date(Date.now() - 12 * 60 * 60 * 1000) },
      },
      data: { revoked_at: new Date(), revoked_reason: 'stale' },
    })

    const states = await prisma.student_security_state.findMany({
      orderBy: { updated_at: 'asc' },
      take: 500,
      select: { student_id: true },
    })

    for (const s of states) {
      await applyDailyRecovery(s.student_id)
    }

    logActivity({
      action: 'update',
      resource: 'security',
      targetLabel: `إعادة حساب السكورات — ${states.length} طالب`,
    }).catch(() => {})
    revalidatePath('/admin/security')
    return { processed: states.length }
  } catch (e) {
    logError('recalcSecurityScores', e)
    return { error: 'تعذّر إعادة الحساب.' }
  }
}
