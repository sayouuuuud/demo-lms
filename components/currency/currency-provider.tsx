'use client'

/**
 * components/currency/currency-provider.tsx
 *
 * سياق عملة العرض للطالب: كل المبالغ المخزّنة بالريال العُماني (OMR)،
 * والطالب يمكنه تبديل عملة العرض بين الريال العُماني والجنيه المصري (EGP).
 * التفضيل محفوظ في كوكي غير حساسة ولا يؤثر على أي قيمة مخزّنة.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  BASE_CURRENCY,
  CURRENCIES,
  CURRENCY_PREFERENCE_COOKIE,
  convertFromOMR,
  formatMoney,
  type CurrencyCode,
} from '@/lib/currency'

type CurrencyContextValue = {
  /** عملة العرض الحالية (OMR افتراضيًا). */
  currency: CurrencyCode
  /** يبدّل عملة العرض ويحفظ التفضيل. */
  setCurrency: (c: CurrencyCode) => void
  /** ينسّق مبلغًا مخزّنًا بالريال العُماني بعملة العرض الحالية. */
  format: (amountOMR: number) => string
  /** يحوّل مبلغًا مخزّنًا بالريال العُماني لعملة العرض (رقمًا). */
  convert: (amountOMR: number) => number
  /** رمز العملة المختصر الحالي (ر.ع / ج.م). */
  symbol: string
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

export function CurrencyProvider({
  children,
  initialCurrency = BASE_CURRENCY,
}: {
  children: ReactNode
  initialCurrency?: CurrencyCode
}) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(initialCurrency)

  const setCurrency = useCallback((c: CurrencyCode) => {
    setCurrencyState(c)
    const secure = window.location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `${CURRENCY_PREFERENCE_COOKIE}=${c}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`
  }, [])

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      setCurrency,
      format: (amountOMR: number) => formatMoney(amountOMR, currency),
      convert: (amountOMR: number) => convertFromOMR(amountOMR, currency),
      symbol: CURRENCIES[currency].short,
    }),
    [currency, setCurrency],
  )

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext)
  if (!ctx) {
    // مقدم الخدمة مثبّت في الـ root layout — هذا fallback دفاعي فقط.
    return {
      currency: BASE_CURRENCY,
      setCurrency: () => {},
      format: (amountOMR: number) => formatMoney(amountOMR, BASE_CURRENCY),
      convert: (amountOMR: number) => convertFromOMR(amountOMR, BASE_CURRENCY),
      symbol: CURRENCIES[BASE_CURRENCY].short,
    }
  }
  return ctx
}
