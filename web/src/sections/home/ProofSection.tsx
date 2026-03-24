import { useEffect, useState } from 'react'
import { SheriffBadge } from '../../components/home/DecorativeIcons'
import { InfoCardView } from '../../components/home/InfoCardView'
import { Reveal, useReveal } from '../../components/ui/Reveal'
import type { SiteContent } from '../../types'
export function ProofSection({
  content,
  prefersReducedMotion,
}: {
  content: SiteContent
  prefersReducedMotion: boolean
}) {
  const reveal = useReveal<HTMLDivElement>()
  const backgroundImage = content.proof.backgroundImage
  const [cardsPerPage, setCardsPerPage] = useState(1)
  const [activeIndex, setActiveIndex] = useState(0)
  const [trackGap, setTrackGap] = useState(16)
  const maxIndex = Math.max(content.proof.items.length - cardsPerPage, 0)
  const slideCount = maxIndex + 1

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)')
    const syncCardsPerPage = () => {
      const desktop = media.matches
      setCardsPerPage(desktop ? 3 : 1)
      setTrackGap(desktop ? 20 : 16)
    }

    syncCardsPerPage()
    media.addEventListener('change', syncCardsPerPage)

    return () => media.removeEventListener('change', syncCardsPerPage)
  }, [])

  useEffect(() => {
    setActiveIndex((currentIndex) => Math.min(currentIndex, maxIndex))
  }, [maxIndex])

  useEffect(() => {
    if (prefersReducedMotion || slideCount <= 1) {
      return
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % slideCount)
    }, 4200)

    return () => window.clearInterval(intervalId)
  }, [prefersReducedMotion, slideCount])

  return (
    <section
      className="section-divider deferred-section relative overflow-hidden bg-cover bg-center px-5 py-20 md:bg-fixed md:px-16 md:py-32"
      style={{
        backgroundImage: backgroundImage
          ? `linear-gradient(rgba(244,234,225,0.85), rgba(244,234,225,0.92)), url('${backgroundImage}')`
          : 'linear-gradient(rgba(244,234,225,0.96), rgba(244,234,225,0.96))',
      }}
    >
      <div className="absolute top-10 right-10 rotate-12 opacity-60 pointer-events-none md:right-32">
        <SheriffBadge />
      </div>
      <div ref={reveal.ref} className="relative z-10 mx-auto max-w-[1312px]">
        <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} direction="left" className="mobile-section-gutter max-w-[760px]">
          <p className="section-eyebrow">{content.proof.eyebrow}</p>
          <h2 className="section-title mt-1.5 md:text-[44px]">{content.proof.title}</h2>
          <p className="mt-2.5 hidden max-w-[680px] text-base font-medium leading-[1.6] text-[var(--ink)] md:block md:text-lg">{content.proof.body}</p>
        </Reveal>

        <div className="mobile-section-gutter mt-5 md:mt-8">
          <div className="overflow-hidden">
            <div
              className="flex gap-4 transition-transform duration-700 ease-out md:gap-5"
              style={{ transform: `translateX(calc(-${activeIndex} * ((100% + ${trackGap}px) / ${cardsPerPage})))` }}
            >
              {content.proof.items.map((item, itemIndex) => (
                <div
                  key={`${item.title}-${itemIndex}`}
                  className="shrink-0"
                  style={{ width: `calc((100% - ${(cardsPerPage - 1) * trackGap}px) / ${cardsPerPage})` }}
                >
                  <Reveal
                    visible={reveal.visible}
                    reducedMotion={prefersReducedMotion}
                    delay={100 + itemIndex * 90}
                    direction="scale"
                    className="h-full"
                  >
                    <InfoCardView item={item} prefersReducedMotion={prefersReducedMotion} className="flex h-full flex-col" />
                  </Reveal>
                </div>
              ))}
            </div>
          </div>

          {slideCount > 1 ? (
            <div className="mt-5 flex items-center justify-center gap-2">
              {Array.from({ length: slideCount }).map((_, pageIndex) => (
                <button
                  key={`testimonial-dot-${pageIndex}`}
                  type="button"
                  aria-label={`Show testimonial page ${pageIndex + 1}`}
                  onClick={() => setActiveIndex(pageIndex)}
                  className={[
                    'h-2.5 rounded-full transition-all duration-300',
                    activeIndex === pageIndex ? 'w-8 bg-[var(--brick)]' : 'w-2.5 bg-[rgba(106,45,31,0.28)]',
                  ].join(' ')}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
