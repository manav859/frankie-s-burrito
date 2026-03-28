import { useEffect, useMemo, useState } from 'react'
import { OrderEmptyState, OrderErrorState, OrderLoadingState } from '../components/ordering/OrderState'
import { getOrderConfirmation } from '../features/ordering/api'
import type { OrderConfirmation } from '../features/ordering/types'
import { getCurrentSearchParams } from '../lib/navigation'
import { withBase } from '../lib/base-path'

const ORDER_CONFIRMATION_CACHE_KEY = 'frankies-last-order-confirmation:v1'

export function OrderSuccessPage() {
  const [confirmation, setConfirmation] = useState<OrderConfirmation | null>(readCachedConfirmation())
  const [loading, setLoading] = useState(!confirmation)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = getCurrentSearchParams()
    const orderId = params.get('order_id') || ''
    const orderKey = params.get('key') || ''
    const cached = readCachedConfirmation()

    if (!orderId || !orderKey) {
      if (cached) {
        setConfirmation(cached)
        setLoading(false)
        setError(null)
        return
      }

      setLoading(false)
      setError('Missing order confirmation details.')
      return
    }

    if (cached && String(cached.order_id) === orderId) {
      setConfirmation(cached)
      setLoading(false)
      return
    }

    const controller = new AbortController()

    const loadConfirmation = async () => {
      setLoading(true)

      try {
        const response = await getOrderConfirmation(orderId, orderKey, controller.signal)
        setConfirmation(response)
        try {
          window.sessionStorage.setItem(ORDER_CONFIRMATION_CACHE_KEY, JSON.stringify(response))
        } catch {
          // Ignore session storage issues for confirmation caching.
        }
        setError(null)
      } catch (caughtError) {
        if (controller.signal.aborted) {
          return
        }

        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load your order confirmation.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadConfirmation()
    return () => controller.abort()
  }, [])

  const paymentAction = useMemo(
    () => confirmation?.next_actions.find((action) => action.type === 'payment' && action.url) || null,
    [confirmation],
  )

  if (loading) {
    return <OrderLoadingState label="Loading your order confirmation..." />
  }

  if (error && !confirmation) {
    return <OrderErrorState message={error} />
  }

  if (!confirmation) {
    return (
      <OrderEmptyState
        title="No confirmation found"
        body="We couldn't find an order confirmation for this visit. If you just placed an order, try returning from the checkout flow."
      />
    )
  }

  return (
    <div className="w-full xl:mx-auto xl:max-w-[920px]">
      <section className="relative overflow-hidden rounded-[36px] border border-[rgba(106,45,31,0.12)] bg-white p-6 shadow-[0_24px_52px_rgba(31,25,21,0.08)] md:p-8 lg:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(217,162,27,0.12),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(185,49,47,0.08),_transparent_34%)]" />

        <div className="relative text-center">
          <div className="mx-auto flex h-[220px] w-[220px] items-center justify-center rounded-full bg-[radial-gradient(circle,_rgba(255,225,98,0.92),_rgba(255,209,73,0.94))] shadow-[0_18px_36px_rgba(217,162,27,0.24)]">
            <div className="text-center">
              <div className="font-western text-[32px] leading-[1] text-[var(--red)]">Ay Caramba!</div>
              <div className="mt-3 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--brick)]">Order confirmed</div>
            </div>
          </div>

          <h1 className="mt-6 font-western text-[44px] leading-[0.94] text-[var(--red)] md:text-[54px]">Order Confirmed</h1>
          <p className="mx-auto mt-3 max-w-[40ch] text-[17px] leading-[1.7] text-[var(--muted)]">
            Your order is in and the Frankie&apos;s line is moving. We&apos;ll keep the handoff fast and the burrito hot.
          </p>
        </div>

        <div className="relative mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <section className="rounded-[28px] border border-[rgba(106,45,31,0.12)] bg-[var(--paper)] p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailRow label="Order number" value={`#${confirmation.order_number}`} />
                <DetailRow label="Payment status" value={capitalizeWord(confirmation.payment_status)} />
                <DetailRow label="Fulfillment" value={capitalizeWord(confirmation.fulfillment_type)} />
                <DetailRow label="Order status" value={capitalizeWord(confirmation.status)} />
                <DetailRow label="Ready around" value={formatReadyTime(confirmation.estimated_ready_time)} highlight />
                {confirmation.delivery_method ? <DetailRow label="Delivery method" value={confirmation.delivery_method} /> : null}
              </div>
            </section>

            <section className="rounded-[28px] border border-[rgba(106,45,31,0.12)] bg-white p-5 shadow-[0_14px_28px_rgba(31,25,21,0.05)]">
              <div className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--orange)]">Item summary</div>
              <h2 className="mt-2 font-western text-[32px] text-[var(--cocoa)]">What&apos;s on the order</h2>
              <div className="mt-5 space-y-3">
                {confirmation.item_summary.length ? (
                  confirmation.item_summary.map((item) => (
                    <div key={`${item.name}-${item.quantity}`} className="rounded-[22px] border border-[rgba(106,45,31,0.1)] bg-[var(--paper)] px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-[var(--cocoa)]">
                            {item.quantity} x {item.name}
                          </div>
                          {item.summary_lines.length ? (
                            <div className="mt-2 space-y-1 text-sm text-[var(--muted)]">
                              {item.summary_lines.map((line) => (
                                <div key={line}>{line}</div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className="text-right text-sm font-semibold text-[var(--brick)]">{item.total.formatted}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[22px] bg-[var(--paper)] px-4 py-4 text-sm text-[var(--muted)]">
                    The order summary is not available yet, but the confirmation details above are valid.
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
            <section className="rounded-[28px] border border-[rgba(106,45,31,0.12)] bg-white p-5 shadow-[0_18px_38px_rgba(31,25,21,0.08)]">
              <div className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brick)]">Payment summary</div>
              <div className="mt-4 space-y-3 text-sm">
                <MoneyRow label="Subtotal" value={confirmation.subtotal.formatted} />
                <MoneyRow label="Taxes" value={confirmation.taxes.formatted} />
                <MoneyRow label="Fees" value={confirmation.fees.formatted} />
                <MoneyRow label="Total" value={confirmation.total.formatted} strong />
              </div>
            </section>

            <section className="rounded-[28px] bg-[var(--footer)] px-5 py-5 text-[var(--cream)] shadow-[0_18px_36px_rgba(31,25,21,0.14)]">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgba(255,248,239,0.72)]">Next steps</div>
              <div className="mt-2 font-western text-[30px] text-white">
                {paymentAction ? 'Finish payment' : 'Back to the menu'}
              </div>
              <p className="mt-2 text-sm leading-[1.7] text-[rgba(255,248,239,0.82)]">
                {paymentAction
                  ? 'Your order is created. Complete the remaining payment step below when required.'
                  : 'Jump back in for another burrito, drink, or side whenever you are ready.'}
              </p>

              <div className="mt-5 grid gap-3">
                {paymentAction?.url ? (
                  <a
                    href={paymentAction.url}
                    className="inline-flex w-full items-center justify-center rounded-full bg-[var(--red)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(185,49,47,0.22)]"
                  >
                    Complete payment
                  </a>
                ) : null}
                <a
                  href={withBase('/menu')}
                  className={[
                    'inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold',
                    paymentAction
                      ? 'border border-[rgba(255,248,239,0.32)] text-white'
                      : 'bg-[var(--red)] text-white shadow-[0_12px_24px_rgba(185,49,47,0.22)]',
                  ].join(' ')}
                >
                  Back to Menu
                </a>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </div>
  )
}

function DetailRow({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{label}</div>
      <div className={['mt-1 text-base font-semibold', highlight ? 'text-[var(--red)]' : 'text-[var(--cocoa)]'].join(' ')}>
        {value}
      </div>
    </div>
  )
}

function MoneyRow({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div
      className={[
        'flex items-center justify-between',
        strong ? 'border-t border-[rgba(106,45,31,0.08)] pt-3 text-base font-semibold text-[var(--cocoa)]' : 'text-[var(--muted)]',
      ].join(' ')}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function formatReadyTime(value: string) {
  if (!value) {
    return 'TBD'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString([], { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' })
}

function capitalizeWord(value: string) {
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

function readCachedConfirmation() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.sessionStorage.getItem(ORDER_CONFIRMATION_CACHE_KEY)
    return raw ? (JSON.parse(raw) as OrderConfirmation) : null
  } catch {
    return null
  }
}
