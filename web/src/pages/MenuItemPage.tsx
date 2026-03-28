import { useEffect, useMemo, useState } from 'react'
import { CartSummary } from '../components/ordering/CartSummary'
import { QuantityControl } from '../components/ordering/QuantityControl'
import { OrderEmptyState, OrderErrorState, OrderLoadingState } from '../components/ordering/OrderState'
import { useCart } from '../features/ordering/cart'
import { FrankiesHeadlessError, getMenuItem } from '../features/ordering/api'
import { moneyFromRaw } from '../features/ordering/helpers'
import type { MenuAddonGroup, MenuItemCard, MenuItemDetail } from '../features/ordering/types'
import { withBase } from '../lib/base-path'
import { CmsImage } from '../components/ui/CmsImage'

export function MenuItemPage({ slug }: { slug: string }) {
  const { addItem, cart } = useCart()
  const [item, setItem] = useState<MenuItemDetail | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [selectedSpiceLevel, setSelectedSpiceLevel] = useState('')
  const [selectedAddons, setSelectedAddons] = useState<Record<string, string[]>>({})
  const [allergiesNote, setAllergiesNote] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [flashMessage, setFlashMessage] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const loadItem = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await getMenuItem(slug, controller.signal)
        setItem(response)
        setQuantity(1)
        setSelectedSpiceLevel(response.spice_options[0]?.key || '')
        setSelectedAddons(Object.fromEntries(response.addon_groups.map((group) => [group.key, []])) as Record<string, string[]>)
        setAllergiesNote('')
        setValidationError(null)
      } catch (caughtError) {
        if (controller.signal.aborted) {
          return
        }

        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load this menu item.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadItem()
    return () => controller.abort()
  }, [slug])

  useEffect(() => {
    if (!flashMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => setFlashMessage(null), 2800)
    return () => window.clearTimeout(timeoutId)
  }, [flashMessage])

  const heroImage = useMemo(() => item?.gallery[0] || item?.image || '', [item])
  const heroImageMedia = useMemo(() => item?.gallery_data?.[0] || item?.image_data, [item])
  const selectedSummary = useMemo(() => {
    if (!item) {
      return []
    }

    const lines: string[] = []
    const spice = item.spice_options.find((option) => option.key === selectedSpiceLevel)
    if (spice) {
      lines.push(`Spice: ${spice.label}`)
    }

    for (const group of item.addon_groups) {
      const active = selectedAddons[group.key] || []
      if (!active.length) {
        continue
      }

      const labels = group.options
        .filter((option) => active.includes(option.key))
        .map((option) => option.label)

      if (labels.length) {
        lines.push(`${group.label}: ${labels.join(', ')}`)
      }
    }

    return lines
  }, [item, selectedAddons, selectedSpiceLevel])

  const toggleAddon = (group: MenuAddonGroup, optionKey: string) => {
    setValidationError(null)

    setSelectedAddons((current) => {
      const activeOptions = current[group.key] || []
      const alreadySelected = activeOptions.includes(optionKey)

      if (group.type === 'single') {
        return {
          ...current,
          [group.key]: alreadySelected ? [] : [optionKey],
        }
      }

      if (alreadySelected) {
        return {
          ...current,
          [group.key]: activeOptions.filter((entry) => entry !== optionKey),
        }
      }

      if (group.max > 0 && activeOptions.length >= group.max) {
        return current
      }

      return {
        ...current,
        [group.key]: [...activeOptions, optionKey],
      }
    })
  }

  const validateSelections = () => {
    if (!item) {
      return false
    }

    for (const group of item.addon_groups) {
      const activeCount = (selectedAddons[group.key] || []).length
      const minimumRequired = Math.max(group.min, group.required ? 1 : 0)

      if (minimumRequired > 0 && activeCount < minimumRequired) {
        setValidationError(`Choose at least ${minimumRequired} option${minimumRequired === 1 ? '' : 's'} for ${group.label}.`)
        return false
      }

      if (group.max > 0 && activeCount > group.max) {
        setValidationError(`Choose no more than ${group.max} option${group.max === 1 ? '' : 's'} for ${group.label}.`)
        return false
      }
    }

    setValidationError(null)
    return true
  }

  const handleAddToCart = async () => {
    if (!item || !validateSelections()) {
      return
    }

    const selectedSpice = item.spice_options.find((option) => option.key === selectedSpiceLevel)

    setSubmitting(true)
    setError(null)

    try {
      await addItem({
        product_id: item.id,
        slug: item.slug,
        name: item.name,
        image: item.image,
        image_data: item.image_data,
        base_price: moneyFromRaw(item.base_price),
        quantity,
        fulfillment_mode: item.fulfillment_mode,
        spice_level: selectedSpice
          ? {
              key: selectedSpice.key,
              label: selectedSpice.label,
              price_adjustment: moneyFromRaw(
                typeof selectedSpice.price_adjustment === 'object'
                  ? selectedSpice.price_adjustment.raw
                  : selectedSpice.price_adjustment || 0,
              ),
            }
          : null,
        selected_add_ons: Object.entries(selectedAddons).flatMap(([groupId, optionIds]) =>
          optionIds.map((optionId) => {
            const option = item.addon_groups
              .find((group) => group.key === groupId)
              ?.options.find((entry) => entry.key === optionId)

            return {
              group_id: groupId,
              option_id: optionId,
              name: option?.label || optionId,
              price: option?.price_adjustment || moneyFromRaw(0),
            }
          }),
        ),
        allergies_note: item.allergens_enabled ? allergiesNote.trim() || undefined : undefined,
      })
      setFlashMessage(`${item.name} added to your cart.`)
    } catch (caughtError) {
      const message =
        caughtError instanceof FrankiesHeadlessError ? caughtError.message : 'Unable to add this item to your cart.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <OrderLoadingState label="Loading item details..." />
  }

  if (error && !item) {
    return <OrderErrorState message={error} />
  }

  if (!item) {
    return <OrderEmptyState title="Item unavailable" body="We couldn't find that menu item." />
  }

  const cartCount = cart?.item_count || 0
  const maxReachedByGroup = (group: MenuAddonGroup) => group.max > 0 && (selectedAddons[group.key] || []).length >= group.max

  return (
    <div className="lg:fixed lg:inset-0 lg:z-40 lg:bg-[rgba(31,25,21,0.62)] lg:px-6 lg:py-8 lg:backdrop-blur-[2px]">
      <div className="mx-auto max-w-[1180px] space-y-4 lg:flex lg:h-full lg:max-w-[1240px] lg:items-center lg:justify-center lg:space-y-0">
        <div className="hidden lg:block lg:absolute lg:inset-0">
          <a href={withBase('/menu')} aria-label="Close item details" className="block h-full w-full" />
        </div>

        <div className="relative w-full overflow-hidden rounded-[34px] border border-[rgba(106,45,31,0.12)] bg-[var(--card)] shadow-[0_24px_52px_rgba(31,25,21,0.2)] lg:max-h-[92vh] lg:max-w-[980px]">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[rgba(106,45,31,0.08)] bg-[rgba(255,249,241,0.94)] px-5 py-4 backdrop-blur lg:px-7">
            <a href={withBase('/menu')} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brick)]">
              <span aria-hidden="true">&lt;-</span>
              Back to menu
            </a>
            <div className="font-western text-[24px] text-[var(--cocoa)] lg:hidden">Item Details</div>
            <a
              href={withBase('/menu')}
              aria-label="Close"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(106,45,31,0.12)] bg-white text-[var(--brick)]"
            >
              x
            </a>
          </div>

          {flashMessage ? (
            <div className="border-b border-[rgba(61,107,53,0.18)] bg-[rgba(61,107,53,0.08)] px-5 py-3 text-sm font-medium text-[var(--sage)] lg:px-7">
              {flashMessage}
            </div>
          ) : null}

          {error ? (
            <div className="px-5 pt-4 lg:px-7">
              <OrderErrorState message={error} />
            </div>
          ) : null}

          <div className="lg:grid lg:max-h-[calc(92vh-148px)] lg:grid-cols-[minmax(360px,0.92fr)_minmax(0,1.08fr)]">
            <div className="space-y-4 p-5 pb-24 lg:overflow-y-auto lg:border-r lg:border-[rgba(106,45,31,0.08)] lg:p-7 lg:pb-7">
              <div className="relative overflow-hidden rounded-[28px] bg-[var(--paper)]">
                {heroImage ? (
                  <CmsImage
                    src={heroImage}
                    media={heroImageMedia}
                    alt={item.image_alt || item.name}
                    className="aspect-[4/3] w-full object-cover lg:aspect-[5/6]"
                    sizes="(min-width: 1024px) 38vw, 100vw"
                    priority
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center text-sm text-[var(--muted)] lg:aspect-[5/6]">No image yet</div>
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[rgba(31,25,21,0.28)] to-transparent" />
                {item.badge ? (
                  <div className="absolute left-4 top-4 rounded-full bg-[rgba(255,248,239,0.92)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--red)]">
                    {item.badge}
                  </div>
                ) : null}
              </div>

              {item.gallery.length > 1 ? (
                <div className="grid grid-cols-3 gap-3">
                  {item.gallery.slice(1, 4).map((image, index) => (
                    <div key={image} className="overflow-hidden rounded-[18px] border border-[rgba(106,45,31,0.1)] bg-[var(--paper)]">
                      <CmsImage
                        src={image}
                        media={item.gallery_data?.[index + 1]}
                        alt={item.name}
                        className="aspect-square w-full object-cover"
                        sizes="(min-width: 1024px) 12vw, 30vw"
                      />
                    </div>
                  ))}
                </div>
              ) : null}

              {item.upsell_products.length ? (
                <section className="rounded-[24px] border border-[rgba(106,45,31,0.1)] bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--orange)]">Try it with</div>
                  <div className="mt-3 space-y-3">
                    {item.upsell_products.slice(0, 3).map((upsell) => (
                      <UpsellRow key={upsell.id} item={upsell} />
                    ))}
                  </div>
                </section>
              ) : null}

              {cart ? (
                <div className="hidden lg:block">
                  <CartSummary cart={cart} />
                </div>
              ) : null}
            </div>

            <div className="flex flex-col">
              <div className="space-y-5 p-5 pb-28 lg:flex-1 lg:overflow-y-auto lg:p-7 lg:pb-7">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--orange)]">
                    {item.categories.map((category) => category.name).join(' / ') || 'Menu item'}
                  </div>
                  <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h1 className="font-western text-[42px] leading-[0.94] text-[var(--cocoa)]">{item.name}</h1>
                      <p className="mt-3 max-w-[52ch] text-[16px] leading-[1.7] text-[var(--muted)]">
                        {item.short_description || 'Fresh ingredients, bold flavor, and no unnecessary filler.'}
                      </p>
                    </div>
                    <div className="rounded-full bg-[rgba(185,49,47,0.08)] px-4 py-2 text-right">
                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Starts at</div>
                      <div className="text-[28px] font-semibold text-[var(--red)]">{item.formatted_price}</div>
                    </div>
                  </div>
                </div>

                {item.description ? (
                  <div
                    className="blog-rich-content rounded-[24px] bg-[var(--paper)] px-5 py-4"
                    dangerouslySetInnerHTML={{ __html: item.description }}
                  />
                ) : null}

                {item.spice_options.length ? (
                  <fieldset className="rounded-[24px] border border-[rgba(106,45,31,0.1)] bg-white p-5">
                    <legend className="font-western px-1 text-[26px] text-[var(--cocoa)]">Choose your spice</legend>
                    <div className="mt-4 space-y-3">
                      {item.spice_options.map((option) => (
                        <label
                          key={option.key}
                          className={[
                            'flex cursor-pointer items-center justify-between gap-3 rounded-[18px] border px-4 py-3 transition',
                            selectedSpiceLevel === option.key
                              ? 'border-[var(--red)] bg-[rgba(185,49,47,0.04)]'
                              : 'border-[rgba(106,45,31,0.12)] bg-[var(--paper)]',
                          ].join(' ')}
                        >
                          <span className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="spice_level"
                              checked={selectedSpiceLevel === option.key}
                              onChange={() => {
                                setSelectedSpiceLevel(option.key)
                                setValidationError(null)
                              }}
                            />
                            <span className="text-sm font-medium text-[var(--cocoa)]">{option.label}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ) : null}

                {item.addon_groups.map((group) => (
                  <fieldset key={group.key} className="rounded-[24px] border border-[rgba(106,45,31,0.1)] bg-white p-5">
                    <legend className="w-full px-1">
                      <div className="flex items-end justify-between gap-3">
                        <span className="font-western text-[26px] text-[var(--cocoa)]">{group.label}</span>
                        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                          {group.min > 0 ? `Choose ${group.min}` : group.max > 0 ? `Up to ${group.max}` : 'Optional'}
                        </span>
                      </div>
                    </legend>

                    <div className="mt-4 space-y-3">
                      {group.options.map((option) => {
                        const active = (selectedAddons[group.key] || []).includes(option.key)
                        const disabled = !active && group.type !== 'single' && maxReachedByGroup(group)

                        return (
                          <label
                            key={option.key}
                            className={[
                              'flex items-center justify-between gap-3 rounded-[18px] border px-4 py-3 transition',
                              active
                                ? 'border-[var(--red)] bg-[rgba(185,49,47,0.04)]'
                                : 'border-[rgba(106,45,31,0.12)] bg-[var(--paper)]',
                              disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                            ].join(' ')}
                          >
                            <span className="flex items-center gap-3">
                              <input
                                type={group.type === 'single' ? 'radio' : 'checkbox'}
                                name={group.key}
                                checked={active}
                                disabled={disabled}
                                onChange={() => toggleAddon(group, option.key)}
                              />
                              <span className="text-sm font-medium text-[var(--cocoa)]">{option.label}</span>
                            </span>
                            <span className="text-sm font-semibold text-[var(--red)]">
                              {Number(option.price_adjustment.raw) > 0 ? `+ ${option.price_adjustment.formatted}` : 'Included'}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </fieldset>
                ))}

                {selectedSummary.length ? (
                  <section className="rounded-[24px] border border-[rgba(106,45,31,0.1)] bg-[var(--paper)] p-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brick)]">Your order build</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedSummary.map((line) => (
                        <span key={line} className="rounded-full bg-white px-3 py-2 text-sm font-medium text-[var(--cocoa)] shadow-sm">
                          {line}
                        </span>
                      ))}
                    </div>
                  </section>
                ) : null}

                {item.allergens_enabled ? (
                  <section className="rounded-[24px] border border-[rgba(106,45,31,0.1)] bg-white p-5">
                    <div className="font-western text-[26px] text-[var(--cocoa)]">Allergies or dietary notes</div>
                    <p className="mt-2 text-sm leading-[1.6] text-[var(--muted)]">
                      Add anything the kitchen should know before this item goes into your cart.
                    </p>
                    <textarea
                      value={allergiesNote}
                      onChange={(event) => setAllergiesNote(event.target.value)}
                      rows={4}
                      placeholder="Example: no dairy, peanut allergy, gluten sensitive"
                      className="mt-4 w-full rounded-[18px] border border-[rgba(106,45,31,0.14)] bg-[var(--paper)] px-4 py-3 text-sm leading-[1.6] text-[var(--cocoa)] outline-none transition focus:border-[var(--red)]"
                    />
                  </section>
                ) : null}

                {cart ? (
                  <section className="rounded-[24px] border border-[rgba(106,45,31,0.1)] bg-white p-4 lg:hidden">
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brick)]">Current cart</div>
                    <CartSummary cart={cart} showCheckoutButton={false} />
                  </section>
                ) : null}

                {item.upsell_products.length ? (
                  <section className="rounded-[24px] border border-[rgba(106,45,31,0.1)] bg-white p-5 lg:hidden">
                    <div className="font-western text-[26px] text-[var(--cocoa)]">Make it a combo?</div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {item.upsell_products.slice(0, 2).map((upsell) => (
                        <UpsellCard key={upsell.id} item={upsell} />
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>

              <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[rgba(106,45,31,0.1)] bg-[rgba(255,249,241,0.96)] px-4 py-4 backdrop-blur lg:static lg:border-t lg:bg-[var(--footer)] lg:px-7 lg:py-5">
                <div className="mx-auto flex max-w-[980px] flex-col gap-4 lg:max-w-none lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3 lg:block">
                      <div className="text-sm uppercase tracking-[0.08em] text-[var(--muted)] lg:text-[rgba(255,248,239,0.72)]">Quantity</div>
                      <div className="text-sm font-semibold text-[var(--red)] lg:hidden">{item.formatted_price}</div>
                    </div>
                    <QuantityControl value={quantity} onChange={setQuantity} />
                  </div>

                  <div className="flex-1 lg:max-w-[360px]">
                    {validationError ? (
                      <div className="mb-3 rounded-[16px] border border-[rgba(185,49,47,0.16)] bg-[rgba(185,49,47,0.06)] px-4 py-3 text-sm font-medium text-[var(--red)]">
                        {validationError}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={submitting || item.availability !== 'available'}
                      className="inline-flex w-full items-center justify-center rounded-full bg-[var(--red)] px-6 py-4 text-sm font-semibold text-white shadow-[0_14px_26px_rgba(185,49,47,0.24)] disabled:cursor-not-allowed disabled:bg-[rgba(185,49,47,0.45)]"
                    >
                      {submitting ? 'Adding...' : `Add ${quantity} to cart`}
                    </button>
                    <div className="mt-2 text-center text-xs text-[var(--muted)] lg:text-[rgba(255,248,239,0.72)]">
                      {cartCount > 0 ? `${cartCount} item${cartCount === 1 ? '' : 's'} already in cart` : 'Your cart updates instantly after add'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function UpsellRow({ item }: { item: MenuItemCard }) {
  return (
    <a
      href={withBase(`/menu/${item.slug}`)}
      className="flex items-center justify-between gap-3 rounded-[18px] border border-[rgba(106,45,31,0.1)] bg-[var(--paper)] px-3 py-3"
    >
      <div className="min-w-0">
        <div className="truncate font-semibold text-[var(--cocoa)]">{item.name}</div>
        <div className="mt-1 text-sm text-[var(--muted)]">{item.formatted_price}</div>
      </div>
      <span className="rounded-full border border-[rgba(106,45,31,0.14)] px-3 py-1 text-xs font-semibold text-[var(--brick)]">
        View
      </span>
    </a>
  )
}

function UpsellCard({ item }: { item: MenuItemCard }) {
  return (
    <a href={withBase(`/menu/${item.slug}`)} className="overflow-hidden rounded-[20px] border border-[rgba(106,45,31,0.1)] bg-[var(--paper)]">
      <div className="aspect-[4/3] bg-white">
        {item.image ? (
          <CmsImage
            src={item.image}
            media={item.image_data}
            alt={item.image_alt || item.name}
            className="h-full w-full object-cover"
            sizes="(min-width: 1024px) 16vw, 44vw"
          />
        ) : null}
      </div>
      <div className="space-y-1 px-3 py-3">
        <div className="font-semibold text-[var(--cocoa)]">{item.name}</div>
        <div className="text-sm font-semibold text-[var(--red)]">{item.formatted_price}</div>
      </div>
    </a>
  )
}
