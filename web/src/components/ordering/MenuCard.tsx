import { moneyFromRaw } from '../../features/ordering/helpers'
import type { MenuItemCard } from '../../features/ordering/types'
import { CmsImage } from '../ui/CmsImage'

export function ItemCard({
  item,
  onOpenCustomize,
  onPrefetch,
}: {
  item: MenuItemCard
  onOpenCustomize?: (item: MenuItemCard) => void
  onPrefetch?: (item: MenuItemCard) => void
}) {
  const needsCustomization = item.add_on_groups.length > 0 || item.allergens_enabled
  const isAvailable = item.availability === 'available'
  const basePrice = moneyFromRaw(item.base_price)
  const customizationPills = [
    item.add_on_groups.length ? `${item.add_on_groups.length} add-on ${item.add_on_groups.length === 1 ? 'group' : 'groups'}` : '',
    item.allergens_enabled ? 'allergy notes' : '',
  ].filter(Boolean)
  const badgeTone =
    item.badge.toLowerCase() === 'popular'
      ? 'bg-[rgba(217,162,27,0.18)] text-[var(--brick)]'
      : item.badge.toLowerCase() === 'featured'
        ? 'bg-[rgba(185,49,47,0.12)] text-[var(--red)]'
        : 'bg-[rgba(61,107,53,0.12)] text-[var(--sage)]'

  return (
    <article
      role={isAvailable ? 'button' : undefined}
      tabIndex={isAvailable ? 0 : undefined}
      onClick={() => {
        if (isAvailable) {
          onOpenCustomize?.(item)
        }
      }}
      onMouseEnter={() => onPrefetch?.(item)}
      onTouchStart={() => onPrefetch?.(item)}
      onFocus={() => onPrefetch?.(item)}
      onKeyDown={(event) => {
        if (!isAvailable) {
          return
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpenCustomize?.(item)
        }
      }}
      className="group w-full min-w-0 max-w-full overflow-hidden rounded-[24px] border border-[rgba(106,45,31,0.12)] bg-[var(--card)] shadow-[0_18px_34px_rgba(31,25,21,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_44px_rgba(31,25,21,0.12)]"
    >
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

      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="break-words font-western text-[20px] leading-[1.05] text-[var(--cocoa)] transition group-hover:text-[var(--red)] sm:text-[22px] md:text-[24px]">
              {item.name}
            </div>
            {item.short_description ? <p className="mt-2 text-sm leading-[1.6] text-[var(--muted)]">{item.short_description}</p> : null}
          </div>
          {basePrice.formatted ? (
            <div className="self-start shrink-0 rounded-full bg-[rgba(185,49,47,0.08)] px-3 py-1.5 text-sm font-semibold text-[var(--red)] sm:text-base">
              {basePrice.formatted}
            </div>
          ) : null}
        </div>

        {customizationPills.length ? (
          <div className="flex flex-wrap gap-2">
            {customizationPills.map((pill) => (
              <span
                key={pill}
                className="rounded-full border border-[rgba(106,45,31,0.12)] bg-[var(--paper)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--brick)]"
              >
                {pill}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onOpenCustomize?.(item)
            }}
            disabled={!isAvailable}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--red)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(185,49,47,0.2)] disabled:cursor-not-allowed disabled:bg-[rgba(185,49,47,0.45)] sm:w-auto"
          >
            {needsCustomization ? 'Customize' : 'Add to cart'}
          </button>
        </div>
      </div>
    </article>
  )
}

export { ItemCard as MenuCard }
