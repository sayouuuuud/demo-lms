/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone build for Docker/Coolify: emits .next/standalone with a minimal
  // server + only the traced node_modules, avoiding OOM/crash on the 8GB VPS.
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      // UploadThing (utfs.io + ufs.sh)
      { protocol: 'https', hostname: 'utfs.io' },
      { protocol: 'https', hostname: '*.ufs.sh' },
      // Cloudflare R2 public bucket (optional public domain)
      { protocol: 'https', hostname: '*.r2.dev' },
      // Supabase Storage (kept for any existing Supabase-hosted images)
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
          // لوحة أدمن + بيانات دفع => منع التأطير
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Report-Only أولًا حتى لا تُكسر الموارد الخارجية (R2 / UploadThing)
          {
            key: 'Content-Security-Policy-Report-Only',
            value: [
              "default-src 'self'",
              "img-src 'self' data: blob: https:",
              "media-src 'self' blob: https:",
              "style-src 'self' 'unsafe-inline'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "font-src 'self' data:",
              "connect-src 'self' https://*.r2.dev https://utfs.io https://*.ufs.sh https://*.supabase.co",
              "frame-ancestors 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
