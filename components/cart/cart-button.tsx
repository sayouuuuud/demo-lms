'use client'

import { ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCart } from './cart-provider'

// Cart icon with a live count badge. Only renders for logged-in students.
export function CartButton({ className }: { className?: string }) {
  const { count, setOpen, loggedIn } = useCart()
  if (!loggedIn) return null

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        'relative grid size-10 place-items-center rounded-full text-current transition-colors hover:bg-foreground/5',
        className,
      )}
      aria-label={`السلة (${count})`}
    >
      <ShoppingCart className="size-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground">
          {count}
        </span>
      )}
    </button>
  )
}
