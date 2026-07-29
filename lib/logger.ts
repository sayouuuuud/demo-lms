/**
 * تسجيل موحّد. في التطوير يظهر في الطرفية، وفي الإنتاج يُرسل للـ stderr فقط
 * دون تسريب بنية البيانات في اللوجز العامة.
 */
const isDev = process.env.NODE_ENV !== 'production'

export function logError(scope: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[${scope}] ${message}`)
}

export function logDebug(scope: string, payload?: unknown): void {
  if (!isDev) return
  console.log(`[${scope}]`, payload ?? '')
}
