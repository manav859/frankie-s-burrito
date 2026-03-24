import type { SiteContent } from '../../types'
import { BrandMark } from '../ui/BrandMark'
import { Reveal, useReveal } from '../ui/Reveal'

export function Footer({
  content,
  prefersReducedMotion,
}: {
  content: SiteContent
  prefersReducedMotion: boolean
}) {
  const reveal = useReveal<HTMLElement>()

  return (
    <footer ref={reveal.ref} className="deferred-section bg-[var(--footer)] px-8 py-10 pb-28 text-[var(--cream-dim)] md:px-16 md:py-14">
      <div className="mx-auto grid max-w-[1312px] gap-8 md:grid-cols-[360px_220px_260px_260px] md:gap-12">
        <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} direction="left">
          <div>
            <BrandMark content={content} className="max-h-16 w-auto object-contain" light />
            <p className="mt-1.5 max-w-[360px] text-base leading-[1.6]">{content.footer.description}</p>
          </div>
        </Reveal>
        <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} delay={90}>
          <div>
            <div className="text-base font-semibold text-white">{content.footer.navigateHeading || 'Navigate'}</div>
            <div className="mt-1.5 space-y-2 text-[15px]">
              {content.navigation.map((item) => (
                <div key={item.label}>
                  <a href={item.href}>{item.label}</a>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
        <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} delay={180}>
          <div>
            <div className="text-base font-semibold text-white">{content.footer.visitHeading || 'Visit'}</div>
            <div className="mt-1.5 space-y-2 text-[15px]">
              {content.footer.visit.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          </div>
        </Reveal>
        <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} delay={270}>
          <div>
            <div className="text-base font-semibold text-white">{content.footer.orderHeading || 'Order and Social'}</div>
            <div className="mt-1.5 space-y-2 text-[15px]">
              {content.footer.order.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </footer>
  )
}
