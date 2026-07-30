import type { NextAuthConfig } from "next-auth"

const isDevelopment     = process.env.NODE_ENV === 'development'
const isProduction      = process.env.NODE_ENV === 'production'
const isDeployedPreview = !isProduction && !isDevelopment  // Vercel preview builds (HTTPS iframe)

// The dev/preview app is rendered inside a cross-site iframe, where browsers
// drop SameSite=Lax cookies. That silently breaks the sign-in CSRF check and
// surfaces as "invalid credentials". Outside production we therefore issue the
// auth cookies as SameSite=None (which requires Secure), so they survive the
// embedded preview. Production keeps the stricter Lax default.
// في بيئة التطوير المحلية (HTTP) الكوكيز `Secure` مش بتتحفظ في البراوزر،
// فبنستخدم `secure: false` مع `sameSite: 'lax'` عشان تسجيل الدخول يشتغل.
// في الـ production والـ preview على Vercel (HTTPS) بنستخدم `SameSite=None; Secure`.
const crossSiteCookieOptions = {
  httpOnly: true,
  sameSite: (isDevelopment ? 'lax' : 'none') as 'lax' | 'none',
  path: '/',
  secure: !isDevelopment,
}

const previewCookies: NextAuthConfig['cookies'] = {
  sessionToken: { name: 'authjs.session-token', options: crossSiteCookieOptions },
  csrfToken: { name: 'authjs.csrf-token', options: crossSiteCookieOptions },
  callbackUrl: { name: 'authjs.callback-url', options: crossSiteCookieOptions },
}

// We define the edge-friendly config here.
// The database adapter and Credentials provider will be added in auth.ts.
export default {
  providers: [], // Configured in auth.ts
  pages: {
    signIn: '/auth',
  },
  // The app is served through a proxy host in preview/production, so the
  // forwarded host must be trusted instead of inferred from the request.
  trustHost: true,
  // فقط في الـ Vercel preview (HTTPS cross-site iframe) نستخدم SameSite=None.
  // في development (HTTP localhost) نتجاهل previewCookies عشان Secure مش متاح.
  ...(isDeployedPreview ? { cookies: previewCookies } : {}),
  callbacks: {
    // Attach the user's role and permissions from DB into the JWT during sign-in
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || 'student'; // 'student' by default
        token.permissions = (user as any).permissions || [];
        token.status = (user as any).status || 'نشط';
        token.instance_id = (user as any).instance_id || null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).permissions = token.permissions;
        (session.user as any).status = token.status as string;
        (session.user as any).instance_id = token.instance_id;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
} satisfies NextAuthConfig;
