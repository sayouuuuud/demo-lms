'use client'

import { LandingNavbar } from './landing-navbar'
import { HeroSection } from './hero-section'
import { WaveDivider } from '@/components/wave-divider'
import { FeaturesSection } from './features-section'
import { StagesSection } from './stages-section'
import { StatsSection } from './stats-section'
import { CtaSection } from './cta-section'
import { SiteFooter } from './site-footer'
import { ScrollRefresh } from './scroll-refresh'
import type { Stage } from '@/lib/landing-data'
import type { SiteContent } from '@/lib/site-content-defaults'
import { DEFAULT_SITE_CONTENT } from '@/lib/site-content-defaults'

export function LandingPage({
  stages = [],
  isLoggedIn = false,
  siteContent = DEFAULT_SITE_CONTENT,
}: {
  stages?: Stage[]
  isLoggedIn?: boolean
  siteContent?: SiteContent
}) {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <ScrollRefresh />
      <div className="relative z-10">
        <LandingNavbar isLoggedIn={isLoggedIn} content={siteContent.navbar} />
        <main>
          <HeroSection />
          <WaveDivider />
          <FeaturesSection />
          <StagesSection stages={stages} />
          <StatsSection content={siteContent.stats} />
          <CtaSection content={siteContent.cta} />
        </main>
        <SiteFooter content={siteContent.footer} />
      </div>
    </div>
  )
}
