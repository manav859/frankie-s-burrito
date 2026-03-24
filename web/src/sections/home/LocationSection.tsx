import { CactusSVG } from '../../components/home/DecorativeIcons'
import { Button } from '../../components/ui/Button'
import { Reveal, useReveal } from '../../components/ui/Reveal'
import type { SiteContent } from '../../types'

export function LocationSection({
  content,
  prefersReducedMotion,
}: {
  content: SiteContent
  prefersReducedMotion: boolean
}) {
  const reveal = useReveal<HTMLDivElement>()

  return (
    <section id="location" className="section-divider deferred-section relative overflow-hidden bg-[var(--tan)] px-5 py-14 md:px-16 md:py-24">
      {!prefersReducedMotion && (
        <div className="cactus-idle">
          <CactusSVG />
        </div>
      )}
      <div ref={reveal.ref} className="mx-auto flex max-w-[900px] flex-col items-center text-center">
        <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} direction="up" className="mobile-section-gutter w-full">
          <p className="section-eyebrow">{content.location.eyebrow}</p>
          <h2 className="section-title mt-1.5 text-[30px] md:text-[48px]">{content.location.title}</h2>
          <div className="mt-8 flex flex-col items-center gap-4 text-[16px] md:text-[20px]">
            <p className="text-2xl font-bold text-[var(--ink)]">{content.location.name}</p>
            <div className="flex flex-col gap-2 text-[var(--muted)] md:flex-row md:gap-6">
              <p>{content.location.address}</p>
              <p>{content.location.hours}</p>
            </div>
            <p className="max-w-[560px] text-[var(--muted)]">{content.location.ordering}</p>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button cta={content.location.primaryCta} attention />
            <Button cta={content.location.secondaryCta} />
          </div>
        </Reveal>

        <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} delay={200} direction="up" className="mt-12 w-full">
          <div className="interactive-card overflow-hidden rounded-[32px] bg-white p-6 shadow-xl md:p-8">
            <h3 className="text-2xl font-bold text-[var(--ink)]">{content.location.mapTitle}</h3>
            <p className="mx-auto mt-2 max-w-[420px] text-base text-[var(--muted)]">{content.location.mapBody}</p>
            <div className="mt-6 overflow-hidden rounded-[24px] border-4 border-[var(--tan-dark)] bg-[var(--cream-soft)]">
              <iframe
                title={`${content.siteName} map`}
                src={content.location.mapEmbedUrl}
                className="h-[360px] w-full border-0 md:h-[480px]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </Reveal>

        <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} delay={350} direction="up" className="mt-8 w-full max-w-[800px]">
          <div className="interactive-card flex flex-col gap-6 rounded-[28px] bg-[var(--orange)] px-8 py-8 shadow-lg md:flex-row md:items-center md:justify-between">
            <p className="text-lg font-bold text-white md:text-xl">{content.location.cateringText}</p>
            <Button cta={content.location.cateringCta} />
          </div>
        </Reveal>
      </div>
    </section>
  )
}
