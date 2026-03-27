import { withBase } from '../../lib/base-path'
import type { MenuItemCard } from '../../features/ordering/types'
import { CmsImage } from '../ui/CmsImage'

export function MenuCard({
  item,
  onQuickAdd,
}: {
  item: MenuItemCard
  onQuickAdd?: (item: MenuItemCard) => void
}) {
  const badgeTone =
    item.badge.toLowerCase() === 'popular'
      ? 'bg-[rgba(217,162,27,0.18)] text-[var(--brick)]'
      : item.badge.toLowerCase() === 'featured'
        ? 'bg-[rgba(185,49,47,0.12)] text-[var(--red)]'
        : 'bg-[rgba(61,107,53,0.12)] text-[var(--sage)]'

  return (
    <article className="group overflow-hidden rounded-[26px] border border-[rgba(106,45,31,0.12)] bg-[var(--card)] shadow-[0_18px_34px_rgba(31,25,21,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_44px_rgba(31,25,21,0.12)]">
      <a href={withBase(`/menu/${item.slug}`)} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--paper)]">
          {item.image ? (
            <CmsImage
              src={item.image}
              media={item.image_data}
              alt={item.image_alt || item.name}
              className="image-zoom h-full w-full object-cover"
              sizes="(min-width: 1536px) 20vw, (min-width: 768px) 33vw, 100vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">No image yet</div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[rgba(31,25,21,0.18)] to-transparent" />
          {item.badge ? (
            <div className="absolute left-4 top-4">
              <span className={['rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]', badgeTone].join(' ')}>
                {item.badge}
              </span>
            </div>
          ) : null}
        </div>
      </a>

      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-western text-[22px] leading-[1.05] text-[var(--cocoa)] md:text-[24px]">{item.name}</div>
            <p className="mt-2 min-h-[44px] text-sm leading-[1.6] text-[var(--muted)]">{item.short_description || 'Fresh off the griddle and ready to order.'}</p>
          </div>
          <div className="shrink-0 rounded-full bg-[rgba(185,49,47,0.08)] px-3 py-1.5 text-base font-semibold text-[var(--red)]">
            {item.formatted_price}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[rgba(61,107,53,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--sage)]">
              {item.fulfillment_mode}
            </span>
            {item.availability !== 'available' ? (
              <span className="rounded-full bg-[rgba(106,45,31,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--brick)]">
                unavailable
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <a
              href={withBase(`/menu/${item.slug}`)}
              className="inline-flex items-center justify-center rounded-full border border-[rgba(106,45,31,0.14)] px-4 py-2 text-sm font-semibold text-[var(--brick)]"
            >
              Details
            </a>
            <button
              type="button"
              onClick={() => onQuickAdd?.(item)}
              disabled={item.availability !== 'available'}
              className="inline-flex items-center justify-center rounded-full bg-[var(--red)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(185,49,47,0.2)] disabled:cursor-not-allowed disabled:bg-[rgba(185,49,47,0.45)]"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
