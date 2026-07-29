import NextAuth from "next-auth"
import authConfig from "./auth.config"
import { NextResponse } from "next/server"
import { mapPathToResource, RESOURCES, satisfies } from '@/lib/permissions'
import type { AccessLevel, ResourceKey } from '@/lib/permissions'

const { auth } = NextAuth(authConfig)

const PUBLIC_PATHS = ['/', '/auth', '/stages', '/api/auth', '/api/track', '/api/uploadthing', '/api/webhooks']

function isPublicPath(pathname: string) {
  if (pathname === '/') return true
  return PUBLIC_PATHS.some(
    (p) => p !== '/' && (pathname === p || pathname.startsWith(`${p}/`)),
  )
}

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const user = req.auth?.user as any

  const isPublic = isPublicPath(nextUrl.pathname)

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL('/auth', nextUrl))
  }

  if (isLoggedIn && nextUrl.pathname.startsWith('/admin')) {
    if (nextUrl.pathname === '/admin/no-access') {
      return NextResponse.next()
    }

    const role = user?.role

    if (role !== 'admin' && role !== 'assistant') {
      return NextResponse.redirect(new URL('/student', nextUrl))
    }

    if (role === 'assistant') {
      const permissions = user?.permissions || []
      const granted = new Map<string, AccessLevel>(
        permissions.map((p: any) => [p.resource as string, p.access_level as AccessLevel])
      )

      // مسارات أدمن عامة لا تخضع لجدول الصلاحيات (T11)
      const OPEN_ADMIN_PATHS = ['/admin/streaming', '/admin/search', '/admin/activity']
      const isOpenAdminPath = OPEN_ADMIN_PATHS.some(
        (p) => nextUrl.pathname === p || nextUrl.pathname.startsWith(`${p}/`),
      )

      if (!isOpenAdminPath) {
        const resource = mapPathToResource(nextUrl.pathname)
        // satisfies() يفحص المستوى فعليًا، بخلاف granted.has() الذي كان يمرّر 'none'
        const level = resource ? granted.get(resource) : undefined
        const hasAccess = !!level && satisfies(level, 'view')

        if (!hasAccess) {
          const firstAllowed = RESOURCES.find((r) => {
            const lvl = granted.get(r.key as ResourceKey)
            return !!lvl && satisfies(lvl, 'view')
          })
          const fallback = firstAllowed ? firstAllowed.href : '/admin/no-access'
          return NextResponse.redirect(new URL(fallback, nextUrl))
        }
      }
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|otf|ttf)$).*)',
  ],
}
