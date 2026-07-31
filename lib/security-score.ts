import 'server-only'
import { prisma } from '@/lib/prisma'
import { logError } from '@/lib/logger'
import { createNotification } from '@/lib/notify'
import { getDeviceSecurityConfig } from '@/lib/device-settings'
import { sendWhatsAppText } from '@/lib/whatsapp'
import { getGlobalSettings } from '@/lib/settings-data'

export type SecurityEventType =
  | 'newDevice' | 'deviceLimit' | 'concurrent' | 'cityChange' | 'countryChange'
  | 'impossibleTravel' | 'proxy' | 'ipChurn'
  | 'adminAdjust' | 'adminUnblock' | 'adminRemoveDevice' | 'autoBlock' | 'recovery'

export type SecurityState = {
  studentId: string
  score: number
  blocked: boolean
  blockedReason: string
}

const SEVERITY: Record<string, 'info' | 'warn' | 'critical'> = {
  newDevice: 'info',
  recovery: 'info',
  adminAdjust: 'info',
  adminUnblock: 'info',
  adminRemoveDevice: 'info',
  deviceLimit: 'warn',
  cityChange: 'warn',
  proxy: 'warn',
  ipChurn: 'warn',
  concurrent: 'critical',
  countryChange: 'critical',
  impossibleTravel: 'critical',
  autoBlock: 'critical',
}

/** يجيب أو يعمل صف الحالة للطالب. */
export async function ensureSecurityState(studentId: string) {
  return prisma.student_security_state.upsert({
    where: { student_id: studentId },
    update: {},
    create: { student_id: studentId },
  })
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

/**
 * يسجّل حدث أمني ويعدّل السكور. الدالة الوحيدة المسموح لها تكتب في السكور.
 * @param delta سالب = خصم، موجب = إضافة، 0 = تسجيل بس.
 */
export async function recordSecurityEvent(input: {
  studentId: string
  type: SecurityEventType
  delta: number
  deviceId?: string | null
  ip?: string
  city?: string
  country?: string
  details?: Record<string, unknown>
  actorId?: string | null
  /** لو true، متعملش حظر تلقائي (للأحداث الإدارية) */
  skipAutoBlock?: boolean
}): Promise<SecurityState> {
  const cfg = await getDeviceSecurityConfig()
  const state = await ensureSecurityState(input.studentId)

  const nextScore = clamp(state.score + input.delta)
  const shouldBlock =
    !input.skipAutoBlock &&
    cfg.autoBlock &&
    !state.blocked &&
    nextScore <= cfg.blockThreshold

  const updated = await prisma.student_security_state.update({
    where: { student_id: input.studentId },
    data: {
      score: nextScore,
      last_event_at: new Date(),
      updated_at: new Date(),
      ...(input.ip ? { last_ip: input.ip } : {}),
      ...(input.city ? { last_city: input.city } : {}),
      ...(input.country ? { last_country: input.country } : {}),
      ...(shouldBlock
        ? {
            blocked: true,
            blocked_at: new Date(),
            blocked_reason: `حظر تلقائي: السكور الأمني وصل ${nextScore}`,
          }
        : {}),
    },
  })

  await prisma.student_security_events.create({
    data: {
      student_id: input.studentId,
      device_id: input.deviceId ?? null,
      event_type: input.type,
      severity: SEVERITY[input.type] ?? 'info',
      score_delta: input.delta,
      score_after: nextScore,
      ip: input.ip ?? '',
      city: input.city ?? '',
      country: input.country ?? '',
      details: (input.details ?? {}) as any,
      actor_id: input.actorId ?? null,
    },
  }).catch((e) => logError('recordSecurityEvent.event', e))

  // إشعار واتساب للأحداث الخطيرة (fire-and-forget)
  if (SEVERITY[input.type] === 'critical') {
    ;(async () => {
      try {
        const globalSettings = await getGlobalSettings()
        if ((globalSettings.security as any)?.devices?.notifyWhatsApp !== true) return
        const student = await prisma.students.findUnique({
          where: { id: input.studentId },
          select: { phone: true, name: true },
        })
        if (!student?.phone) return
        const label = EVENT_LABELS[input.type] ?? input.type
        await sendWhatsAppText({
          phone: student.phone,
          text: `تنبيه أمني: تم رصد محاولة دخول مريبة لحسابك (${label}). لو مش إنت، غيّر كلمة السر فورًا وكلّم الدعم.`,
          template: 'custom',
          studentId: input.studentId,
        })
      } catch {
        // fire-and-forget — ما نوقفش التقييم
      }
    })().catch(() => {})
  }

  if (shouldBlock) {
    await applyBlock(input.studentId, `السكور الأمني وصل ${nextScore}`)
  }

  return {
    studentId: input.studentId,
    score: updated.score,
    blocked: updated.blocked,
    blockedReason: updated.blocked_reason,
  }
}

/** الحظر الفعلي: students.status = 'موقوف' + إبطال كل الجلسات + إشعار. */
export async function applyBlock(studentId: string, reason: string): Promise<void> {
  try {
    await prisma.students.update({
      where: { id: studentId },
      data: { status: 'موقوف' },
    })

    await prisma.student_device_sessions.updateMany({
      where: { student_id: studentId, revoked_at: null },
      data: { revoked_at: new Date(), revoked_reason: 'blocked' },
    })

    await prisma.student_security_events.create({
      data: {
        student_id: studentId,
        event_type: 'autoBlock',
        severity: 'critical',
        score_delta: 0,
        score_after: 0,
        details: { reason } as any,
      },
    }).catch(() => {})

    createNotification({
      type: 'نظام',
      title: 'تم إيقاف حسابك مؤقتًا',
      description: `${reason}. تواصل مع الدعم لمراجعة الحساب.`,
      studentId,
    }).catch(() => {})
  } catch (e) {
    logError('applyBlock', e)
  }
}

/** فك الحظر (أدمن). بيرجّع السكور لقيمة محدّدة. */
export async function liftBlock(
  studentId: string,
  newScore: number,
  actorId: string | null,
): Promise<void> {
  await prisma.student_security_state.upsert({
    where: { student_id: studentId },
    update: {
      score: clamp(newScore),
      blocked: false,
      blocked_at: null,
      blocked_reason: '',
      updated_at: new Date(),
    },
    create: { student_id: studentId, score: clamp(newScore) },
  })

  await prisma.students.update({
    where: { id: studentId },
    data: { status: 'نشط' },
  })

  await prisma.student_security_events.create({
    data: {
      student_id: studentId,
      event_type: 'adminUnblock',
      severity: 'info',
      score_delta: 0,
      score_after: clamp(newScore),
      actor_id: actorId,
      details: { newScore: clamp(newScore) } as any,
    },
  }).catch(() => {})

  createNotification({
    type: 'نظام',
    title: 'تم إعادة تفعيل حسابك',
    description: 'الإدارة راجعت الحساب وفكّت الإيقاف. خلّي بالك من مشاركة الحساب.',
    studentId,
  }).catch(() => {})
}

/**
 * تعافي تدريجي: نقطة لكل يوم نظيف.
 * بينداها evaluateDeviceSession قبل أي تقييم — رخيصة (قراءة صف واحد).
 */
export async function applyDailyRecovery(studentId: string): Promise<void> {
  const cfg = await getDeviceSecurityConfig()
  if (cfg.dailyRecovery <= 0) return

  const state = await ensureSecurityState(studentId)
  if (state.blocked) return          // المحظور ما يتعافى تلقائيًا
  if (state.score >= 100) return

  const base = state.last_recovery_at ?? state.updated_at
  const days = Math.floor((Date.now() - base.getTime()) / (24 * 60 * 60 * 1000))
  if (days < 1) return

  const gain = Math.min(days * cfg.dailyRecovery, 100 - state.score)
  if (gain <= 0) return

  await prisma.student_security_state.update({
    where: { student_id: studentId },
    data: {
      score: clamp(state.score + gain),
      last_recovery_at: new Date(),
      updated_at: new Date(),
    },
  })

  await prisma.student_security_events.create({
    data: {
      student_id: studentId,
      event_type: 'recovery',
      severity: 'info',
      score_delta: gain,
      score_after: clamp(state.score + gain),
      details: { days } as any,
    },
  }).catch(() => {})
}

/** تسمية عربية لمستوى الأمان. */
export function scoreLabel(score: number): { label: string; tone: 'success' | 'warning' | 'danger' } {
  if (score >= 80) return { label: 'آمن', tone: 'success' }
  if (score >= 55) return { label: 'مراقَب', tone: 'warning' }
  return { label: 'خطر', tone: 'danger' }
}

/** نص عربي لكل نوع حدث — استخدمه في كل الواجهات. */
export const EVENT_LABELS: Record<SecurityEventType, string> = {
  newDevice: 'جهاز جديد',
  deviceLimit: 'تجاوز حد الأجهزة',
  concurrent: 'دخول متزامن من جهاز آخر',
  cityChange: 'تغيّر مدينة سريع',
  countryChange: 'تغيّر دولة',
  impossibleTravel: 'انتقال غير منطقي',
  proxy: 'استخدام بروكسي / VPN',
  ipChurn: 'تغيّر عناوين IP كثير',
  adminAdjust: 'تعديل إداري للسكور',
  adminUnblock: 'فك حظر إداري',
  adminRemoveDevice: 'إزالة جهاز بواسطة الإدارة',
  autoBlock: 'حظر تلقائي',
  recovery: 'تعافي تدريجي',
}
