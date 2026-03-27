import type { RefObject } from 'react'
import { useTilt3D } from '../../lib/animations'
import type { FeaturedItem, SiteContent } from '../../types'
import { CmsImage } from '../ui/CmsImage'

export function FeaturedCard({
  item,
  menu,
  prefersReducedMotion,
}: {
  item: FeaturedItem
  menu: SiteContent['menu']
  prefersReducedMotion: boolean
}) {
  const tiltRef = useTilt3D(5, 10)

  return (
    <article
      ref={prefersReducedMotion ? undefined : (tiltRef as RefObject<HTMLElement>)}
      className={[
        'interactive-card group rounded-[24px] border p-[18px] pb-5',
        item.dark
          ? 'border-transparent bg-[var(--cocoa)] text-[var(--cream)]'
          : 'border-[var(--stroke)] bg-[var(--card)] text-[var(--ink)]',
      ].join(' ')}
    >
      <div className="overflow-hidden rounded-[20px]">
        <CmsImage
          src={item.image}
          media={item.imageMedia}
          alt={item.imageAlt || item.name}
          className="image-zoom h-60 w-full rounded-[20px] object-cover"
          sizes="(min-width: 768px) 33vw, 100vw"
        />
      </div>
      <h3 className="mt-[18px] text-[22px] font-semibold leading-[1.1] md:text-[26px]">{item.name}</h3>
      <p className={['mt-1.5 text-[15px] leading-[1.55]', item.dark ? 'text-[var(--cream-dim)]' : 'text-[var(--muted)]'].join(' ')}>
        {item.description}
      </p>
      <div className={['mt-2.5 text-[18px] font-semibold md:text-[22px]', item.dark ? 'text-[var(--gold)]' : 'text-[var(--red)]'].join(' ')}>
        {item.price}
      </div>
      <a
        href={item.orderUrl || '#location'}
        className="mt-2.5 flex items-center justify-between rounded-[18px] bg-[var(--cream-soft)] px-[18px] py-4 text-[15px] font-semibold text-[var(--red)] transition duration-300 group-hover:bg-white"
      >
        <span>{menu.itemCtaLabel || 'Order this burrito'}</span>
        <span aria-hidden="true" className="inline-block transition-transform duration-300 group-hover:translate-x-1">
          +
        </span>
      </a>
    </article>
  )
}
