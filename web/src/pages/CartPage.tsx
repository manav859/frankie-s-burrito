import { CartLineItems } from '../components/ordering/CartLineItems'
import { CartSummary } from '../components/ordering/CartSummary'
import { OrderEmptyState, OrderErrorState, OrderLoadingState } from '../components/ordering/OrderState'
import { useCart } from '../features/ordering/cart'
import { withBase } from '../lib/base-path'

export function CartPage() {
  const { cart, error, loading, mutation, ready, updateItemQuantity, removeItem, clearAllItems, addItem } = useCart()

  if (!ready) {
    return <OrderLoadingState label="Loading your cart..." />
  }

  if (error && !cart) {
    return <OrderErrorState message={error} />
  }

  if (!cart || !cart.items.length) {
    return <OrderEmptyState title="Your cart is empty" body="Pick a burrito, add a drink, and we'll keep the checkout path short from there." />
  }

  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--orange)]">Step 1</div>
          <h1 className="font-western text-[42px] text-[var(--cocoa)]">Your Cart</h1>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <a href={withBase('/menu')} className="text-sm font-semibold text-[var(--brick)]">
            + Add more items
          </a>
          <button
            type="button"
            onClick={() => void clearAllItems()}
            className="text-sm font-semibold text-[var(--red)]"
            disabled={mutation.type === 'clear'}
          >
            {mutation.type === 'clear' ? 'Clearing...' : 'Clear cart'}
          </button>
        </div>
      </div>

      {error ? <OrderErrorState message={error} /> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-4">
          <CartLineItems
            items={cart.items}
            updatingKey={mutation.type === 'update' ? mutation.key : null}
            removingKey={mutation.type === 'remove' ? mutation.key : null}
            onQuantityChange={(key, nextQuantity) => void updateItemQuantity(key, nextQuantity)}
            onRemove={(key) => void removeItem(key)}
          />

          {cart.available_upsells.length ? (
            <section className="rounded-[28px] border border-[rgba(106,45,31,0.12)] bg-white p-5 shadow-[0_18px_38px_rgba(31,25,21,0.08)]">
              <div className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--orange)]">Complete the order</div>
              <h2 className="mt-2 font-western text-[32px] text-[var(--cocoa)]">Suggested add-ons</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {cart.available_upsells.slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-[22px] border border-[rgba(106,45,31,0.12)] bg-[var(--paper)] p-4">
                    <div className="font-semibold text-[var(--cocoa)]">{item.name}</div>
                    <div className="mt-1 text-sm text-[var(--muted)]">{item.short_description}</div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-[var(--red)]">{item.formatted_price}</div>
                      <button
                        type="button"
                        onClick={() => void addItem({ product_id: item.id, quantity: 1 })}
                        className="rounded-full bg-[var(--red)] px-4 py-2 text-sm font-semibold text-white"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
          <CartSummary cart={cart} compact />
          <div className="rounded-[28px] border border-[rgba(106,45,31,0.12)] bg-white p-5 shadow-[0_18px_38px_rgba(31,25,21,0.08)]">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between text-[var(--muted)]">
                <span>Subtotal</span>
                <span>{cart.subtotal.formatted}</span>
              </div>
              <div className="flex items-center justify-between text-[var(--muted)]">
                <span>Taxes</span>
                <span>{cart.taxes.formatted}</span>
              </div>
              <div className="flex items-center justify-between text-[var(--muted)]">
                <span>Fees</span>
                <span>{cart.fees.formatted}</span>
              </div>
              <div className="flex items-center justify-between border-t border-[rgba(106,45,31,0.08)] pt-3 text-base font-semibold text-[var(--cocoa)]">
                <span>Total</span>
                <span>{cart.total.formatted}</span>
              </div>
            </div>

            <a
              href={withBase('/checkout')}
              className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[var(--red)] px-5 py-3 text-sm font-semibold text-white"
            >
              {loading ? 'Updating...' : 'Continue to checkout'}
            </a>
          </div>
        </aside>
      </div>
    </div>
  )
}
