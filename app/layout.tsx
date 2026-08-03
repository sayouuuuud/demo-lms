import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Cairo, Geist_Mono, Aref_Ruqaa } from 'next/font/google'
import localFont from 'next/font/local'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { SiteLoader } from '@/components/site-loader'
import { CartProvider } from '@/components/cart/cart-provider'
import { CartModal } from '@/components/cart/cart-modal'
import { PageViewTracker } from '@/components/analytics/page-view-tracker'
import { colorPresets } from '@/lib/color-presets'
import { neonPresets } from '@/lib/neon-presets'
import { lightPresets } from '@/lib/light-presets'
import { getSiteColor, getSiteNeon, getSiteLightPreset } from '@/app/admin/settings/actions'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getSiteContent } from '@/lib/site-content'
import { getSiteUrl } from '@/lib/seo'
import './globals.css'


const cairo = Cairo({
  variable: '--font-cairo',
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
})
const arefRuqaa = Aref_Ruqaa({
  variable: '--font-aref-ruqaa',
  subsets: ['arabic', 'latin'],
  weight: ['400', '700'],
})
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})
const reemKufi = localFont({
  src: [
    {
      path: '../public/fonts/Reem_Kufi/static/ReemKufi-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../public/fonts/Reem_Kufi/static/ReemKufi-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-reem-kufi',
  display: 'swap',
})
const lemonBrush = localFont({
  src: '../public/fonts/lemon-brush-arabic.otf',
  variable: '--font-hero',
  display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getSiteContent()
  const siteUrl = getSiteUrl()
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: seo.title,
      template: `%s | ${seo.title}`,
    },
    description: seo.description,
    keywords: seo.keywords || undefined,
    generator: 'v0.app',
    alternates: {
      canonical: '/',
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      type: 'website',
      locale: 'ar_EG',
      siteName: seo.title,
      title: seo.title,
      description: seo.description,
      url: '/',
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
    },
    ...(seo.googleVerification
      ? { verification: { google: seo.googleVerification } }
      : {}),
  }
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f5f7' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1f33' },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // اللون المحفوظ على مستوى الموقع — يُقرأ من جدول عام (site_theme) يقدر أي زائر
  // أو حساب يقراه، فيفضل ثابت عبر كل الأجهزة وحتى قبل تسجيل الدخول.
  let savedColor = 'navy'
  let savedNeon = 'teal-violet'
  let savedLight = 'navy-gold'
  let seoContent: any = null
  try {
    ;[savedColor, savedNeon, savedLight, { seo: seoContent }] = await Promise.all([
      getSiteColor(),
      getSiteNeon(),
      getSiteLightPreset(),
      getSiteContent(),
    ])

    const session = await auth()
    const userId = session?.user?.id
    if (userId) {
      const userProfile = await prisma.profiles.findUnique({
        where: { id: userId },
        select: { color_preset: true, role: true }
      })
      if (userProfile && userProfile.role === 'student' && userProfile.color_preset) {
        savedColor = userProfile.color_preset
      }
    }
  } catch {
    // لو فشل الجلب نكمّل بالقيم الافتراضية
  }

  // نحضّر قيم الـ presets المحفوظة عشان نطبّقها في سكريبت inline قبل أول رسم،
  // وإلا الموقع هيرجع للألوان الافتراضية بعد كل ريفريش.
  const colorPreset = colorPresets.find((p) => p.id === savedColor) ?? colorPresets[0]
  const neonPreset = neonPresets.find((p) => p.id === savedNeon) ?? neonPresets[0]
  const lightPreset = lightPresets.find((p) => p.id === savedLight) ?? lightPresets[0]

  const themeScript = `(function(){try{
    var r=document.documentElement;
    var t=localStorage.getItem('theme');
    var isDark = t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);
    if(isDark){r.classList.add('dark')}
    var c=${JSON.stringify({ light: colorPreset.light, dark: colorPreset.dark })};
    var v=isDark?c.dark:c.light;
    r.style.setProperty('--primary',v.primary);
    r.style.setProperty('--ring',v.ring);
    r.style.setProperty('--sidebar-primary',v.sidebar);
    r.style.setProperty('--sidebar-accent',v.sidebar);
    r.style.setProperty('--sidebar-ring',v.ring);
    r.dataset.colorPreset=${JSON.stringify(colorPreset.id)};
    r.style.setProperty('--color-teal-glow',${JSON.stringify(neonPreset.tealGlow)});
    r.style.setProperty('--color-teal-deep',${JSON.stringify(neonPreset.tealDeep)});
    r.style.setProperty('--color-violet-glow',${JSON.stringify(neonPreset.violetGlow)});
    r.style.setProperty('--color-violet-deep',${JSON.stringify(neonPreset.violetDeep)});
    r.style.setProperty('--color-navy',${JSON.stringify(lightPreset.navy)});
    r.style.setProperty('--color-navy-deep',${JSON.stringify(lightPreset.navyDeep)});
    r.style.setProperty('--color-navy-soft',${JSON.stringify(lightPreset.navySoft)});
    r.style.setProperty('--color-gold',${JSON.stringify(lightPreset.gold)});
    r.style.setProperty('--color-gold-deep',${JSON.stringify(lightPreset.goldDeep)});
    r.style.setProperty('--color-emerald-brand',${JSON.stringify(lightPreset.emeraldBrand)});
    r.style.setProperty('--color-emerald-deep',${JSON.stringify(lightPreset.emeraldDeep)});
  }catch(e){}})();`

  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${arefRuqaa.variable} ${reemKufi.variable} ${lemonBrush.variable} ${geistMono.variable} bg-background`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />

      </head>
      <body className={`${cairo.className} font-sans antialiased`}>
        <ThemeProvider>
          <CartProvider>
            <SiteLoader />
            {children}
            <CartModal />
            <PageViewTracker />
          </CartProvider>
        </ThemeProvider>
        <Toaster 
          position="top-center" 
          dir="rtl" 
          theme="system" 
          toastOptions={{
            className: 'font-sans',
            classNames: {
              toast: 'group flex items-start bg-background/95 backdrop-blur-xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] rounded-2xl p-4 gap-4 text-right transition-all duration-300',
              title: 'text-foreground font-bold text-[15px] leading-none mb-1.5',
              description: 'text-muted-foreground text-[13px] leading-relaxed',
              actionButton: 'bg-primary text-primary-foreground font-semibold rounded-xl px-4 py-2 hover:bg-primary/90 transition-colors shrink-0',
              cancelButton: 'bg-muted text-muted-foreground font-semibold rounded-xl px-4 py-2 hover:bg-muted/80 transition-colors shrink-0',
              success: 'border-emerald-500/20 bg-emerald-500/10 dark:bg-emerald-500/10 dark:border-emerald-500/20',
              error: 'border-rose-500/20 bg-rose-500/10 dark:bg-rose-500/10 dark:border-rose-500/20',
              info: 'border-blue-500/20 bg-blue-500/10 dark:bg-blue-500/10 dark:border-blue-500/20',
              warning: 'border-amber-500/20 bg-amber-500/10 dark:bg-amber-500/10 dark:border-amber-500/20',
              icon: 'size-5 mt-0.5 shrink-0',
            }
          }}
        />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
