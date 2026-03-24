import { lazy, Suspense } from 'react'
import { DesktopHero } from '../components/home/DesktopHero'
import { MobileHero } from '../components/home/MobileHero'
import type { SiteBootstrap } from '../types'

const HomePageDeferred = lazy(async () => {
  const module = await import('./HomePageDeferred')
  return { default: module.HomePageDeferred }
})

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
      <Suspense fallback={null}>
        <HomePageDeferred content={content} prefersReducedMotion={prefersReducedMotion} />
      </Suspense>
    </div>
  )
}
