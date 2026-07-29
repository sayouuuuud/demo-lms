'use client'

import { cn } from '@/lib/utils'

export function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  description?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="text-right">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-muted',
        )}
      >
        <span
          className={cn(
            'inline-block size-4 transform rounded-full bg-background shadow transition-transform',
            // RTL: checked slides left, unchecked stays right
            checked ? 'translate-x-[-2px]' : 'translate-x-[-26px]',
          )}
        />
      </button>
    </div>
  )
}
