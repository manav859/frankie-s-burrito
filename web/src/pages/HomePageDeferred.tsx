import { Footer } from '../components/site/Footer'
import { AboutSection } from '../sections/home/AboutSection'
import { FeaturedSection } from '../sections/home/FeaturedSection'
import { FinalCtaSection } from '../sections/home/FinalCtaSection'
import { LocationSection } from '../sections/home/LocationSection'
import { MenuSection } from '../sections/home/MenuSection'
import { ProofSection } from '../sections/home/ProofSection'
import { ReasonsSection } from '../sections/home/ReasonsSection'
import type { SiteContent } from '../types'

export function HomePageDeferred({
  content,
  prefersReducedMotion,
}: {
  content: SiteContent
  prefersReducedMotion: boolean
}) {
  return (
    <>
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
    </>
  )
}
