import { CmsImage } from '../../components/ui/CmsImage'
import { Reveal, useReveal } from '../../components/ui/Reveal'
import type { SiteContent } from '../../types'

export function AboutSection({
  content,
  prefersReducedMotion,
}: {
  content: SiteContent
  prefersReducedMotion: boolean
}) {
  const reveal = useReveal<HTMLDivElement>()

  return (
    <section id="about" className="section-divider deferred-section bg-[var(--blush)] px-5 py-14 md:px-16 md:py-24">
      <div ref={reveal.ref} className="mx-auto grid max-w-[1312px] gap-12 md:grid-cols-[1fr_1.4fr] md:items-start">
        <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} direction="left" className="mobile-section-gutter text-left">
          <p className="section-eyebrow">{content.about.eyebrow}</p>
          <h2 className="section-title mt-1.5 md:text-[38px] lg:text-[44px]">{content.about.title}</h2>
          {content.about.paragraphs.map((paragraph) => (
            <p key={paragraph} className="mt-3 hidden max-w-[480px] text-base leading-[1.65] text-[var(--muted)] md:block">
              {paragraph}
            </p>
          ))}

          <div className="mt-8 flex flex-wrap gap-4">
            {content.about.facts.map((fact) => (
              <div key={fact.label} className="interactive-card leather-stitch min-w-[170px] flex-1 rounded-[20px] bg-[var(--card)] p-5 text-center shadow-sm md:max-w-[220px]">
                <div className="text-base font-semibold text-[var(--ink)]">{fact.value}</div>
                <div className="mt-1 text-sm text-[var(--muted)]">{fact.label}</div>
              </div>
            ))}
          </div>
        </Reveal>

        <div className="flex flex-col items-center">
          <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} delay={220} direction="up" className="w-full">
            <div className="overflow-hidden rounded-[28px] shadow-xl">
              <CmsImage
                src={content.about.image}
                media={content.about.imageMedia}
                alt={content.about.title}
                className="image-zoom h-[320px] w-full object-cover md:h-[500px]"
                sizes="(min-width: 768px) 60vw, 100vw"
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
