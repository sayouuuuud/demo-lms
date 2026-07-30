import 'server-only'
import { prisma } from '@/lib/prisma'
import { normalizeEgyptPhone } from '@/lib/phone'

type Template = 'login_otp' | 'payment_approved' | 'custom'

function config() {
  const baseUrl = (process.env.EVOLUTION_API_URL || '').replace(/\/+$/, '')
  const apiKey = process.env.EVOLUTION_API_KEY || ''
  const instance = process.env.EVOLUTION_INSTANCE || ''
  return { baseUrl, apiKey, instance, ready: !!(baseUrl && apiKey && instance) }
}

/** هل الواتساب متظبط في البيئة؟ (مش معناه إن الـ instance متصل) */
export function isWhatsAppConfigured(): boolean {
  return config().ready
}

/** يتأكد إن instance الـ Evolution متصل فعلًا. لا يرمي — يرجّع bool. */
export async function checkWhatsAppConnection(): Promise<{ ok: boolean; state: string }> {
  const { baseUrl, apiKey, instance, ready } = config()
  if (!ready) return { ok: false, state: 'not_configured' }
  try {
    const res = await fetch(`${baseUrl}/instance/connectionState/${encodeURIComponent(instance)}`, {
      method: 'GET',
      headers: { apikey: apiKey },
      cache: 'no-store',
    })
    if (!res.ok) return { ok: false, state: `http_${res.status}` }
    const json: any = await res.json().catch(() => ({}))
    const state = json?.instance?.state ?? json?.state ?? 'unknown'
    return { ok: state === 'open', state: String(state) }
  } catch {
    return { ok: false, state: 'network_error' }
  }
}

/**
 * يبعت رسالة نصية واتساب ويسجّلها في whatsapp_messages.
 * ما يرميش أبدًا — يرجّع { ok, error }.
 */
export async function sendWhatsAppText(input: {
  phone: string
  text: string
  template: Template
  studentId?: string | null
  /** لو true: ما نخزّنش نص الرسالة (للأكواد) */
  redactBody?: boolean
}): Promise<{ ok: boolean; error?: string }> {
  const e164 = normalizeEgyptPhone(input.phone)
  const { baseUrl, apiKey, instance, ready } = config()

  const logRow = await prisma.whatsapp_messages
    .create({
      data: {
        to_phone: e164 ?? String(input.phone),
        template: input.template,
        body: input.redactBody ? '[redacted]' : input.text.slice(0, 2000),
        status: 'queued',
        student_id: input.studentId ?? null,
      },
      select: { id: true },
    })
    .catch(() => null)

  const fail = async (error: string) => {
    if (logRow) {
      await prisma.whatsapp_messages
        .update({ where: { id: logRow.id }, data: { status: 'failed', error } })
        .catch(() => {})
    }
    return { ok: false, error }
  }

  if (!e164) return fail('invalid_phone')
  if (!ready) return fail('not_configured')

  try {
    const res = await fetch(`${baseUrl}/message/sendText/${encodeURIComponent(instance)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: apiKey },
      body: JSON.stringify({ number: e164, text: input.text }),
      cache: 'no-store',
    })
    const json: any = await res.json().catch(() => ({}))
    if (!res.ok) return fail(`http_${res.status}: ${JSON.stringify(json).slice(0, 300)}`)

    const providerId = json?.key?.id ?? json?.messageId ?? null
    if (logRow) {
      await prisma.whatsapp_messages
        .update({
          where: { id: logRow.id },
          data: { status: 'sent', sent_at: new Date(), provider_message_id: providerId },
        })
        .catch(() => {})
    }
    return { ok: true }
  } catch (e: any) {
    return fail(`network: ${String(e?.message ?? e).slice(0, 300)}`)
  }
}

/** نص رسالة قبول الدفع. */
export function paymentApprovedText(input: {
  studentName: string
  orderCode: string
  total: number
  items: string[]
}) {
  const lines = [
    'منصة عبد السلام للرياضيات',
    '',
    `أهلاً ${input.studentName || 'يا بطل'} 👋`,
    `تم تأكيد دفع طلبك رقم ${input.orderCode} بمبلغ ${input.total} ج.م.`,
  ]
  if (input.items.length) {
    lines.push('', 'المحتوى المتاح لك الآن:', ...input.items.map((t) => `• ${t}`))
  }
  lines.push('', 'يلا ابدأ من صفحة كورساتي على المنصة. بالتوفيق!')
  return lines.join('\n')
}
