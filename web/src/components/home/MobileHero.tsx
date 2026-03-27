import { useEffect, useState } from 'react'
import type { SiteContent } from '../../types'
import { Reveal } from '../ui/Reveal'
import { BrandMark } from '../ui/BrandMark'
import { Button } from '../ui/Button'
import { MobileMenu } from '../site/MobileMenu'
import { CowboyRider } from './DecorativeIcons'
import { CmsImage } from '../ui/CmsImage'

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
  const shouldLoadMobileHero = typeof window === 'undefined' || window.matchMedia('(max-width: 767px)').matches

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <section className="relative flex min-h-[100dvh] flex-col items-center justify-center md:hidden">
      {shouldLoadMobileHero && content.hero.mobileImage ? (
        <div className="absolute inset-0">
          <CmsImage
            src={content.hero.mobileImage}
            media={content.hero.mobileImageMedia}
            alt={content.hero.title}
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
          'fixed inset-x-0 top-0 z-50 flex items-start justify-between px-8 py-[18px] transition-all duration-300',
          isScrolled ? 'bg-white shadow-[0_10px_30px_rgba(31,21,11,0.1)]' : 'bg-transparent',
        ].join(' ')}
      >
        <BrandMark content={content} className="max-h-14 w-auto object-contain" light={!isScrolled} />
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMenuOpen(true)}
          className="flex h-12 w-12 flex-col items-center justify-center gap-1 rounded-[14px] transition hover:bg-white/10"
        >
          <span className={['h-0.5 w-5 rounded-full transition-colors duration-300', isScrolled ? 'bg-[var(--ink)]' : 'bg-white'].join(' ')} />
          <span className={['h-0.5 w-5 rounded-full transition-colors duration-300', isScrolled ? 'bg-[var(--ink)]' : 'bg-white'].join(' ')} />
          <span className={['h-0.5 w-5 rounded-full transition-colors duration-300', isScrolled ? 'bg-[var(--ink)]' : 'bg-white'].join(' ')} />
        </button>
      </header>

      <MobileMenu content={content} open={menuOpen} onClose={() => setMenuOpen(false)} prefersReducedMotion={prefersReducedMotion} />

      <div className="w-full px-8 pt-8 text-center">
        <Reveal reducedMotion={prefersReducedMotion} delay={40}>
          <h1 className="mx-auto w-full max-w-[460px] whitespace-pre-line font-western text-[clamp(28px,9.5vw,44px)] leading-[1.05] tracking-normal text-[var(--cream)] md:text-[44px]">
            {content.hero.title}
          </h1>
        </Reveal>
        <Reveal reducedMotion={prefersReducedMotion} delay={180}>
          <div className="mx-auto mt-9 flex w-[300px] flex-col gap-3">
            <Button cta={content.hero.primaryCta} fullWidth attention />
            <Button cta={content.hero.secondaryCta} fullWidth />
          </div>
        </Reveal>
      </div>
    </section>
  )
}
