'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  Library,
  FileText,
  CalendarDays,
  ShoppingCart,
  MessageSquare,
  Bell,
  Tag,
  Layers,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useLogout } from '@/lib/use-logout'
import { NavBadge } from '@/components/nav-badge'
import {
  getAdminSidebarBadges,
  type AdminSidebarBadges,
} from '@/app/admin/badges-actions'
import type { PermissionMap, ResourceKey } from '@/lib/permissions'

type BadgeKey = keyof AdminSidebarBadges

type NavItem = {
  label: string
  icon: any
  href: string
  resource: ResourceKey
  badge?: BadgeKey
  adminOnly?: boolean
}

type NavGroup = {
  isGroup: true
  label: string
  icon: any
  items: NavItem[]
}

type NavItemOrGroup = NavItem | NavGroup

const navItems: NavItemOrGroup[] = [
  { label: 'الصفحة الرئيسية', icon: LayoutDashboard, href: '/admin/dashboard', resource: 'dashboard' },
  {
    isGroup: true,
    label: 'إدارة المحتوى',
    icon: BookOpen,
    items: [
      { label: 'التصنيفات', icon: Layers, href: '/admin/categories', resource: 'categories' },
      { label: 'المحاضرات', icon: BookOpen, href: '/admin/courses', resource: 'courses' },
    ]
  },
  {
    isGroup: true,
    label: 'التقييمات والمهام',
    icon: ClipboardList,
    items: [
      { label: 'الاختبارات', icon: ClipboardList, href: '/admin/exams', resource: 'exams' },
      { label: 'بنك الأسئلة', icon: Library, href: '/admin/question-bank', resource: 'question-bank' },
      { label: 'الواجبات', icon: FileText, href: '/admin/assignments', resource: 'assignments' },
    ]
  },
  {
    isGroup: true,
    label: 'شؤون الطلاب',
    icon: Users,
    items: [
      { label: 'الطلاب', icon: Users, href: '/admin/students', resource: 'students' },
      { label: 'التقويم', icon: CalendarDays, href: '/admin/calendar', resource: 'calendar' },
    ]
  },
  {
    isGroup: true,
    label: 'التواصل',
    icon: MessageSquare,
    items: [
      { label: 'رسائل', icon: MessageSquare, href: '/admin/messages', resource: 'messages', badge: 'messages' },
      { label: 'الإشعارات', icon: Bell, href: '/admin/notifications', resource: 'notifications', badge: 'notifications' },
    ]
  },
  {
    isGroup: true,
    label: 'المبيعات والماليات',
    icon: ShoppingCart,
    items: [
      { label: 'الطلبات', icon: ShoppingCart, href: '/admin/payments', resource: 'payments', badge: 'orders' },
      { label: 'خصومات و الكوبونات', icon: Tag, href: '/admin/coupons', resource: 'coupons' },
    ]
  },
  {
    isGroup: true,
    label: 'النظام والتقارير',
    icon: BarChart3,
    items: [
      { label: 'التقارير', icon: BarChart3, href: '/admin/reports', resource: 'reports' },
      { label: 'الأمان والأجهزة', icon: ShieldAlert, href: '/admin/security', resource: 'security' },
      { label: 'سجل المراقبة', icon: ShieldCheck, href: '/admin/activity', resource: 'settings', adminOnly: true },
    ]
  },
  { label: 'الإعدادات', icon: Settings, href: '/admin/settings', resource: 'settings' },
]

export function Sidebar({
  open,
  onClose,
  collapsed,
  onToggleCollapse,
  permissions,
}: {
  open: boolean
  onClose: () => void
  collapsed: boolean
  onToggleCollapse: () => void
  permissions?: PermissionMap
}) {
  const pathname = usePathname()
  const [openGroups, setOpenGroups] = useState<string[]>([])

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    )
    if (collapsed) {
      onToggleCollapse()
    }
  }

  const visibleNavItems = permissions
    ? navItems.map((group) => {
        if (!('isGroup' in group)) {
          if (group.adminOnly) return null
          const level = permissions[group.resource]
          if (level === 'view' || level === 'manage') return group
          return null
        }
        const filteredItems = group.items.filter((item) => {
          if (item.adminOnly) return false
          const level = permissions[item.resource]
          return level === 'view' || level === 'manage'
        })
        if (filteredItems.length === 0) return null
        return { ...group, items: filteredItems }
      }).filter(Boolean) as NavItemOrGroup[]
    : navItems

  const logout = useLogout()
  const [badges, setBadges] = useState<AdminSidebarBadges>({
    orders: 0,
    messages: 0,
    notifications: 0,
  })

  useEffect(() => {
    // Auto-open groups containing the active child
    visibleNavItems.forEach((group) => {
      if ('isGroup' in group) {
        const isActive = group.items.some(
          (child) => pathname === child.href || pathname.startsWith(`${child.href}/`)
        )
        if (isActive) {
          setOpenGroups((prev) => (prev.includes(group.label) ? prev : [...prev, group.label]))
        }
      }
    })
  }, [pathname])

  // Fetch live counts on mount, poll every 60s, and refresh on navigation
  // so a badge clears right after the admin visits the relevant page.
  useEffect(() => {
    let active = true
    async function load() {
      const data = await getAdminSidebarBadges()
      if (active) setBadges(data)
    }
    load()
    const interval = setInterval(load, 60_000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [pathname])

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0',
          open ? 'translate-x-0' : 'translate-x-full',
          collapsed ? 'w-[72px]' : 'w-72',
        )}
      >
        {/* Logo */}
        <div className="flex shrink-0 items-center justify-between gap-3 px-6 py-4">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
                <GraduationCap className="size-6" />
              </div>
              <div className="leading-tight">
                <h1 className="text-base font-bold text-white">منصة تعليمية</h1>
                <p className="text-xs text-sidebar-foreground/60">لوحة الإدارة</p>
              </div>
            </div>
          )}

          {/* Close on mobile */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-sidebar-foreground hover:bg-white/10 hover:text-white md:hidden"
          >
            <X className="size-5" />
            <span className="sr-only">إغلاق القائمة</span>
          </Button>

          {/* Collapse toggle on desktop */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="hidden text-sidebar-foreground hover:bg-white/10 hover:text-white md:flex"
            aria-label={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
          >
            {collapsed ? (
              <ChevronLeft className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col overflow-hidden px-2 py-2">
          <div className="ns-stagger flex flex-1 flex-col gap-1 overflow-y-auto pb-4 scrollbar-hide">
          {visibleNavItems.map((item) => {
            if ('isGroup' in item) {
              const isGroupOpen = openGroups.includes(item.label)
              const isGroupActive = item.items.some(
                (child) => pathname === child.href || pathname.startsWith(`${child.href}/`)
              )
              return (
                <div key={item.label} className="group/group relative mb-1 flex flex-col">
                  <button
                    onClick={() => toggleGroup(item.label)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200',
                      collapsed ? 'justify-center' : '',
                      isGroupActive ? 'text-white' : 'text-sidebar-foreground/75 hover:bg-white/5 hover:text-white',
                    )}
                  >
                    <item.icon className="size-5 shrink-0 transition-transform duration-200 group-hover/group:scale-110" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-right">{item.label}</span>
                        <ChevronDown className={cn("size-4 transition-transform", !isGroupOpen && "rotate-90")} />
                      </>
                    )}
                  </button>
                  {isGroupOpen && !collapsed && (
                    <div className="mt-1 flex flex-col gap-0.5 border-r border-sidebar-border pr-4 mr-4">
                      {item.items.map((child) => {
                        const active = pathname === child.href || pathname.startsWith(`${child.href}/`)
                        return (
                          <Link
                            key={child.label}
                            href={child.href}
                            onClick={onClose}
                            className={cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                              active ? 'bg-sidebar-primary/20 text-white font-bold' : 'text-sidebar-foreground/60 hover:text-white hover:bg-white/5'
                            )}
                          >
                            <child.icon className="size-5 shrink-0" />
                            <span className="flex-1">{child.label}</span>
                            {child.badge && badges[child.badge] > 0 && (
                              <NavBadge count={badges[child.badge]} />
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                  {collapsed && (
                    <div className="pointer-events-none absolute right-full top-1/2 z-50 me-2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-medium text-background opacity-0 shadow-lg transition-opacity duration-150 group-hover/group:opacity-100">
                      {item.label}
                      <span className="absolute right-[-4px] top-1/2 -translate-y-1/2 border-4 border-transparent border-l-foreground" />
                    </div>
                  )}
                </div>
              )
            }

            const active =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`)
            return (
              <div key={item.label} className="group relative mb-1">
                <Link
                  href={item.href}
                  onClick={onClose}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200',
                    collapsed ? 'justify-center' : '',
                    active
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/30'
                      : 'text-sidebar-foreground/75 hover:bg-white/5 hover:text-white hover:-translate-x-0.5',
                  )}
                >
                  <item.icon className="size-5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                  {collapsed && item.badge && (
                    <NavBadge count={badges[item.badge]} collapsed />
                  )}
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {item.badge && badges[item.badge] > 0 ? (
                        <NavBadge count={badges[item.badge]} />
                      ) : (
                        active && <ChevronLeft className="size-4 opacity-70" />
                      )}
                    </>
                  )}
                </Link>

                {/* Tooltip on collapsed */}
                {collapsed && (
                  <div className="pointer-events-none absolute right-full top-1/2 z-50 me-2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-medium text-background opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                    {item.label}
                    <span className="absolute right-[-4px] top-1/2 -translate-y-1/2 border-4 border-transparent border-l-foreground" />
                  </div>
                )}
              </div>
            )
          })}
          </div>
        </nav>

        {/* Logout */}
        <div className="shrink-0 border-t border-sidebar-border px-2 py-2">
          <div className="group relative">
            <button
              type="button"
              onClick={logout}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-white/5 hover:text-white',
                collapsed && 'justify-center',
              )}
            >
              <LogOut className="size-5 shrink-0" />
              {!collapsed && <span>تسجيل الخروج</span>}
            </button>
            {collapsed && (
              <div className="pointer-events-none absolute right-full top-1/2 z-50 me-2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-medium text-background opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                تسجيل الخروج
                <span className="absolute right-[-4px] top-1/2 -translate-y-1/2 border-4 border-transparent border-l-foreground" />
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
