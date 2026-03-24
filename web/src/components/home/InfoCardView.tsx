import type { RefObject } from 'react'
import { useTilt3D } from '../../lib/animations'
import type { InfoCard } from '../../types'

export function InfoCardView({
  item,
  prefersReducedMotion,
}: {
  item: InfoCard
  prefersReducedMotion: boolean
}) {
  const tiltRef = useTilt3D(4, 8)

  return (
    <article
      ref={prefersReducedMotion ? undefined : (tiltRef as RefObject<HTMLElement>)}
      className="interactive-card leather-stitch rounded-[24px] bg-white p-5 text-[var(--ink)]"
    >
      {item.number ? <div className="text-sm font-semibold text-[var(--orange)]">{item.number}</div> : null}
      <h3 className="mt-1 text-xl font-semibold leading-[1.2] md:text-2xl">{item.title}</h3>
      <p className="mt-1.5 text-[15px] leading-[1.6] text-[var(--muted)]">{item.body}</p>
      {item.source ? <p className="mt-2 text-sm font-medium text-[var(--brick)]">{item.source}</p> : null}
    </article>
  )
}
