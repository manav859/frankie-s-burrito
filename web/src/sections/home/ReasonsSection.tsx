import { Horseshoe } from '../../components/home/DecorativeIcons'
import { InfoCardView } from '../../components/home/InfoCardView'
import { Reveal, useReveal } from '../../components/ui/Reveal'
import type { SiteContent } from '../../types'

export function ReasonsSection({
  content,
  prefersReducedMotion,
}: {
  content: SiteContent
  prefersReducedMotion: boolean
}) {
  const reveal = useReveal<HTMLDivElement>()

  return (
    <section
      className="section-divider deferred-section relative overflow-hidden px-5 py-20 md:px-16 md:py-32"
      style={{ backgroundColor: 'var(--leather)' }}
    >
      <div className="absolute top-10 left-10 -rotate-12 stroke-white opacity-40 pointer-events-none md:left-24">
        <Horseshoe />
      </div>
      <div ref={reveal.ref} className="relative z-10 mx-auto max-w-[1312px]">
        <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} direction="left" className="mobile-section-gutter max-w-[760px]">
          <p className="section-eyebrow !text-[var(--gold)]">{content.reasons.eyebrow}</p>
          <h2 className="section-title mt-1.5 !text-white md:text-[44px]">{content.reasons.title}</h2>
          <p className="mt-2.5 hidden max-w-[640px] text-base leading-[1.6] text-[var(--cream-dim)] md:block md:text-lg">{content.reasons.body}</p>
        </Reveal>
        <div className="mt-5 grid gap-4 md:mt-8 md:grid-cols-4 md:gap-5">
          {content.reasons.items.map((item, index) => (
            <Reveal
              key={`${item.number}-${item.title}-${index}`}
              visible={reveal.visible}
              reducedMotion={prefersReducedMotion}
              delay={100 + index * 80}
              direction="scale"
            >
              <InfoCardView item={item} prefersReducedMotion={prefersReducedMotion} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
