import { QuantityControl } from './QuantityControl'
import type { CartItem } from '../../features/ordering/types'
import { CmsImage } from '../ui/CmsImage'

export function CartLineItems({
  items,
  updatingKey,
  removingKey,
  onQuantityChange,
  onRemove,
  compact = false,
}: {
  items: CartItem[]
  updatingKey?: string | null
  removingKey?: string | null
  onQuantityChange?: (key: string, quantity: number) => void
  onRemove?: (key: string) => void
  compact?: boolean
}) {
  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {items.map((item) => {
        const pendingUpdate = updatingKey === item.key
        const pendingRemove = removingKey === item.key

        return (
          <article
            key={item.key}
            className={[
              'rounded-[24px] border border-[rgba(106,45,31,0.12)] bg-white shadow-[0_14px_28px_rgba(31,25,21,0.06)]',
              compact ? 'p-4' : 'p-5',
              pendingRemove ? 'opacity-60' : '',
            ].join(' ')}
          >
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[18px] bg-[var(--paper)]">
                {item.image ? <CmsImage src={item.image} media={item.image_data} alt={item.name} className="h-full w-full object-cover" sizes="96px" /> : null}
              </div>

              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-western text-[24px] text-[var(--cocoa)]">{item.name}</h3>
                    {item.summary_lines.length ? (
                      <div className="mt-2 space-y-1 text-sm text-[var(--muted)]">
                        {item.summary_lines.map((line) => (
                          <div key={line}>{line}</div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Line total</div>
                    <div className="mt-1 text-base font-semibold text-[var(--red)]">{item.line_total.formatted}</div>
                  </div>
                </div>

                {(onQuantityChange || onRemove) ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {onQuantityChange ? (
                      <div className="flex items-center gap-3">
                        <QuantityControl value={item.quantity} onChange={(quantity) => onQuantityChange(item.key, quantity)} />
                        {pendingUpdate ? <span className="text-xs text-[var(--muted)]">Updating...</span> : null}
                      </div>
                    ) : (
                      <div className="text-sm text-[var(--muted)]">Qty {item.quantity}</div>
                    )}

                    {onRemove ? (
                      <button
                        type="button"
                        onClick={() => onRemove(item.key)}
                        className="text-sm font-semibold text-[var(--red)]"
                        disabled={pendingRemove}
                      >
                        {pendingRemove ? 'Removing...' : 'Remove'}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
