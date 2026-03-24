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

  return (
    <section
      className="section-divider deferred-section relative overflow-hidden bg-cover bg-center px-8 py-20 md:bg-fixed md:px-16 md:py-32"
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
        <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} direction="left" className="max-w-[760px]">
          <p className="section-eyebrow">{content.proof.eyebrow}</p>
          <h2 className="section-title mt-1.5 md:text-[44px]">{content.proof.title}</h2>
          <p className="mt-2.5 hidden max-w-[680px] text-base font-medium leading-[1.6] text-[var(--ink)] md:block md:text-lg">{content.proof.body}</p>
        </Reveal>
        <div className="mt-5 grid gap-4 md:mt-8 md:grid-cols-3 md:gap-5">
          {content.proof.items.map((item, index) => (
            <Reveal key={item.title} visible={reveal.visible} reducedMotion={prefersReducedMotion} delay={100 + index * 90} direction="scale">
              <InfoCardView item={item} prefersReducedMotion={prefersReducedMotion} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
