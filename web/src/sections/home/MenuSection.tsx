import { CrossedGuns } from '../../components/home/DecorativeIcons'
import { Button } from '../../components/ui/Button'
import { CmsImage } from '../../components/ui/CmsImage'
import { Reveal, useReveal } from '../../components/ui/Reveal'
import type { SiteContent } from '../../types'

export function MenuSection({
  content,
  prefersReducedMotion,
}: {
  content: SiteContent
  prefersReducedMotion: boolean
}) {
  const reveal = useReveal<HTMLDivElement>()

  return (
    <section id="menu" className="deferred-section relative overflow-hidden border-t border-[rgba(27,19,13,0.06)] bg-[var(--sand)] px-5 py-14 md:px-16 md:py-24">
      <div className="absolute top-10 right-10 rotate-12 pointer-events-none md:right-32">
        <CrossedGuns />
      </div>
      <div ref={reveal.ref} className="relative z-10 mx-auto grid max-w-[1312px] gap-[18px] md:grid-cols-[360px_minmax(0,1fr)] md:gap-7">
        <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion}>
          <div className="flex h-full flex-col gap-5">
            <div className="rounded-[22px] bg-[var(--cream-soft)] p-[18px] md:rounded-[28px] md:px-6 md:py-7">
              <p className="section-eyebrow">{content.menu.eyebrow}</p>
              <h2 className="section-title mt-1.5 text-[28px] md:text-[38px]">{content.menu.title}</h2>
              <p className="mt-2.5 hidden text-[15px] leading-[1.6] text-[var(--muted)] md:block md:text-[17px]">{content.menu.body}</p>
              <p className="mt-2.5 text-[14px] font-medium text-[var(--brick)]">{content.menu.note}</p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <div className="icon-float grid h-[42px] w-[42px] place-items-center rounded-full bg-[var(--gold)] text-lg">*</div>
                <div className="icon-float-delayed grid h-[54px] w-9 place-items-end text-3xl text-[var(--sage)]">I</div>
              </div>
            </div>

            <div className="hidden flex-col gap-4 rounded-[18px] bg-[var(--cream-soft)] px-4 py-[14px] md:mt-2 md:flex md:px-[22px] md:py-[18px]">
              <p className="max-w-[280px] text-[14px] font-medium leading-[1.6] text-[var(--ink)]">{content.menu.footerNote}</p>
              <div>
                <Button cta={content.menu.footerCta} />
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal visible={reveal.visible} reducedMotion={prefersReducedMotion} delay={100}>
          <div className="rounded-[24px] bg-[var(--card)] p-[18px] md:rounded-[30px] md:p-[30px]">
            <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_14px_28px_rgba(31,31,31,0.06)]">
              {content.menu.image ? (
                <CmsImage
                  src={content.menu.image}
                  alt={content.menu.imageAlt || `${content.siteName} menu`}
                  className="h-[360px] w-full bg-white object-contain md:h-[720px]"
                  sizes="(min-width: 768px) 60vw, 100vw"
                />
              ) : (
                <div className="px-6 py-10 text-center text-[15px] text-[var(--muted)]">
                  Add a menu image URL in WordPress to display the menu here.
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-4 rounded-[18px] bg-[var(--cream-soft)] px-4 py-[14px] md:hidden">
              <p className="max-w-[380px] text-[14px] font-medium text-[var(--ink)]">{content.menu.footerNote}</p>
              <Button cta={content.menu.footerCta} />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
