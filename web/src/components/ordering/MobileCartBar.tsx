import { withBase } from '../../lib/base-path'
import type { CartResponse } from '../../features/ordering/types'

export function MobileCartBar({ cart, href = '/cart' }: { cart: CartResponse; href?: string }) {
  if (!cart.item_count) {
    return null
  }

  return (
    <a
      href={withBase(href)}
      className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-between rounded-full bg-[var(--red)] px-5 py-4 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(185,49,47,0.34)] xl:hidden"
    >
      <span className="flex items-center gap-3">
        <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white/20 px-2 text-xs font-bold">
          {cart.item_count}
        </span>
        <span>View cart</span>
      </span>
      <span>{cart.total.formatted}</span>
    </a>
  )
}
