import type { ReactNode } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { hasOrderingApiBase, placeOrder, validateCheckout } from './api'
import { createEmptyCartResponse, parseCartResponse } from './parsers'
import { getMoneyRawValue, moneyFromRaw } from './helpers'
import type {
  AddToCartInput,
  CartItem,
  CartResponse,
  CheckoutInput,
  CheckoutValidationResponse,
  PlaceOrderResponse,
  UpdateCartItemCustomizationInput,
} from './types'

type CartMutation =
  | { type: 'idle' }
  | { type: 'refresh' }
  | { type: 'add' }
  | { type: 'update'; key: string }
  | { type: 'remove'; key: string }
  | { type: 'clear' }
  | { type: 'checkout' }

type CartStoreState = {
  items: CartItem[]
  ready: boolean
  loading: boolean
  error: string | null
  mutation: CartMutation
  hydrate: () => void
  addItem: (input: AddToCartInput) => Promise<CartResponse>
  updateItemCustomization: (input: UpdateCartItemCustomizationInput) => Promise<CartResponse>
  updateItemQuantity: (key: string, quantity: number) => Promise<CartResponse>
  removeItem: (key: string) => Promise<CartResponse>
  clearAllItems: () => Promise<CartResponse>
  refreshCart: () => Promise<CartResponse>
  validateCurrentCheckout: (input: CheckoutInput) => Promise<CheckoutValidationResponse>
  submitOrder: (input: CheckoutInput) => Promise<PlaceOrderResponse>
}

function createItemKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `cart-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function buildItemSignature(input: AddToCartInput) {
  const selectedSize = input.size ?? input.spice_level ?? null
  const selectedAddons = input.addons ?? input.selected_add_ons ?? []
  const notes = (input.notes ?? input.allergies_note ?? '').trim().toLowerCase()
  const spiceKey = selectedSize?.key || ''
  const addOnKeys = [...selectedAddons]
    .map((addon) => `${addon.group_id}:${addon.option_id}`)
    .sort()
    .join('|')

  return [
    input.product_id,
    spiceKey,
    addOnKeys,
    notes,
  ].join('::')
}

function buildSummaryLines(input: AddToCartInput) {
  const selectedSize = input.size ?? input.spice_level ?? null
  const selectedAddons = input.addons ?? input.selected_add_ons ?? []
  const notes = input.notes ?? input.allergies_note
  const lines: string[] = []

  if (selectedSize?.label) {
    lines.push(`Size: ${selectedSize.label}`)
  }

  for (const addon of selectedAddons) {
    lines.push(`${addon.name}`)
  }

  if (notes?.trim()) {
    lines.push(`Notes: ${notes.trim()}`)
  }

  return lines
}

function buildLineTotals(input: AddToCartInput) {
  const currency = input.base_price.currency || 'USD'
  const basePrice = getMoneyRawValue(input.base_price)
  const selectedSize = input.size ?? input.spice_level ?? null
  const selectedAddons = input.addons ?? input.selected_add_ons ?? []
  const sizePrice = getMoneyRawValue(selectedSize?.price_adjustment)
  const addonsPrice = selectedAddons.reduce((total, addon) => total + getMoneyRawValue(addon.price), 0)
  const unitPrice = basePrice + sizePrice + addonsPrice
  const quantity = Math.max(1, input.quantity)

  return {
    base_price: moneyFromRaw(basePrice, currency),
    final_price: input.final_price || moneyFromRaw(unitPrice, currency),
    line_subtotal: moneyFromRaw(unitPrice * quantity, currency),
    line_total: moneyFromRaw(unitPrice * quantity, currency),
  }
}

function buildCartItem(input: AddToCartInput, key = createItemKey()): CartItem {
  const selectedSize = input.size ?? input.spice_level ?? null
  const selectedAddons = input.addons ?? input.selected_add_ons ?? []
  const notes = input.notes ?? input.allergies_note
  const totals = buildLineTotals(input)

  return {
    key,
    product_id: input.product_id,
    slug: input.slug,
    name: input.name,
    image: input.image,
    image_data: input.image_data,
    quantity: Math.max(1, input.quantity),
    base_price: totals.base_price,
    final_price: totals.final_price,
    selected_size: selectedSize,
    addons: selectedAddons,
    notes: notes?.trim() || undefined,
    line_subtotal: totals.line_subtotal,
    line_total: totals.line_total,
    selected_add_ons: selectedAddons,
    selected_options: {
      spice_level: selectedSize,
      addons: selectedAddons,
      allergies_note: notes?.trim() || undefined,
    },
    summary_lines: buildSummaryLines(input),
    allergies_note: notes?.trim() || undefined,
    fulfillment_mode: input.fulfillment_mode,
  }
}

function rebuildCartItem(item: CartItem) {
  return buildCartItem({
    item_id: item.product_id,
    product_id: item.product_id,
    slug: item.slug,
    name: item.name,
    image: item.image,
    image_data: item.image_data,
    base_price: item.base_price,
    final_price: item.final_price,
    quantity: item.quantity,
    fulfillment_mode: item.fulfillment_mode,
    size: item.selected_size,
    spice_level: item.selected_options.spice_level,
    addons: item.addons,
    selected_add_ons: item.selected_add_ons,
    notes: item.notes,
    allergies_note: item.allergies_note,
  }, item.key)
}

function buildCartResponse(items: CartItem[]): CartResponse {
  const currency = items[0]?.base_price.currency || 'USD'
  const subtotalRaw = items.reduce((total, item) => total + getMoneyRawValue(item.line_total), 0)
  const itemCount = items.reduce((total, item) => total + item.quantity, 0)

  return parseCartResponse({
    items,
    item_count: itemCount,
    subtotal: moneyFromRaw(subtotalRaw, currency),
    taxes: moneyFromRaw(0, currency),
    fees: moneyFromRaw(0, currency),
    discount: moneyFromRaw(0, currency),
    tip: moneyFromRaw(0, currency),
    total: moneyFromRaw(subtotalRaw, currency),
    currency,
    available_upsells: [],
    coupon_code: '',
  })
}

function serializeCartItems(items: CartItem[]) {
  return items.map((item) => ({
    key: item.key,
    product_id: item.product_id,
    itemId: item.product_id,
    slug: item.slug,
    quantity: item.quantity,
    notes: item.notes || item.allergies_note || '',
    allergies_note: item.allergies_note || item.notes || '',
    addons: item.addons.map((addon) => ({
      group_id: addon.group_id,
      option_id: addon.option_id,
    })),
    selected_add_ons: item.selected_add_ons.map((addon) => ({
      group_id: addon.group_id,
      option_id: addon.option_id,
    })),
    size: item.selected_size?.key || item.selected_options.spice_level?.key || '',
    spice_level: item.selected_options.spice_level?.key || item.selected_size?.key || '',
  }))
}

const useCartStore = create<CartStoreState>()(
  persist(
    (set, get) => ({
      items: [],
      ready: true,
      loading: false,
      error: null,
      mutation: { type: 'idle' },
      hydrate: () => set({ ready: true }),
      addItem: async (input) => {
        const signature = buildItemSignature(input)
        const existing = get().items.find((item) => buildItemSignature({
          item_id: item.product_id,
          product_id: item.product_id,
          slug: item.slug,
          name: item.name,
          image: item.image,
          image_data: item.image_data,
          base_price: item.base_price,
          final_price: item.final_price,
          quantity: item.quantity,
          fulfillment_mode: item.fulfillment_mode,
          size: item.selected_size,
          spice_level: item.selected_options.spice_level,
          addons: item.addons,
          selected_add_ons: item.selected_add_ons,
          notes: item.notes,
          allergies_note: item.allergies_note,
        }) === signature)

        set({ loading: true, mutation: { type: 'add' }, error: null })

        const nextItems = existing
          ? get().items.map((item) =>
              item.key === existing.key
                ? rebuildCartItem({ ...item, quantity: item.quantity + Math.max(1, input.quantity) })
                : item,
            )
          : [...get().items, buildCartItem(input)]

        set({ items: nextItems, loading: false, mutation: { type: 'idle' } })
        return buildCartResponse(nextItems)
      },
      updateItemCustomization: async (input) => {
        set({ loading: true, mutation: { type: 'update', key: input.key }, error: null })

        const currentItems = get().items
        const editedItem = buildCartItem(input, input.key)
        const duplicate = currentItems.find((item) => item.key !== input.key && buildItemSignature({
          item_id: item.product_id,
          product_id: item.product_id,
          slug: item.slug,
          name: item.name,
          image: item.image,
          image_data: item.image_data,
          base_price: item.base_price,
          final_price: item.final_price,
          quantity: item.quantity,
          fulfillment_mode: item.fulfillment_mode,
          size: item.selected_size,
          addons: item.addons,
          notes: item.notes,
          spice_level: item.selected_options.spice_level,
          selected_add_ons: item.selected_add_ons,
          allergies_note: item.allergies_note,
        }) === buildItemSignature(input))

        const nextItems = duplicate
          ? currentItems
              .filter((item) => item.key !== input.key)
              .map((item) => (item.key === duplicate.key ? rebuildCartItem({ ...item, quantity: item.quantity + editedItem.quantity }) : item))
          : currentItems.map((item) => (item.key === input.key ? editedItem : item))

        set({ items: nextItems, loading: false, mutation: { type: 'idle' } })
        return buildCartResponse(nextItems)
      },
      updateItemQuantity: async (key, quantity) => {
        set({ loading: true, mutation: { type: 'update', key }, error: null })

        const nextItems = get().items
          .map((item) => (item.key === key ? rebuildCartItem({ ...item, quantity }) : item))
          .filter((item) => item.quantity > 0)

        set({ items: nextItems, loading: false, mutation: { type: 'idle' } })
        return buildCartResponse(nextItems)
      },
      removeItem: async (key) => {
        set({ loading: true, mutation: { type: 'remove', key }, error: null })
        const nextItems = get().items.filter((item) => item.key !== key)
        set({ items: nextItems, loading: false, mutation: { type: 'idle' } })
        return buildCartResponse(nextItems)
      },
      clearAllItems: async () => {
        set({ loading: true, mutation: { type: 'clear' }, error: null, items: [] })
        set({ loading: false, mutation: { type: 'idle' } })
        return createEmptyCartResponse()
      },
      refreshCart: async () => buildCartResponse(get().items),
      validateCurrentCheckout: async (input) => {
        set({ loading: true, mutation: { type: 'checkout' }, error: null })

        try {
          const response = await validateCheckout({
            ...input,
            cart_items: serializeCartItems(get().items),
          })
          set({ loading: false, mutation: { type: 'idle' } })
          return response
        } catch (caughtError) {
          const message = caughtError instanceof Error ? caughtError.message : 'Unable to validate checkout.'
          set({ loading: false, mutation: { type: 'idle' }, error: message })
          throw caughtError
        }
      },
      submitOrder: async (input) => {
        set({ loading: true, mutation: { type: 'checkout' }, error: null })

        try {
          const response = await placeOrder({
            ...input,
            cart_items: serializeCartItems(get().items),
          })
          set({ items: [], loading: false, mutation: { type: 'idle' } })
          return response
        } catch (caughtError) {
          const message = caughtError instanceof Error ? caughtError.message : 'Unable to place your order.'
          set({ loading: false, mutation: { type: 'idle' }, error: message })
          throw caughtError
        }
      },
    }),
    {
      name: 'frankies-frontend-cart:v1',
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        state?.hydrate()
      },
    },
  ),
)

export function CartProvider({ children }: { children: ReactNode }) {
  return children
}

export function useCart() {
  const items = useCartStore((state) => state.items)
  const ready = useCartStore((state) => state.ready)
  const loading = useCartStore((state) => state.loading)
  const error = useCartStore((state) => state.error)
  const mutation = useCartStore((state) => state.mutation)
  const refreshCart = useCartStore((state) => state.refreshCart)
  const addItem = useCartStore((state) => state.addItem)
  const updateItemQuantity = useCartStore((state) => state.updateItemQuantity)
  const updateItemCustomization = useCartStore((state) => state.updateItemCustomization)
  const removeItem = useCartStore((state) => state.removeItem)
  const clearAllItems = useCartStore((state) => state.clearAllItems)
  const validateCurrentCheckout = useCartStore((state) => state.validateCurrentCheckout)
  const submitOrder = useCartStore((state) => state.submitOrder)

  return {
    cart: buildCartResponse(items),
    ready,
    loading,
    error,
    hasApi: hasOrderingApiBase(),
    mutation,
    refreshCart,
    addItem,
    updateItemCustomization,
    updateItemQuantity,
    removeItem,
    clearAllItems,
    validateCurrentCheckout,
    submitOrder,
  }
}
