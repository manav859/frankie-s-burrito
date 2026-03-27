import type {
  ApiCartItem,
  ApiCartResponse,
  ApiCheckoutConfigResponse,
  ApiCheckoutDeliveryMethod,
  ApiCheckoutPaymentMethod,
  ApiCheckoutValidationResponse,
  ApiMenuBootstrapResponse,
  ApiMenuCategoriesResponse,
  ApiMenuCategory,
  ApiMenuCollectionResponse,
  ApiMenuItemCard,
  ApiMenuItemDetail,
  ApiMenuItemsResponse,
  ApiMoney,
  ApiOrderConfirmationResponse,
  ApiPlaceOrderResponse,
} from './contract'
import { createEmptyMoney, getNonEmptyText, getSafeText } from './helpers'
import { normalizeResponsiveImageAsset } from '../../lib/media'
import type {
  CartItem,
  CartResponse,
  CheckoutConfig,
  CheckoutDeliveryMethod,
  CheckoutPaymentMethod,
  CheckoutValidationResponse,
  MenuBootstrap,
  MenuCategory,
  MenuItemCard,
  MenuItemDetail,
  OrderConfirmation,
  PlaceOrderResponse,
} from './types'

function normalizeWordPressUrl(value: string) {
  if (!value) {
    return ''
  }

  return value
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : []
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

export function parseMoney(input: unknown): ApiMoney {
  const record = asRecord(input)
  return {
    raw: getNonEmptyText(record.raw, '0.00'),
    formatted: getNonEmptyText(record.formatted, '$0.00'),
    currency: getNonEmptyText(record.currency, 'USD'),
    symbol: getNonEmptyText(record.symbol, '$'),
  }
}

function parseMenuCategory(input: unknown): MenuCategory {
  const record = asRecord(input) as Partial<ApiMenuCategory>
  return {
    id: typeof record.id === 'number' ? record.id : 0,
    slug: getSafeText(record.slug),
    name: getNonEmptyText(record.name, 'Menu'),
    image: normalizeWordPressUrl(getSafeText(record.image)),
    image_alt: getSafeText(record.image_alt),
    image_data: normalizeResponsiveImageAsset(record.image_data),
    count: typeof record.count === 'number' ? record.count : 0,
    sort_order: typeof record.sort_order === 'number' ? record.sort_order : 0,
    description: getSafeText(record.description),
    cta_label: getSafeText(record.cta_label),
  }
}

function parseMenuItemCard(input: unknown): MenuItemCard {
  const record = asRecord(input) as Partial<ApiMenuItemCard>
  const availability = record.availability === 'unavailable' ? 'unavailable' : 'available'
  const fulfillmentMode =
    record.fulfillment_mode === 'pickup' || record.fulfillment_mode === 'delivery' || record.fulfillment_mode === 'both'
      ? record.fulfillment_mode
      : 'both'

  return {
    id: typeof record.id === 'number' ? record.id : 0,
    slug: getSafeText(record.slug),
    name: getNonEmptyText(record.name, 'Menu item'),
    image: normalizeWordPressUrl(getSafeText(record.image)),
    image_alt: getSafeText(record.image_alt),
    image_data: normalizeResponsiveImageAsset(record.image_data),
    short_description: getSafeText(record.short_description),
    formatted_price: getNonEmptyText(record.formatted_price, '$0.00'),
    base_price: getNonEmptyText(record.base_price, '0.00'),
    badge: getSafeText(record.badge),
    availability,
    fulfillment_mode: fulfillmentMode,
    sort_order: typeof record.sort_order === 'number' ? record.sort_order : 0,
  }
}

function parseDeliveryMethod(input: unknown): CheckoutDeliveryMethod {
  const record = asRecord(input) as Partial<ApiCheckoutDeliveryMethod>
  return {
    id: getSafeText(record.id),
    label: getNonEmptyText(record.label, 'Delivery'),
    price: parseMoney(record.price),
  }
}

function parsePaymentMethod(input: unknown): CheckoutPaymentMethod {
  const record = asRecord(input) as Partial<ApiCheckoutPaymentMethod>
  const type = record.type === 'upi' || record.type === 'cash_on_delivery' ? record.type : 'card'

  return {
    id: getSafeText(record.id),
    type,
    label: getNonEmptyText(record.label, 'Payment method'),
    description: getSafeText(record.description),
    enabled: record.enabled !== false,
  }
}

function parseCartItem(input: unknown): CartItem {
  const record = asRecord(input) as Partial<ApiCartItem>
  const selectedOptions = asRecord(record.selected_options)
  const spiceLevel = selectedOptions.spice_level ? {
    key: getSafeText(asRecord(selectedOptions.spice_level).key),
    label: getNonEmptyText(asRecord(selectedOptions.spice_level).label, 'Spice'),
    price_adjustment: parseMoney(asRecord(selectedOptions.spice_level).price_adjustment),
  } : null

  return {
    key: getSafeText(record.key),
    product_id: typeof record.product_id === 'number' ? record.product_id : 0,
    name: getNonEmptyText(record.name, 'Cart item'),
    image: normalizeWordPressUrl(getSafeText(record.image)),
    image_data: normalizeResponsiveImageAsset(record.image_data),
    quantity: typeof record.quantity === 'number' ? record.quantity : 0,
    unit_price: parseMoney(record.unit_price),
    line_subtotal: parseMoney(record.line_subtotal),
    line_total: parseMoney(record.line_total),
    selected_options: {
      spice_level: spiceLevel,
      addons: asArray(selectedOptions.addons).map((addon) => {
        const addonRecord = asRecord(addon)
        return {
          key: getSafeText(addonRecord.key),
          label: getNonEmptyText(addonRecord.label, 'Add-on'),
          price_adjustment: parseMoney(addonRecord.price_adjustment),
        }
      }),
    },
    summary_lines: asArray(record.summary_lines).map((line) => getSafeText(line)).filter(Boolean),
  }
}

export function parseMenuBootstrapResponse(input: unknown): MenuBootstrap {
  const record = asRecord(input) as Partial<ApiMenuBootstrapResponse>
  const meta = asRecord(record.meta)
  const cart = asRecord(record.cart)

  return {
    meta: {
      version: getNonEmptyText(meta.version, 'v1'),
      brand: getSafeText(meta.brand),
      menu_title: getNonEmptyText(meta.menu_title, 'Menu'),
      initial_category: getSafeText(meta.initial_category),
    },
    categories: asArray(record.categories).map(parseMenuCategory),
    featured: asArray(record.featured).map(parseMenuItemCard),
    initial_items: asArray(record.initial_items).map(parseMenuItemCard),
    cart: {
      item_count: typeof cart.item_count === 'number' ? cart.item_count : 0,
      subtotal: parseMoney(cart.subtotal),
      total: parseMoney(cart.total),
      currency: getNonEmptyText(cart.currency, 'USD'),
    },
  }
}

export function parseMenuCategoriesResponse(input: unknown): { items: MenuCategory[] } {
  const record = asRecord(input) as Partial<ApiMenuCategoriesResponse>
  return {
    items: asArray(record.items).map(parseMenuCategory),
  }
}

export function parseMenuItemsResponse(input: unknown): ApiMenuItemsResponse & { items: MenuItemCard[] } {
  const record = asRecord(input) as Partial<ApiMenuItemsResponse>
  const filters = asRecord(record.filters)

  return {
    filters: {
      category: getSafeText(filters.category),
      featured: Boolean(filters.featured),
      search: getSafeText(filters.search),
      availability: getSafeText(filters.availability),
    },
    items: asArray(record.items).map(parseMenuItemCard),
    empty: record.empty === true,
  }
}

export function parseMenuCollectionResponse(input: unknown): ApiMenuCollectionResponse & {
  sections: Array<{ category: MenuCategory; items: MenuItemCard[] }>
} {
  const record = asRecord(input) as Partial<ApiMenuCollectionResponse>
  const meta = asRecord(record.meta)

  return {
    meta: {
      version: getNonEmptyText(meta.version, 'v1'),
      empty: meta.empty === true,
    },
    sections: asArray(record.sections).map((section) => {
      const sectionRecord = asRecord(section)
      return {
        category: parseMenuCategory(sectionRecord.category),
        items: asArray(sectionRecord.items).map(parseMenuItemCard),
      }
    }),
  }
}

export function parseMenuItemDetailResponse(input: unknown): MenuItemDetail {
  const record = asRecord(input) as Partial<ApiMenuItemDetail>
  const base = parseMenuItemCard(record)

  return {
    ...base,
    categories: asArray(record.categories).map((category) => {
      const categoryRecord = asRecord(category)
      return {
        id: typeof categoryRecord.id === 'number' ? categoryRecord.id : 0,
        slug: getSafeText(categoryRecord.slug),
        name: getNonEmptyText(categoryRecord.name, 'Category'),
      }
    }),
    gallery: asArray(record.gallery).map((image) => normalizeWordPressUrl(getSafeText(image))).filter(Boolean),
    gallery_data: asArray(record.gallery_data)
      .map((image) => normalizeResponsiveImageAsset(image))
      .filter((image): image is NonNullable<typeof image> => Boolean(image)),
    description: getSafeText(record.description),
    spice_options: asArray(record.spice_options).map((option) => {
      const optionRecord = asRecord(option)
      return {
        key: getSafeText(optionRecord.key),
        label: getNonEmptyText(optionRecord.label, 'Option'),
        price_adjustment: typeof optionRecord.price_adjustment === 'string' ? optionRecord.price_adjustment : parseMoney(optionRecord.price_adjustment),
      }
    }),
    addon_groups: asArray(record.addon_groups).map((group) => {
      const groupRecord = asRecord(group)
      return {
        key: getSafeText(groupRecord.key),
        label: getNonEmptyText(groupRecord.label, 'Add-ons'),
        type: groupRecord.type === 'single' ? 'single' : 'checkbox',
        min: typeof groupRecord.min === 'number' ? groupRecord.min : 0,
        max: typeof groupRecord.max === 'number' ? groupRecord.max : 0,
        options: asArray(groupRecord.options).map((option) => {
          const optionRecord = asRecord(option)
          return {
            key: getSafeText(optionRecord.key),
            label: getNonEmptyText(optionRecord.label, 'Add-on'),
            price_adjustment: parseMoney(optionRecord.price_adjustment),
          }
        }),
      }
    }),
    upsell_products: asArray(record.upsell_products).map(parseMenuItemCard),
    estimated_prep_minutes: typeof record.estimated_prep_minutes === 'number' ? record.estimated_prep_minutes : undefined,
    empty_state: getSafeText(record.empty_state),
  }
}

export function parseCartResponse(input: unknown): CartResponse {
  const record = asRecord(input) as Partial<ApiCartResponse>
  const integration = asRecord(record.integration)

  return {
    cart_token: getSafeText(record.cart_token),
    items: asArray(record.items).map(parseCartItem),
    item_count: typeof record.item_count === 'number' ? record.item_count : 0,
    subtotal: parseMoney(record.subtotal),
    taxes: parseMoney(record.taxes),
    fees: parseMoney(record.fees),
    total: parseMoney(record.total),
    currency: getNonEmptyText(record.currency, 'USD'),
    available_upsells: asArray(record.available_upsells).map(parseMenuItemCard),
    integration: {
      cart_token_header: getSafeText(integration.cart_token_header),
      guest_cart: integration.guest_cart === true,
      nonce: getSafeText(integration.nonce),
    },
  }
}

export function parseCheckoutConfigResponse(input: unknown): CheckoutConfig {
  const record = asRecord(input) as Partial<ApiCheckoutConfigResponse>
  const requiredFields = asRecord(record.required_fields)
  const estimatedTimes = asRecord(record.estimated_times)
  const notes = asRecord(record.notes)

  return {
    cart: parseCartResponse(record.cart),
    fulfillment_modes: asArray(record.fulfillment_modes).map((mode) => {
      const modeRecord = asRecord(mode)
      return {
        id: modeRecord.id === 'pickup' ? 'pickup' : 'delivery',
        label: getNonEmptyText(modeRecord.label, 'Fulfillment'),
        methods: asArray(modeRecord.methods).map(parseDeliveryMethod),
      }
    }),
    payment_methods: asArray(record.payment_methods).map(parsePaymentMethod),
    delivery_methods: asArray(record.delivery_methods).map(parseDeliveryMethod),
    required_fields: {
      pickup: asArray(requiredFields.pickup).map((field) => getSafeText(field)).filter(Boolean),
      delivery: asArray(requiredFields.delivery).map((field) => getSafeText(field)).filter(Boolean),
    },
    estimated_times: {
      pickup: typeof estimatedTimes.pickup === 'number' ? estimatedTimes.pickup : 0,
      delivery: typeof estimatedTimes.delivery === 'number' ? estimatedTimes.delivery : 0,
    },
    notes: {
      upi: getSafeText(notes.upi),
      auth: getSafeText(notes.auth),
    },
  }
}

export function parseCheckoutValidationResponse(input: unknown): CheckoutValidationResponse {
  const record = asRecord(input) as Partial<ApiCheckoutValidationResponse>
  const checkout = asRecord(record.checkout)
  const address = asRecord(checkout.address)

  return {
    valid: true,
    cart: parseCartResponse(record.cart),
    checkout: {
      fulfillment_type: checkout.fulfillment_type === 'delivery' ? 'delivery' : 'pickup',
      full_name: getSafeText(checkout.full_name),
      mobile_number: getSafeText(checkout.mobile_number),
      payment_method: getSafeText(checkout.payment_method),
      delivery_method: checkout.delivery_method ? parseDeliveryMethod(checkout.delivery_method) : null,
      estimated_ready_time: getSafeText(checkout.estimated_ready_time),
      address: {
        street_address: getSafeText(address.street_address),
        city: getSafeText(address.city),
        state: getSafeText(address.state),
        postcode: getSafeText(address.postcode),
        country: getNonEmptyText(address.country, 'US'),
      },
    },
    message: getSafeText(record.message),
  }
}

export function parseOrderConfirmationResponse(input: unknown): OrderConfirmation {
  const record = asRecord(input) as Partial<ApiOrderConfirmationResponse>

  return {
    order_id: typeof record.order_id === 'number' ? record.order_id : 0,
    order_number: getSafeText(record.order_number),
    payment_status: getSafeText(record.payment_status),
    status: getSafeText(record.status),
    fulfillment_type: record.fulfillment_type === 'delivery' ? 'delivery' : 'pickup',
    customer_phone: getSafeText(record.customer_phone),
    estimated_ready_time: getSafeText(record.estimated_ready_time),
    delivery_method: getSafeText(record.delivery_method),
    subtotal: parseMoney(record.subtotal),
    taxes: parseMoney(record.taxes),
    fees: parseMoney(record.fees),
    total: parseMoney(record.total),
    item_summary: asArray(record.item_summary).map((item) => {
      const itemRecord = asRecord(item)
      return {
        name: getNonEmptyText(itemRecord.name, 'Item'),
        quantity: typeof itemRecord.quantity === 'number' ? itemRecord.quantity : 0,
        total: parseMoney(itemRecord.total),
        image: normalizeWordPressUrl(getSafeText(itemRecord.image)),
        image_data: normalizeResponsiveImageAsset(itemRecord.image_data),
        selected_options: parseCartItem({ selected_options: itemRecord.selected_options }).selected_options,
        summary_lines: asArray(itemRecord.summary_lines).map((line) => getSafeText(line)).filter(Boolean),
      }
    }),
    next_actions: asArray(record.next_actions).map((action) => {
      const actionRecord = asRecord(action)
      return {
        type: actionRecord.type === 'payment' ? 'payment' : 'confirmation',
        label: getNonEmptyText(actionRecord.label, 'Next step'),
        status: actionRecord.status === 'pending' ? 'pending' : 'complete',
        url: getSafeText(actionRecord.url) || undefined,
      }
    }),
  }
}

export function parsePlaceOrderResponse(input: unknown): PlaceOrderResponse {
  const record = asRecord(input) as Partial<ApiPlaceOrderResponse>
  return {
    order_id: typeof record.order_id === 'number' ? record.order_id : 0,
    order_number: getSafeText(record.order_number),
    payment_status: getSafeText(record.payment_status),
    status: getSafeText(record.status),
    confirmation_url: getSafeText(record.confirmation_url),
    next_actions: parseOrderConfirmationResponse({ next_actions: record.next_actions }).next_actions,
    confirmation: parseOrderConfirmationResponse(record.confirmation),
  }
}

export function createEmptyCartResponse(currency = 'USD'): CartResponse {
  return {
    cart_token: '',
    items: [],
    item_count: 0,
    subtotal: createEmptyMoney(currency),
    taxes: createEmptyMoney(currency),
    fees: createEmptyMoney(currency),
    total: createEmptyMoney(currency),
    currency,
    available_upsells: [],
    integration: {
      cart_token_header: 'X-Frankies-Cart-Token',
      guest_cart: true,
      nonce: '',
    },
  }
}
