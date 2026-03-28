import { useEffect, useMemo, useState } from 'react'
import { CartSummary } from '../components/ordering/CartSummary'
import { CustomizeModal } from '../components/ordering/CustomizeModal'
import { MobileCartBar } from '../components/ordering/MobileCartBar'
import { CategoryTabs } from '../components/ordering/CategoryTabs'
import { ItemCard } from '../components/ordering/MenuCard'
import { OrderEmptyState, OrderErrorState, OrderLoadingState } from '../components/ordering/OrderState'
import { getMenuItem } from '../features/ordering/api'
import type { CustomizableMenuItem } from '../features/ordering/customization'
import { useCart } from '../features/ordering/cart'
import type { AddToCartInput, MenuItemCard } from '../features/ordering/types'
import { useMenu } from '../features/ordering/useMenu'

export function MenuPage() {
  const { cart, addItem, ready: cartReady, hasApi } = useCart()
  const [selectedCategory, setSelectedCategory] = useState('')
  const [flashMessage, setFlashMessage] = useState<string | null>(null)
  const [activeItemId, setActiveItemId] = useState<number | null>(null)
  const [itemCache, setItemCache] = useState<Record<number, CustomizableMenuItem>>({})
  const [pageError, setPageError] = useState<string | null>(null)
  const { categories, loading: loadingMenu, refreshing: refreshingMenu, error, hasCachedData } = useMenu(hasApi)

  useEffect(() => {
    if (!flashMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => setFlashMessage(null), 2600)
    return () => window.clearTimeout(timeoutId)
  }, [flashMessage])

  useEffect(() => {
    if (!categories.length) {
      return
    }

    setSelectedCategory((current) => {
      if (current && categories.some((category) => category.slug === current)) {
        return current
      }

      return categories[0]?.slug || ''
    })
  }, [categories])

  useEffect(() => {
    if (!categories.length) {
      return
    }

    setItemCache((current) => {
      const next = { ...current }

      categories.forEach((category) => {
        category.items.forEach((item) => {
          if (!next[item.id]) {
            next[item.id] = item
          }
        })
      })

      return next
    })
  }, [categories])

  const selectedCategoryData = useMemo(
    () => categories.find((category) => category.slug === selectedCategory) || categories[0] || null,
    [categories, selectedCategory],
  )
  const items = selectedCategoryData?.items || []
  const activeItem = activeItemId ? itemCache[activeItemId] || items.find((item) => item.id === activeItemId) || null : null

  const prefetchItem = async (item: MenuItemCard) => {
    if (itemCache[item.id]) {
      return
    }

    setItemCache((current) => ({
      ...current,
      [item.id]: current[item.id] || item,
    }))

    try {
      const detail = await getMenuItem(item.slug)
      setItemCache((current) => ({
        ...current,
        [item.id]: detail,
      }))
    } catch {
      // Keep the card payload as the cached fallback when detail prefetch fails.
    }
  }

  const handleOpenItem = (item: MenuItemCard) => {
    setPageError(null)
    setItemCache((current) => ({
      ...current,
      [item.id]: current[item.id] || item,
    }))
    setActiveItemId(item.id)
  }

  const handleConfirmItem = async (input: AddToCartInput) => {
    try {
      await addItem(input)
      setFlashMessage(`${input.name} added to your cart.`)
      setActiveItemId(null)
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unable to add this item right now.'
      setPageError(message)
      throw caughtError
    }
  }

  if (loadingMenu && !hasCachedData) {
    return <OrderLoadingState label="Loading the menu..." />
  }

  if (error && !categories.length) {
    return <OrderErrorState message={error} />
  }

  if (!categories.length) {
    return <OrderEmptyState title="No menu available" body="We couldn't find any menu data for the storefront yet." />
  }

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1380px] flex-col gap-4 px-4 pb-28 sm:px-5 md:gap-8 md:px-6 lg:px-8 xl:px-0 xl:pb-24">
      {flashMessage ? (
        <div className="rounded-[22px] border border-[rgba(61,107,53,0.18)] bg-[rgba(61,107,53,0.08)] px-4 py-3 text-sm font-medium text-[var(--sage)]">
          {flashMessage}
        </div>
      ) : null}

      {error && categories.length ? <OrderErrorState message={error} /> : null}
      {pageError ? <OrderErrorState message={pageError} /> : null}
      {refreshingMenu && categories.length ? (
        <div className="rounded-[22px] border border-[rgba(106,45,31,0.12)] bg-[rgba(255,249,241,0.9)] px-4 py-3 text-sm text-[var(--muted)]">
          Refreshing the latest menu in the background.
        </div>
      ) : null}

      <section className="w-full space-y-3 xl:hidden">
        <div className="w-full rounded-[28px] border border-[rgba(106,45,31,0.1)] bg-[rgba(255,255,255,0.82)] px-5 py-5 text-center shadow-[0_18px_36px_rgba(31,25,21,0.05)]">
          <div className="space-y-2">
            {selectedCategoryData?.name ? <h2 className="font-western text-[28px] leading-[1.02] text-[var(--cocoa)]">{selectedCategoryData.name}</h2> : null}
            {selectedCategoryData?.description ? (
              <p className="mx-auto max-w-[34ch] text-sm leading-[1.7] text-[var(--muted)]">{selectedCategoryData.description}</p>
            ) : null}
          </div>
          <div className="mt-4 flex items-center justify-center">
            <span className="rounded-full bg-[rgba(106,45,31,0.06)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--brick)]">
              {items.length} item{items.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <div className="w-full rounded-[24px] border border-[rgba(106,45,31,0.1)] bg-[rgba(255,255,255,0.88)] p-3 shadow-[0_16px_32px_rgba(31,25,21,0.05)]">
          <CategoryTabs categories={categories} selectedCategory={selectedCategory} onSelect={setSelectedCategory} />
        </div>
      </section>

      <div className="grid min-w-0 w-full grid-cols-1 gap-5 xl:grid-cols-[220px_minmax(0,1fr)_340px] xl:gap-6">
        <aside className="hidden xl:block xl:self-start">
          <div className="rounded-[30px] border border-[rgba(106,45,31,0.12)] bg-[rgba(255,255,255,0.74)] p-4 shadow-[0_18px_36px_rgba(31,25,21,0.06)] backdrop-blur">
            <CategoryTabs categories={categories} selectedCategory={selectedCategory} onSelect={setSelectedCategory} orientation="vertical" />
          </div>
        </aside>

        <section className="min-w-0 w-full space-y-5" style={{ overflowAnchor: 'none' }}>
          <div className="hidden rounded-[30px] border border-[rgba(106,45,31,0.1)] bg-[rgba(255,255,255,0.7)] p-5 shadow-[0_18px_36px_rgba(31,25,21,0.05)] xl:block">
            <div className="space-y-2">
              {selectedCategoryData?.name ? <h2 className="font-western text-[34px] text-[var(--cocoa)]">{selectedCategoryData.name}</h2> : null}
              {selectedCategoryData?.description ? <p className="max-w-[56ch] text-sm leading-[1.7] text-[var(--muted)]">{selectedCategoryData.description}</p> : null}
            </div>
          </div>

          {!items.length ? (
            <OrderEmptyState title="Nothing here yet" body="This category does not have any available items right now." />
          ) : (
            <div className="grid min-w-0 w-full grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {items.map((item) => (
                <div key={item.id} className="w-full">
                  <ItemCard item={item} onOpenCustomize={handleOpenItem} onPrefetch={prefetchItem} />
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="hidden space-y-4 xl:block xl:self-start">
          {cartReady && cart ? <CartSummary cart={cart} /> : <OrderLoadingState label="Preparing your cart..." />}
        </aside>
      </div>

      {cart ? <MobileCartBar cart={cart} /> : null}
      <CustomizeModal item={activeItem} open={Boolean(activeItem)} onClose={() => setActiveItemId(null)} onConfirm={handleConfirmItem} />
    </div>
  )
}
