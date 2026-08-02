import { BookOpen, Phone } from 'lucide-react'

const SvgIcon = ({ path, className }: { path: string; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d={path} />
  </svg>
)

const SOCIALS: { label: string; href: string; path: string }[] = [
  {
    label: 'واتساب',
    href: '#',
    path: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z',
  },
  {
    label: 'يوتيوب',
    href: '#',
    path: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  },
  {
    label: 'فيسبوك',
    href: '#',
    path: 'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-1.125 0-2.522.326-2.522 1.991v1.989h3.696l-.924 3.667h-2.772v7.98h-4.509z',
  },
  {
    label: 'تليجرام',
    href: '#',
    path: 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.888-.666 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z',
  },
]

const QUICK_LINKS = [
  { label: 'المميزات', href: '#features' },
  { label: 'المراحل الدراسية', href: '#stages' },
  { label: 'آراء الطلاب', href: '#testimonials' },
  { label: 'سجّل معانا', href: '#cta' },
]

export function SiteFooter({ content }: { content?: any }) {
  const year = new Date().getFullYear().toLocaleString('ar-EG', { useGrouping: false })

  return (
    <footer className="relative overflow-hidden bg-brown text-background/70 dark:bg-card dark:text-muted-foreground">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-60 dark:opacity-70"
        style={{
          backgroundImage: "url('/images/footer-calligraphy.png')",
          maskImage: 'linear-gradient(to top, black 0%, black 35%, rgba(0,0,0,0.4) 70%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to top, black 0%, black 35%, rgba(0,0,0,0.4) 70%, transparent 100%)',
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brown/55 via-brown/25 to-brown/60 dark:from-card/60 dark:via-card/25 dark:to-card/70"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4 md:px-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-gold text-primary-foreground">
              <BookOpen className="size-6" />
            </span>
            <span className="leading-tight">
              <span className="block text-lg font-black text-background dark:text-foreground">
                أكاديمية شفاء العليل
              </span>
              <span className="block text-xs text-gold">لغة عربية — من البداية للاحتراف</span>
            </span>
          </div>
          <p className="mt-4 max-w-sm text-pretty leading-relaxed">
            منصة تعليمية متخصصة في اللغة العربية للمرحلة الثانوية — نحو وصرف وبلاغة وأدب ونصوص، بشرح
            مبني على الفهم الحقيقي ومتابعة مستمرة.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                className="flex size-10 items-center justify-center rounded-xl bg-background/10 text-background transition-colors hover:bg-gold hover:text-primary-foreground dark:bg-foreground/10 dark:text-foreground"
                aria-label={s.label}
              >
                <SvgIcon className="size-5" path={s.path} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-bold text-background dark:text-foreground">روابط سريعة</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {QUICK_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="transition-colors hover:text-gold">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-bold text-background dark:text-foreground">تواصل معنا</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <Phone className="size-4 text-gold" />
              <span dir="ltr">+20 100 000 0000</span>
            </li>
            <li>جمهورية مصر العربية</li>
          </ul>
        </div>
      </div>

      <div className="relative border-t border-background/10 py-5 text-center text-sm dark:border-foreground/10">
        <p>{`جميع الحقوق محفوظة © ${year} أكاديمية شفاء العليل`}</p>
        <p className="mt-2 text-xs text-background/50 dark:text-muted-foreground/70">
          {'صُنعت هذه المنصة بحبٍ للعربية وشغفٍ بالإتقان — بأيدي '}
          <span className="font-semibold text-gold">مازن السقا</span>
          {' و '}
          <span className="font-semibold text-gold">سيد الشاذلي</span>
        </p>
      </div>
    </footer>
  )
}
