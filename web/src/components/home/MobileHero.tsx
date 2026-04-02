import { useEffect, useState } from 'react'
import type { SiteContent } from '../../types'
import { Reveal } from '../ui/Reveal'
import { BrandMark } from '../ui/BrandMark'
import { Button } from '../ui/Button'
import { MobileMenu } from '../site/MobileMenu'
import { CowboyRider } from './DecorativeIcons'
import { CmsImage } from '../ui/CmsImage'
import { useMediaQuery } from '../../lib/hooks'

export function MobileHero({
  content,
  isScrolled,
  prefersReducedMotion,
}: {
  content: SiteContent
  isScrolled: boolean
  prefersReducedMotion: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const shouldLoadMobileHero = useMediaQuery('(max-width: 767px)')
  const mobileHeroImage = content.hero.mobileImage || content.hero.backgroundImage
  const mobileHeroMedia = content.hero.mobileImageMedia ?? content.hero.backgroundImageMedia

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <section className="relative flex min-h-[100dvh] flex-col items-center justify-center md:hidden">
      {shouldLoadMobileHero && mobileHeroImage ? (
        <div className="absolute inset-0">
          <CmsImage
            src={mobileHeroImage}
            media={mobileHeroMedia}
            alt={content.siteLogoAlt || content.siteName}
            className="h-full w-full object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-[rgba(27,19,13,0.24)]" />
        </div>
      ) : null}
      {!prefersReducedMotion ? (
        <div className="cowboy-wrapper mobile-cowboy-wrapper">
          <div className="cowboy-inner mobile-cowboy-inner">
            <CowboyRider />
          </div>
        </div>
      ) : null}

      <header
        className={[
          'fixed inset-x-0 top-0 z-50 px-[clamp(16px,5vw,32px)] py-[clamp(14px,4vw,18px)] transition-all duration-300',
          isScrolled ? 'bg-white shadow-[0_10px_30px_rgba(31,21,11,0.1)]' : 'bg-transparent',
        ].join(' ')}
      >
        <div className="mx-auto flex w-full max-w-[480px] items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <BrandMark
              content={content}
              className="block h-auto max-h-11 w-auto max-w-full object-contain min-[380px]:max-h-12 sm:max-h-14"
              light={!isScrolled}
            />
          </div>
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
            className="flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-1 rounded-[14px] transition hover:bg-white/10 min-[380px]:h-12 min-[380px]:w-12"
          >
            <span className={['h-0.5 w-5 rounded-full transition-colors duration-300', isScrolled ? 'bg-[var(--ink)]' : 'bg-white'].join(' ')} />
            <span className={['h-0.5 w-5 rounded-full transition-colors duration-300', isScrolled ? 'bg-[var(--ink)]' : 'bg-white'].join(' ')} />
            <span className={['h-0.5 w-5 rounded-full transition-colors duration-300', isScrolled ? 'bg-[var(--ink)]' : 'bg-white'].join(' ')} />
          </button>
        </div>
      </header>

      <MobileMenu content={content} open={menuOpen} onClose={() => setMenuOpen(false)} prefersReducedMotion={prefersReducedMotion} />

      <div className="w-full px-8 pt-8 text-center">
        <Reveal reducedMotion={prefersReducedMotion} delay={80}>
          <div className="mx-auto mt-9 flex w-[300px] flex-col gap-3">
            <Button cta={content.hero.primaryCta} fullWidth attention />
            <Button cta={content.hero.secondaryCta} fullWidth />
          </div>
        </Reveal>
      </div>
    </section>
  )
}
