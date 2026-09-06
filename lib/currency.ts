/**
 * lib/currency.ts — نظام العملة المركزي للمنصة.
 *
 * الريال العُماني (OMR) هو العملة الأساسية والرسمية: كل الأسعار والمبالغ
 * تُحفظ في قاعدة البيانات بالريال العُماني. الجنيه المصري (EGP) متاح
 * كعملة عرض فقط للطلاب — التحويل يتم في وقت العرض ولا يغيّر القيم المخزّنة.
 *
 * الملف آمن للاستيراد من الكلاينت والسيرفر (بدون أي اعتماديات على node).
 */

export type CurrencyCode = 'OMR' | 'EGP'

/** العملة الأساسية للنظام — كل المبالغ المخزّنة بها. */
export const BASE_CURRENCY: CurrencyCode = 'OMR'

/**
 * سعر تحويل 1 ريال عُماني إلى جنيه مصري.
 * يمكن ضبطه من متغير البيئة NEXT_PUBLIC_OMR_TO_EGP_RATE دون تعديل الكود.
 */
export const OMR_TO_EGP_RATE = Number(process.env.NEXT_PUBLIC_OMR_TO_EGP_RATE) > 0
  ? Number(process.env.NEXT_PUBLIC_OMR_TO_EGP_RATE)
  : 130

export const CURRENCIES: Record<
  CurrencyCode,
  { code: CurrencyCode; label: string; short: string; decimals: number }
> = {
  OMR: { code: 'OMR', label: 'ريال عُماني', short: 'ر.ع', decimals: 3 },
  EGP: { code: 'EGP', label: 'جنيه مصري', short: 'ج.م', decimals: 0 },
}

export const CURRENCY_OPTIONS: CurrencyCode[] = ['OMR', 'EGP']

/** يحوّل مبلغًا مخزّنًا بالريال العُماني إلى العملة المطلوبة للعرض. */
export function convertFromOMR(amountOMR: number, to: CurrencyCode): number {
  if (!Number.isFinite(amountOMR)) return 0
  if (to === 'OMR') return amountOMR
  return amountOMR * OMR_TO_EGP_RATE
}

function formatNumber(value: number, decimals: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })
}

/**
 * ينسّق مبلغًا مخزّنًا بالريال العُماني في العملة المطلوبة مع رمزها المختصر.
 * مثال: formatMoney(12.5, 'OMR') → "12.500 ر.ع" | formatMoney(12.5, 'EGP') → "1,625 ج.م"
 */
export function formatMoney(amountOMR: number, currency: CurrencyCode = BASE_CURRENCY): string {
  const meta = CURRENCIES[currency] ?? CURRENCIES.OMR
  const converted = convertFromOMR(amountOMR, currency)
  return `${formatNumber(converted, meta.decimals)} ${meta.short}`
}

/** نسّق بالعملة الأساسية (OMR) — للاستخدام في لوحة الأدمن والسيرفر. */
export function formatOMR(amountOMR: number): string {
  return formatMoney(amountOMR, 'OMR')
}

/** رمز العملة المختصر (ر.ع / ج.م) — مفصولًا عن الرقم لعناصر الواجهة. */
export function currencyShort(currency: CurrencyCode): string {
  return (CURRENCIES[currency] ?? CURRENCIES.OMR).short
}

/** يتحقق أن النص عملة صالحة (لقراءة التفضيل المحفوظ). */
export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return value === 'OMR' || value === 'EGP'
}
