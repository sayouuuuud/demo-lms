// Shared helpers for building real, rolling monthly time-series used by the
// dashboard and reports charts. Buckets are keyed by `YYYY-MM` so payments and
// signups land in the correct calendar month instead of a hardcoded Jan–Jun.
//
// كل التقسيم الزمني مثبّت على توقيت القاهرة عشان الداتابيز بتخزن بـUTC
// والسيرفر ممكن يشتغل بأي توقيت. لازم أي SQL يقسّم بالتاريخ يستخدم
// `AT TIME ZONE APP_TIME_ZONE` عشان يطابق المفاتيح اللي بتتولد هنا.

export const APP_TIME_ZONE = 'Africa/Cairo'

export const AR_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
]

export const AR_DAYS = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
]

export type MonthBucket = { key: string; month: string; start: Date }
export type DayBucket = { key: string; day: string; start: Date }

// Shared options for the chart time-range dropdowns. Values are month counts
// the chart slices from a 12-month series.
export const RANGE_OPTIONS = [
  { label: 'آخر 3 أشهر', value: '3' },
  { label: 'آخر 6 أشهر', value: '6' },
  { label: 'آخر 12 شهر', value: '12' },
]

export const DAILY_RANGE_OPTIONS = [
  { label: 'آخر 7 أيام', value: '7' },
  { label: 'آخر 14 يوم', value: '14' },
  { label: 'آخر 30 يوم', value: '30' },
]

const pad = (n: number) => String(n).padStart(2, '0')

// en-CA يطلّع الصيغة YYYY-MM-DD فبنقدر نقسّمها مباشرة.
const zonedDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** يرجّع اليوم/الشهر/السنة لأي لحظة بتوقيت القاهرة. */
export function zonedParts(date: Date): { year: number; month: number; day: number } {
  const [year, month, day] = zonedDateFormatter.format(date).split('-').map(Number)
  return { year, month, day }
}

/** إزاحة توقيت القاهرة بالدقائق عند لحظة معينة (بتراعي التوقيت الصيفي). */
function zoneOffsetMinutes(at: Date): number {
  const name =
    new Intl.DateTimeFormat('en-US', {
      timeZone: APP_TIME_ZONE,
      timeZoneName: 'longOffset',
    })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+00:00'

  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name)
  if (!match) return 0
  const sign = match[1] === '-' ? -1 : 1
  return sign * (Number(match[2]) * 60 + Number(match[3]))
}

/**
 * اللحظة الحقيقية (UTC instant) اللي توافق 00:00 بتوقيت القاهرة ليوم معيّن.
 * دي اللي بتتبعت لـSQL كحد أدنى للفترة عشان الحدود تطابق التقسيم بالظبط.
 */
function zonedMidnight(year: number, month: number, day: number): Date {
  const guess = Date.UTC(year, month - 1, day)
  const offset = zoneOffsetMinutes(new Date(guess))
  return new Date(guess - offset * 60000)
}

/** مفتاح `YYYY-MM-DD` بتوقيت القاهرة. */
export function dayKeyOf(iso: string | Date): string {
  const { year, month, day } = zonedParts(new Date(iso))
  return `${year}-${pad(month)}-${pad(day)}`
}

/** مفتاح `YYYY-MM` بتوقيت القاهرة. */
export function monthKeyOf(iso: string | Date): string {
  const { year, month } = zonedParts(new Date(iso))
  return `${year}-${pad(month)}`
}

/** آخر `count` يوم (الأقدم → الأحدث)، آخرهم النهاردة بتوقيت القاهرة. */
export function lastDays(count: number): DayBucket[] {
  const today = zonedParts(new Date())
  const arr: DayBucket[] = []
  for (let i = count - 1; i >= 0; i--) {
    // Date.UTC بيتعامل مع الأرقام السالبة صح فبنعتمد عليه في طرح الأيام.
    const marker = new Date(Date.UTC(today.year, today.month - 1, today.day - i))
    const year = marker.getUTCFullYear()
    const month = marker.getUTCMonth() + 1
    const day = marker.getUTCDate()
    arr.push({
      key: `${year}-${pad(month)}-${pad(day)}`,
      day: `${day} ${AR_MONTHS[month - 1]}`,
      start: zonedMidnight(year, month, day),
    })
  }
  return arr
}

/** آخر `count` شهر (الأقدم → الأحدث)، آخرهم الشهر الحالي بتوقيت القاهرة. */
export function lastMonths(count: number): MonthBucket[] {
  const today = zonedParts(new Date())
  const arr: MonthBucket[] = []
  for (let i = count - 1; i >= 0; i--) {
    const marker = new Date(Date.UTC(today.year, today.month - 1 - i, 1))
    const year = marker.getUTCFullYear()
    const month = marker.getUTCMonth() + 1
    arr.push({
      key: `${year}-${pad(month)}`,
      month: AR_MONTHS[month - 1],
      start: zonedMidnight(year, month, 1),
    })
  }
  return arr
}

export function getRangeStartDate(range: string): Date {
  const { year, month, day } = zonedParts(new Date())
  switch (range) {
    case '7d':
      return zonedMidnight(year, month, day - 7)
    case '30d':
      return zonedMidnight(year, month, day - 30)
    case '3m':
      return zonedMidnight(year, month - 3, day)
    case '6m':
      return zonedMidnight(year, month - 6, day)
    case '12m':
      return zonedMidnight(year, month - 12, day)
    case 'all':
    default:
      return new Date(Date.UTC(2000, 0, 1))
  }
}

// Period-over-period percentage change, rounded to 1 decimal. Returns 0 when the
// previous value is 0 and there's no current value, and 100 when growing from 0.
export function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 1000) / 10
}
