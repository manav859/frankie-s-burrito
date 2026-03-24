import { FeaturedCard } from '../../components/home/FeaturedCard'
import { Button } from '../../components/ui/Button'
import { Reveal, useReveal } from '../../components/ui/Reveal'
import type { SiteContent } from '../../types'

export function FeaturedSection({
  content,
  prefersReducedMotion,
}: {
  content: SiteContent
  prefersReducedMotion: boolean
}) {
  const reveal = useReveal<HTMLDivElement>()

  return (
    <section id="featured" className="section-divider deferred-section bg-[var(--paper)] px-5 py-14 md:px-16 md:py-24">
      <div ref={reveal.ref} className="mx-auto max-w-[1312px]">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} direction="left" className="mobile-section-gutter max-w-[760px]">
            <p className="section-eyebrow">{content.featuredIntro.eyebrow}</p>
            <h2 className="section-title mt-1.5 md:text-[46px]">{content.featuredIntro.title}</h2>
          </Reveal>
          <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} delay={160} direction="right" className="hidden md:block">
            <Button cta={content.featuredIntro.cta} />
          </Reveal>
        </div>
        <div className="mt-5 grid gap-4 md:mt-8 md:grid-cols-3 md:gap-6">
          {content.featuredItems.map((item, index) => (
            <Reveal
              key={item.name}
              visible={reveal.visible}
              reducedMotion={prefersReducedMotion}
              delay={160 + index * 100}
              direction="scale"
            >
              <FeaturedCard item={item} menu={content.menu} prefersReducedMotion={prefersReducedMotion} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
