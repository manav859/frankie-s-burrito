import { useEffect, useMemo, useState } from 'react'
import { CartSummary } from '../components/ordering/CartSummary'
import { MobileCartBar } from '../components/ordering/MobileCartBar'
import { CategoryTabs } from '../components/ordering/CategoryTabs'
import { MenuCard } from '../components/ordering/MenuCard'
import { OrderEmptyState, OrderErrorState, OrderLoadingState } from '../components/ordering/OrderState'
import { CmsImage } from '../components/ui/CmsImage'
import { useCart } from '../features/ordering/cart'
import { FrankiesHeadlessError, getMenuBootstrap, getMenuItems } from '../features/ordering/api'
import type { MenuBootstrap, MenuItemCard } from '../features/ordering/types'
import { withBase } from '../lib/base-path'

export function MenuPage() {
  const { cart, addItem, ready: cartReady, hasApi } = useCart()
  const [bootstrap, setBootstrap] = useState<MenuBootstrap | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [items, setItems] = useState<MenuItemCard[]>([])
  const [loadingBootstrap, setLoadingBootstrap] = useState(true)
  const [loadingItems, setLoadingItems] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [flashMessage, setFlashMessage] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const loadBootstrap = async () => {
      setLoadingBootstrap(true)
      setError(null)

      try {
        const response = await getMenuBootstrap(controller.signal)
        setBootstrap(response)
        setSelectedCategory(response.meta.initial_category || response.categories[0]?.slug || '')
        setItems(response.initial_items)
      } catch (caughtError) {
        if (controller.signal.aborted) {
          return
        }

        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load the menu.')
      } finally {
        if (!controller.signal.aborted) {
          setLoadingBootstrap(false)
        }
      }
    }

    if (hasApi) {
      void loadBootstrap()
    } else {
      setLoadingBootstrap(false)
      setError('The ordering API is not configured in this environment yet.')
    }

    return () => controller.abort()
  }, [hasApi])

  useEffect(() => {
    if (!selectedCategory || !bootstrap) {
      return
    }

    if (selectedCategory === bootstrap.meta.initial_category && bootstrap.initial_items.length) {
      setItems(bootstrap.initial_items)
      return
    }

    const controller = new AbortController()

    const loadItems = async () => {
      setLoadingItems(true)

      try {
        const response = await getMenuItems({ category: selectedCategory, availability: 'available', limit: 24 }, controller.signal)
        setItems(response.items)
        setError(null)
      } catch (caughtError) {
        if (controller.signal.aborted) {
          return
        }

        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load this category.')
      } finally {
        if (!controller.signal.aborted) {
          setLoadingItems(false)
        }
      }
    }

    void loadItems()

    return () => controller.abort()
  }, [bootstrap, selectedCategory])

  useEffect(() => {
    if (!flashMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => setFlashMessage(null), 2600)
    return () => window.clearTimeout(timeoutId)
  }, [flashMessage])

  const selectedCategoryData = useMemo(
    () => bootstrap?.categories.find((category) => category.slug === selectedCategory) || bootstrap?.categories[0] || null,
    [bootstrap, selectedCategory],
  )
  const featuredItems = bootstrap?.featured.slice(0, 3) || []

  const handleQuickAdd = async (item: MenuItemCard) => {
    try {
      await addItem({ product_id: item.id, quantity: 1 })
      setFlashMessage(`${item.name} added to your cart.`)
    } catch (caughtError) {
      const message =
        caughtError instanceof FrankiesHeadlessError ? caughtError.message : 'Unable to add this item right now.'
      setError(message)
    }
  }

  if (loadingBootstrap && !bootstrap) {
    return <OrderLoadingState label="Loading the menu..." />
  }

  if (error && !bootstrap) {
    return <OrderErrorState message={error} />
  }

  if (!bootstrap) {
    return <OrderEmptyState title="No menu available" body="We couldn't find any menu data for the storefront yet." />
  }

  return (
    <div className="mx-auto max-w-[1380px] space-y-6 md:space-y-8">
      <section className="overflow-hidden rounded-[34px] border border-[rgba(106,45,31,0.12)] bg-[var(--card)] shadow-[0_24px_52px_rgba(31,25,21,0.08)]">
        <div className="border-b border-[rgba(106,45,31,0.08)] bg-[rgba(255,255,255,0.56)] px-5 py-4 md:px-8">
          <CategoryTabs categories={bootstrap.categories} selectedCategory={selectedCategory} onSelect={setSelectedCategory} />
        </div>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
          <div className="space-y-5 px-5 py-6 md:px-8 md:py-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(217,162,27,0.14)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brick)]">
              Frankie's order counter
            </div>
            <div className="space-y-4">
              <h1 className="font-western text-[40px] leading-[0.92] text-[var(--cocoa)] md:text-[58px]">
                {selectedCategoryData?.name || bootstrap.meta.menu_title}
              </h1>
              <p className="max-w-[58ch] text-[15px] leading-[1.8] text-[var(--muted)] md:text-[16px]">
                Big burrito energy, quick pickup, and warm griddle-made breakfast built around the category you're craving right now.
              </p>
            </div>

            {featuredItems.length ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {featuredItems.map((item) => (
                  <a
                    key={item.id}
                    href={withBase(`/menu/${item.slug}`)}
                    className="rounded-[22px] border border-[rgba(106,45,31,0.1)] bg-white px-4 py-4 text-left shadow-[0_12px_24px_rgba(31,25,21,0.06)]"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--orange)]">
                      {item.badge || 'featured'}
                    </div>
                    <div className="mt-2 font-western text-[21px] leading-[1.05] text-[var(--cocoa)]">{item.name}</div>
                    <div className="mt-2 text-sm text-[var(--muted)]">{item.formatted_price}</div>
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative min-h-[260px] bg-[var(--paper)]">
            {selectedCategoryData?.image ? (
              <>
                <CmsImage
                  src={selectedCategoryData.image}
                  media={selectedCategoryData.image_data}
                  alt={selectedCategoryData.image_alt || selectedCategoryData.name}
                  className="h-full min-h-[260px] w-full object-cover"
                  sizes="(min-width: 1024px) 38vw, 100vw"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(31,25,21,0.48)] via-[rgba(31,25,21,0.08)] to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                  <div className="inline-flex rounded-full bg-[rgba(255,248,239,0.92)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brick)]">
                    {selectedCategoryData.count} items on the griddle
                  </div>
                </div>
              </>
            ) : (
              <div className="flex min-h-[260px] items-center justify-center px-8 text-center text-sm text-[var(--muted)]">
                Choose a category to start building your order.
              </div>
            )}
          </div>
        </div>
      </section>

      {flashMessage ? (
        <div className="rounded-[22px] border border-[rgba(61,107,53,0.18)] bg-[rgba(61,107,53,0.08)] px-4 py-3 text-sm font-medium text-[var(--sage)]">
          {flashMessage}
        </div>
      ) : null}

      {error && bootstrap ? <OrderErrorState message={error} /> : null}

      <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)_340px]">
        <aside className="hidden xl:block xl:sticky xl:top-32 xl:self-start">
          <div className="rounded-[30px] border border-[rgba(106,45,31,0.12)] bg-[rgba(255,255,255,0.74)] p-4 shadow-[0_18px_36px_rgba(31,25,21,0.06)] backdrop-blur">
            <div className="px-2 pb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brick)]">Categories</div>
            <CategoryTabs categories={bootstrap.categories} selectedCategory={selectedCategory} onSelect={setSelectedCategory} orientation="vertical" />
          </div>
        </aside>

        <section className="space-y-5">
          <div className="rounded-[30px] border border-[rgba(106,45,31,0.1)] bg-[rgba(255,255,255,0.7)] p-5 shadow-[0_18px_36px_rgba(31,25,21,0.05)]">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--brick)]">Category</div>
                <h2 className="font-western text-[34px] text-[var(--cocoa)]">{selectedCategoryData?.name || 'Menu'}</h2>
              </div>
              {loadingItems ? <div className="text-sm text-[var(--muted)]">Refreshing items...</div> : null}
            </div>
            {selectedCategoryData?.description ? (
              <p className="mt-3 max-w-[60ch] text-sm leading-[1.7] text-[var(--muted)]">{selectedCategoryData.description}</p>
            ) : null}
          </div>

          {!loadingItems && !items.length ? (
            <OrderEmptyState title="Nothing here yet" body="This category does not have any available items right now." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {items.map((item) => (
                <MenuCard key={item.id} item={item} onQuickAdd={handleQuickAdd} />
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4 xl:sticky xl:top-32 xl:self-start">
          {cartReady && cart ? (
            <>
              <div className="hidden xl:block rounded-[30px] bg-[var(--footer)] px-5 py-4 text-[var(--cream)] shadow-[0_18px_36px_rgba(31,25,21,0.14)]">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgba(255,248,239,0.72)]">Counter status</div>
                <div className="mt-2 font-western text-[30px] text-white">Fast pickup</div>
                <div className="mt-2 text-sm leading-[1.7] text-[rgba(255,248,239,0.82)]">
                  Your cart stays visible while you browse so checkout is always one step away.
                </div>
              </div>
              <CartSummary cart={cart} />
            </>
          ) : (
            <OrderLoadingState label="Preparing your cart..." />
          )}
        </aside>
      </div>

      {cart ? <MobileCartBar cart={cart} /> : null}
    </div>
  )
}
