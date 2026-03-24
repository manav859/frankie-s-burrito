import { Button } from '../../components/ui/Button'
import { Reveal, useReveal } from '../../components/ui/Reveal'
import type { SiteContent } from '../../types'

export function FinalCtaSection({
  content,
  prefersReducedMotion,
}: {
  content: SiteContent
  prefersReducedMotion: boolean
}) {
  const reveal = useReveal<HTMLDivElement>()

  return (
    <>
      <div
        className="h-3 w-full"
        style={{
          background:
            'repeating-linear-gradient(90deg, var(--red) 0px, var(--red) 12px, var(--gold) 12px, var(--gold) 18px, #3d6b35 18px, #3d6b35 30px, var(--orange) 30px, var(--orange) 36px, var(--ink) 36px, var(--ink) 42px)',
        }}
      />
      <section className="deferred-section bg-[#19522f] px-8 py-14 text-white md:px-16 md:py-24">
        <div ref={reveal.ref} className="mx-auto max-w-[1312px]">
          <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} direction="left">
            <p className="section-eyebrow !text-[var(--cream)]">{content.finalCta.eyebrow}</p>
          </Reveal>
          <div className={['mask-reveal', reveal.visible || prefersReducedMotion ? 'is-visible' : ''].join(' ')}>
            <h2 className="mask-reveal-inner mt-1.5 max-w-[900px] text-[34px] font-semibold leading-[1.05] md:text-[54px]">
              {content.finalCta.title}
            </h2>
          </div>
          <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} delay={200}>
            <p className="mt-5 hidden max-w-[760px] text-lg leading-[1.6] text-[#fdf4e8] md:block">{content.finalCta.body}</p>
          </Reveal>
          <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} delay={320}>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button cta={content.finalCta.primaryCta} attention />
              <Button cta={content.finalCta.secondaryCta} />
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
