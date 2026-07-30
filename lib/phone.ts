/** يحوّل رقم مصري لصيغة E.164 بدون + (مثال: 01012345678 -> 201012345678). */
export function normalizeEgyptPhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  let d = String(raw).replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('20')) {
    // 20 + 10 digits (1xxxxxxxxx)
    if (d.length === 12 && d[2] === '1') return d
    return null
  }
  if (d.startsWith('01') && d.length === 11) return `20${d.slice(1)}`
  if (d.startsWith('1') && d.length === 10) return `20${d}`
  return null
}

/** يخفي وسط الرقم للعرض: 201012345678 -> +2010••••5678 */
export function maskPhone(e164: string): string {
  if (e164.length < 6) return '••••'
  return `+${e164.slice(0, 4)}••••${e164.slice(-4)}`
}

/** يخفي الإيميل للعرض: ahmed@gmail.com -> a•••d@gmail.com */
export function maskEmail(email: string): string {
  const [user, domain] = email.split('@')
  if (!domain) return '••••'
  if (user.length <= 2) return `${user[0] ?? '•'}•••@${domain}`
  return `${user[0]}•••${user[user.length - 1]}@${domain}`
}
