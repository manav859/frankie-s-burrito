import type { RefObject } from 'react'
import { useFloatingAccent } from '../../lib/animations'
import type { SiteContent } from '../../types'
import { CowboyRider } from './DecorativeIcons'
import { BrandMark } from '../ui/BrandMark'
import { Button } from '../ui/Button'
import { Reveal, useReveal } from '../ui/Reveal'
import { CmsImage } from '../ui/CmsImage'
import { resolveAppHref } from '../../lib/routes'
import { useMediaQuery } from '../../lib/hooks'

export function DesktopHero({
  content,
  isScrolled,
  prefersReducedMotion,
}: {
  content: SiteContent
  isScrolled: boolean
  prefersReducedMotion: boolean
}) {
  const heroReveal = useReveal<HTMLDivElement>()
  const floatRef1 = useFloatingAccent(10, 5000, 0)
  const floatRef2 = useFloatingAccent(7, 4200, 1400)
  const floatRef3 = useFloatingAccent(9, 4800, 2800)
  const shouldLoadDesktopHero = useMediaQuery('(min-width: 768px)')
  const desktopHeroImage = content.hero.backgroundImage || content.hero.mobileImage
  const desktopHeroMedia = content.hero.backgroundImageMedia ?? content.hero.mobileImageMedia

  return (
    <section className="relative hidden min-h-[100dvh] flex-col overflow-hidden md:flex">
      {shouldLoadDesktopHero && desktopHeroImage ? (
        <div className="absolute inset-0">
          <CmsImage
            src={desktopHeroImage}
            media={desktopHeroMedia}
            alt={content.siteLogoAlt || content.siteName}
            className="h-full w-full object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-[rgba(27,19,13,0.18)]" />
        </div>
      ) : null}
      {!prefersReducedMotion && (
        <>
          <div ref={floatRef1 as RefObject<HTMLDivElement>} className="floating-accent left-[8%] top-[22%] text-5xl">🌶️</div>
          <div ref={floatRef2 as RefObject<HTMLDivElement>} className="floating-accent right-[12%] top-[35%] text-4xl">🍋</div>
          <div ref={floatRef3 as RefObject<HTMLDivElement>} className="floating-accent left-[15%] bottom-[18%] text-3xl">⭐</div>
          <div className="cowboy-wrapper">
            <div className="cowboy-inner">
              <CowboyRider />
            </div>
          </div>
        </>
      )}

      <header
        className={[
          'fixed inset-x-0 top-0 z-50 transition-all duration-500',
          isScrolled ? 'bg-white shadow-[0_10px_30px_rgba(31,31,31,0.10)]' : 'bg-transparent',
        ].join(' ')}
      >
        <div
          className={[
            'mx-auto flex w-full max-w-[1440px] items-center justify-between px-16 transition-all duration-500',
            isScrolled ? 'py-3' : 'py-5',
          ].join(' ')}
        >
          <BrandMark
            content={content}
            className="max-h-16 w-auto object-contain transition-opacity duration-300"
            light={!isScrolled}
          />
          <nav
            className={[
              'flex items-center gap-6 text-[15px] font-medium transition-colors duration-300',
              isScrolled ? 'text-[var(--ink)]' : 'text-white',
            ].join(' ')}
          >
            {content.navigation.map((item) => (
              <a key={item.label} href={resolveAppHref(item.href, item.label)} className="nav-link transition hover:text-[var(--gold)]">
                {item.label}
              </a>
            ))}
            <Button cta={content.hero.primaryCta} attention={!isScrolled} />
          </nav>
        </div>
      </header>

      <div ref={heroReveal.ref} className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 items-center justify-center px-16 pb-14 pt-6">
        <div className="w-full max-w-[1100px] rounded-[28px] px-6 py-6 text-center">
          <Reveal reducedMotion={prefersReducedMotion} visible={heroReveal.visible} delay={120}>
            <div className="flex items-center justify-center gap-4">
              <Button cta={content.hero.primaryCta} attention />
              <Button cta={content.hero.secondaryCta} />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
