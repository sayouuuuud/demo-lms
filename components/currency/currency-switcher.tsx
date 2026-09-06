'use client'

/**
 * زر تبديل عملة العرض (ريال عُماني / جنيه مصري) — يظهر في هيدر الطالب.
 * التبديل يؤثر على العرض فقط؛ كل المبالغ المخزّنة تبقى بالريال العُماني.
 */

import { useState } from 'react'
import { Banknote, Check, ChevronDown } from 'lucide-react'
import { CURRENCIES, CURRENCY_OPTIONS, type CurrencyCode } from '@/lib/currency'
import { useCurrency } from '@/components/currency/currency-provider'
import { cn } from '@/lib/utils'

export function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-sm font-bold text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
        aria-label={`عملة العرض: ${CURRENCIES[currency].label}`}
        aria-expanded={open}
        title="تبديل عملة العرض"
      >
        <Banknote className="size-5" />
        <span className="hidden sm:inline">{CURRENCIES[currency].short}</span>
        <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
          <p className="border-b border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground">
            عملة العرض
          </p>
          <ul className="py-1">
            {CURRENCY_OPTIONS.map((code: CurrencyCode) => (
              <li key={code}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    setCurrency(code)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-secondary/60',
                    currency === code ? 'font-bold text-primary' : 'text-foreground',
                  )}
                >
                  <span>{CURRENCIES[code].label}</span>
                  {currency === code && <Check className="size-4" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
