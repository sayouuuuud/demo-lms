'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Sun, Moon, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/theme-provider'
import { CartButton } from '@/components/cart/cart-button'
import { useCart } from '@/components/cart/cart-provider'
import type { NavbarContent } from '@/lib/site-content-defaults'
import { DEFAULT_SITE_CONTENT } from '@/lib/site-content-defaults'

const navLinks = [
  { label: 'المنهج', href: '#features' },
  { label: 'المراحل', href: '#stages' },
  { label: 'أرقامنا', href: '#stats' },
  { label: 'آراء الطلاب', href: '#testimonials' },
]

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <span className="flex flex-col justify-center items-center size-5 gap-[5px]" aria-hidden>
      <span
        className={cn(
          'block h-[1.8px] bg-current rounded-full transition-all duration-300 origin-center',
          open ? 'w-5 rotate-45 translate-y-[7px]' : 'w-5'
        )}
      />
      <span
        className={cn(
          'block h-[1.8px] bg-current rounded-full transition-all duration-300',
          open ? 'w-0 opacity-0' : 'w-3.5'
        )}
      />
      <span
        className={cn(
          'block h-[1.8px] bg-current rounded-full transition-all duration-300 origin-center',
          open ? 'w-5 -rotate-45 -translate-y-[7px]' : 'w-5'
        )}
      />
    </span>
  )
}

export function LandingNavbar({
  isLoggedIn = false,
  content = DEFAULT_SITE_CONTENT.navbar,
}: {
  isLoggedIn?: boolean
  content?: NavbarContent
}) {
  const { isDark, toggleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const { loggedIn: cartLoggedIn } = useCart()

  const isUserLoggedIn = isLoggedIn || cartLoggedIn

  useEffect(() => {
    setMounted(true)
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!sidebarOpen) return
    function handleClick(e: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setSidebarOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [sidebarOpen])

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <>
      <header className="fixed top-4 left-0 right-0 z-50 flex justify-center px-3 sm:px-6 md:px-8 mb-4">
        <div className="w-full max-w-full">
          <nav
            className={cn(
              'flex items-center justify-between gap-4 px-6 py-3.5 rounded-2xl sm:rounded-full border transition-all duration-300',
              'bg-card/80 backdrop-blur-md shadow-lg',
              scrolled && 'shadow-xl',
              'w-full'
            )}
            style={{ borderColor: 'rgba(200,185,154,0.4)' }}
          >
            {/* ── RIGHT: Logo ── */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="size-9 rounded-full flex items-center justify-center bg-gold text-navy-deep text-sm font-bold shrink-0">
                ش
              </div>
              <span className="text-base font-bold text-foreground whitespace-nowrap">
                أكاديمية شفاء العليل
              </span>
            </Link>

            {/* ── CENTER: nav links ── */}
            <div className="flex-1 flex items-center justify-center gap-6 lg:gap-8">
              {/* Desktop nav links */}
              <ul className="hidden md:flex items-center gap-6">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── LEFT: actions ── */}
            <div className="flex items-center gap-2 shrink-0">
              <CartButton className="text-foreground" />
              {mounted && (
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="size-9 flex items-center justify-center rounded-full border border-border/60 hover:bg-muted transition-colors"
                  aria-label="تبديل المظهر"
                >
                  {isDark ? (
                    <Sun className="size-4 text-muted-foreground" />
                  ) : (
                    <Moon className="size-4 text-muted-foreground" />
                  )}
                </button>
              )}

              {/* Desktop CTAs */}
              {isUserLoggedIn ? (
                <Link
                  href="/student"
                  className="hidden md:block px-5 py-2 rounded-full text-sm font-semibold bg-gold text-navy-deep hover:opacity-90 transition-opacity whitespace-nowrap"
                >
                  لوحة التحكم
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth"
                    className="hidden lg:block px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-muted transition-colors whitespace-nowrap"
                  >
                    تسجيل الدخول
                  </Link>
                  <Link
                    href="/auth"
                    className="hidden md:block px-5 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    ابدأ الآن
                  </Link>
                </>
              )}

              {/* Hamburger — mobile only */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden size-9 flex items-center justify-center rounded-full border border-border/60 hover:bg-muted transition-colors text-foreground"
                aria-label="فتح القائمة"
                aria-expanded={sidebarOpen}
              >
                <HamburgerIcon open={false} />
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* ─── Mobile Sidebar ─── */}
      <div
        className={cn(
          'fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden',
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        aria-hidden
        onClick={closeSidebar}
      />

      <div
        ref={sidebarRef}
        role="dialog"
        aria-modal="true"
        aria-label="قائمة التنقل"
        dir="rtl"
        className={cn(
          'fixed top-0 right-0 h-full w-72 z-[70] flex flex-col',
          'bg-card border-l border-border/50 shadow-2xl',
          'transition-transform duration-300 ease-in-out md:hidden',
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b border-border/40"
          style={{ borderColor: 'rgba(200,185,154,0.25)' }}
        >
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full flex items-center justify-center bg-gold text-navy-deep text-sm font-bold shrink-0">
              ش
            </div>
            <span className="text-sm font-bold text-foreground">أكاديمية شفاء العليل</span>
          </div>
          <button
            onClick={closeSidebar}
            className="size-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
            aria-label="إغلاق القائمة"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <ul className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={closeSidebar}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium',
                    'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                    'transition-colors duration-150'
                  )}
                >
                  <span
                    className="size-1.5 rounded-full shrink-0"
                    style={{ background: 'rgba(200,185,154,0.7)' }}
                  />
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div
          className="flex flex-col gap-2 px-4 py-5 border-t border-border/40"
          style={{ borderColor: 'rgba(200,185,154,0.25)' }}
        >
          {isUserLoggedIn ? (
            <Link
              href="/student"
              onClick={closeSidebar}
              className="w-full text-center py-2.5 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              لوحة التحكم
            </Link>
          ) : (
            <>
              <Link
                href="/auth"
                onClick={closeSidebar}
                className="w-full text-center py-2.5 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                ابدأ الآن
              </Link>
              <Link
                href="/auth"
                onClick={closeSidebar}
                className="w-full text-center py-2.5 rounded-full text-sm font-medium text-foreground border border-border/50 hover:bg-muted transition-colors"
              >
                تسجيل الدخول
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  )
}
