'use client'

/**
 * components/currency/currency-provider.tsx
 *
 * سياق عملة العرض للطالب: كل المبالغ المخزّنة بالريال العُماني (OMR)،
 * والطالب يمكنه تبديل عملة العرض بين الريال العُماني والجنيه المصري (EGP).
 * التفضيل محفوظ محليًا في المتصفح ولا يؤثر على أي قيمة مخزّنة.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  BASE_CURRENCY,
  CURRENCIES,
  CURRENCY_OPTIONS,
  convertFromOMR,
  formatMoney,
  isCurrencyCode,
  type CurrencyCode,
} from '@/lib/currency'

const STORAGE_KEY = 'currency-preference'

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

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(BASE_CURRENCY)

  // قراءة التفضيل المحفوظ بعد أول رسم (لتجنب اختلاف الـ hydration).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (isCurrencyCode(saved)) setCurrencyState(saved)
    } catch {
      // localStorage قد يكون معطّلًا — نكمل بالافتراضي
    }
  }, [])

  const setCurrency = useCallback((c: CurrencyCode) => {
    setCurrencyState(c)
    try {
      localStorage.setItem(STORAGE_KEY, c)
    } catch {
      // تجاهل أخطاء التخزين
    }
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
