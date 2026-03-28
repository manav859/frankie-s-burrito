import { withBase } from '../../lib/base-path'
import type { CartResponse } from '../../features/ordering/types'
import { CartLineItems } from './CartLineItems'

export function CartSummary({
  cart,
  compact = false,
  showCheckoutButton = true,
}: {
  cart: CartResponse
  compact?: boolean
  showCheckoutButton?: boolean
}) {
  return (
    <section className="rounded-[28px] border border-[rgba(106,45,31,0.12)] bg-white p-5 shadow-[0_18px_38px_rgba(31,25,21,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brick)]">Your cart</div>
          <div className="mt-1 text-sm text-[var(--muted)]">
            {cart.item_count} {cart.item_count === 1 ? 'item' : 'items'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-[var(--muted)]">Total</div>
          <div className="text-xl font-semibold text-[var(--red)]">{cart.total.formatted}</div>
        </div>
      </div>

      {cart.items.length ? (
        <div className="mt-5 border-t border-[rgba(106,45,31,0.08)] pt-4">
          <CartLineItems items={cart.items.slice(0, compact ? cart.items.length : 3)} compact />
        </div>
      ) : (
        <div className="mt-5 rounded-[20px] bg-[var(--paper)] px-4 py-4 text-sm leading-[1.6] text-[var(--muted)]">
          Your order will show up here as soon as you add a burrito.
        </div>
      )}

      {showCheckoutButton ? (
        <a
          href={withBase(cart.item_count > 0 ? '/checkout' : '/cart')}
          className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[var(--red)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(185,49,47,0.22)]"
        >
          {cart.item_count > 0 ? 'Checkout' : 'Review cart'}
        </a>
      ) : null}
    </section>
  )
}
