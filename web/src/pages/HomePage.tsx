import { DesktopHero } from '../components/home/DesktopHero'
import { MobileHero } from '../components/home/MobileHero'
import { Footer } from '../components/site/Footer'
import { AboutSection } from '../sections/home/AboutSection'
import { FeaturedSection } from '../sections/home/FeaturedSection'
import { FinalCtaSection } from '../sections/home/FinalCtaSection'
import { LocationSection } from '../sections/home/LocationSection'
import { MenuSection } from '../sections/home/MenuSection'
import { ProofSection } from '../sections/home/ProofSection'
import { ReasonsSection } from '../sections/home/ReasonsSection'
import type { SiteBootstrap } from '../types'

export function HomePage({
  bootstrap,
  isScrolled,
  prefersReducedMotion,
}: {
  bootstrap: SiteBootstrap
  isScrolled: boolean
  prefersReducedMotion: boolean
}) {
  const content = bootstrap.content

  return (
    <div id="top" className="min-h-screen bg-[var(--sand)] text-[var(--ink)]">
      <DesktopHero content={content} isScrolled={isScrolled} prefersReducedMotion={prefersReducedMotion} />
      <MobileHero content={content} isScrolled={isScrolled} prefersReducedMotion={prefersReducedMotion} />
      <main>
        {content.featuredItems.length ? <FeaturedSection content={content} prefersReducedMotion={prefersReducedMotion} /> : null}
        <ReasonsSection content={content} prefersReducedMotion={prefersReducedMotion} />
        <MenuSection content={content} prefersReducedMotion={prefersReducedMotion} />
        <AboutSection content={content} prefersReducedMotion={prefersReducedMotion} />
        <ProofSection content={content} prefersReducedMotion={prefersReducedMotion} />
        <LocationSection content={content} prefersReducedMotion={prefersReducedMotion} />
        <FinalCtaSection content={content} prefersReducedMotion={prefersReducedMotion} />
      </main>
      <Footer content={content} prefersReducedMotion={prefersReducedMotion} />
    </div>
  )
}
