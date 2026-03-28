import type {
  ApiCartItem,
  ApiCartResponse,
  ApiCheckoutConfigResponse,
  ApiCheckoutDeliveryMethod,
  ApiCheckoutPaymentMethod,
  ApiCheckoutValidationResponse,
  ApiDeliveryValidationResponse,
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
import { createEmptyMoney, decodeHtmlEntities, getNonEmptyText, getSafeText } from './helpers'
import { normalizeResponsiveImageAsset } from '../../lib/media'
import type {
  CartItem,
  CartResponse,
  CheckoutConfig,
  CheckoutDeliveryMethod,
  CheckoutPaymentMethod,
  CheckoutValidationResponse,
  DeliveryValidationResponse,
  MenuBootstrap,
  MenuAddonGroup,
  MenuCategory,
  MenuCollectionCategory,
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
    name: decodeHtmlEntities(getSafeText(record.name)),
    image: normalizeWordPressUrl(getSafeText(record.image)),
    image_alt: decodeHtmlEntities(getSafeText(record.image_alt)),
    image_data: normalizeResponsiveImageAsset(record.image_data),
    count: typeof record.count === 'number' ? record.count : 0,
    sort_order: typeof record.sort_order === 'number' ? record.sort_order : 0,
    description: decodeHtmlEntities(getSafeText(record.description)),
    cta_label: decodeHtmlEntities(getSafeText(record.cta_label)),
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
    name: decodeHtmlEntities(getSafeText(record.name)),
    image: normalizeWordPressUrl(getSafeText(record.image)),
    image_alt: decodeHtmlEntities(getSafeText(record.image_alt)),
    image_data: normalizeResponsiveImageAsset(record.image_data),
    short_description: decodeHtmlEntities(getSafeText(record.short_description)),
    formatted_price: getSafeText(record.formatted_price),
    base_price: getSafeText(record.base_price),
    badge: decodeHtmlEntities(getSafeText(record.badge)),
    availability,
    fulfillment_mode: fulfillmentMode,
    sort_order: typeof record.sort_order === 'number' ? record.sort_order : 0,
    price: typeof record.price === 'number' ? record.price : undefined,
    add_on_groups: asArray(record.add_on_groups).map(parseAddonGroup),
    spice_options: asArray(record.spice_options).map((option) => {
      const optionRecord = asRecord(option)
      return {
        key: getSafeText(optionRecord.key),
        label: decodeHtmlEntities(getNonEmptyText(optionRecord.label, 'Option')),
        price_adjustment:
          typeof optionRecord.price_adjustment === 'string'
            ? optionRecord.price_adjustment
            : parseMoney(optionRecord.price_adjustment),
      }
    }),
    allergens_enabled: record.allergens_enabled === true,
  }
}

function normalizeMenuText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function isExcludedMenuItem(item: Pick<MenuItemCard, 'slug' | 'name' | 'short_description'>) {
  return (
    normalizeMenuText(item.slug) === 'breakfast' &&
    normalizeMenuText(item.name) === 'breakfast' &&
    normalizeMenuText(item.short_description) === 'classic breakfast burrito with eggs, cheese, and choice of fillings.'
  )
}

function filterMenuItems<T extends MenuItemCard>(items: T[]) {
  return items.filter((item) => !isExcludedMenuItem(item))
}

function parseAddonGroup(input: unknown): MenuAddonGroup {
  const record = asRecord(input)
  const type: MenuAddonGroup['type'] = record.type === 'single' || record.type === 'radio' ? 'single' : 'multiple'
  return {
    key: getSafeText(record.key || record.id),
    label: decodeHtmlEntities(getNonEmptyText(record.label || record.name, 'Add-ons')),
    type,
    required: record.required === true || (typeof record.min === 'number' && record.min > 0),
    min: typeof record.min === 'number' ? record.min : 0,
    max: typeof record.max === 'number' ? record.max : 0,
    options: asArray(record.options).map((option) => {
      const optionRecord = asRecord(option)
      return {
        key: getSafeText(optionRecord.key || optionRecord.id),
        label: decodeHtmlEntities(getNonEmptyText(optionRecord.label || optionRecord.name, 'Add-on')),
        price_adjustment: parseMoney(optionRecord.price_adjustment || optionRecord.price),
      }
    }),
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
    slug: getSafeText(record.slug),
    name: getNonEmptyText(record.name, 'Cart item'),
    image: normalizeWordPressUrl(getSafeText(record.image)),
    image_data: normalizeResponsiveImageAsset(record.image_data),
    quantity: typeof record.quantity === 'number' ? record.quantity : 0,
    base_price: parseMoney(record.base_price),
    final_price: parseMoney(record.base_price),
    selected_size: spiceLevel,
    addons: asArray(record.selected_add_ons).map((addon) => {
      const addonRecord = asRecord(addon)
      return {
        group_id: getSafeText(addonRecord.group_id),
        option_id: getSafeText(addonRecord.option_id || addonRecord.key),
        name: getNonEmptyText(addonRecord.name || addonRecord.label, 'Add-on'),
        price: parseMoney(addonRecord.price || addonRecord.price_adjustment),
      }
    }),
    notes: getSafeText(record.allergies_note) || getSafeText(selectedOptions.allergies_note) || undefined,
    line_subtotal: parseMoney(record.line_subtotal),
    line_total: parseMoney(record.line_total),
    selected_add_ons: asArray(record.selected_add_ons).map((addon) => {
      const addonRecord = asRecord(addon)
      return {
        group_id: getSafeText(addonRecord.group_id),
        option_id: getSafeText(addonRecord.option_id || addonRecord.key),
        name: getNonEmptyText(addonRecord.name || addonRecord.label, 'Add-on'),
        price: parseMoney(addonRecord.price || addonRecord.price_adjustment),
      }
    }),
    selected_options: {
      spice_level: spiceLevel,
      addons: asArray(selectedOptions.addons).map((addon) => {
        const addonRecord = asRecord(addon)
        return {
          group_id: getSafeText(addonRecord.group_id),
          option_id: getSafeText(addonRecord.option_id || addonRecord.key),
          name: getNonEmptyText(addonRecord.name || addonRecord.label, 'Add-on'),
          price: parseMoney(addonRecord.price || addonRecord.price_adjustment),
        }
      }),
      allergies_note: getSafeText(selectedOptions.allergies_note),
    },
    summary_lines: asArray(record.summary_lines).map((line) => getSafeText(line)).filter(Boolean),
    allergies_note: getSafeText(record.allergies_note),
    fulfillment_mode:
      record.fulfillment_mode === 'pickup' || record.fulfillment_mode === 'delivery' || record.fulfillment_mode === 'both'
        ? record.fulfillment_mode
        : undefined,
  }
}

export function parseMenuBootstrapResponse(input: unknown): MenuBootstrap {
  const record = asRecord(input) as Partial<ApiMenuBootstrapResponse>
  const meta = asRecord(record.meta)
  const cart = asRecord(record.cart)
  const featured = filterMenuItems(asArray(record.featured).map(parseMenuItemCard))
  const initialItems = filterMenuItems(asArray(record.initial_items).map(parseMenuItemCard))

  return {
    meta: {
      version: getNonEmptyText(meta.version, 'v1'),
      brand: getSafeText(meta.brand),
      menu_title: getNonEmptyText(meta.menu_title, 'Menu'),
      initial_category: getSafeText(meta.initial_category),
    },
    categories: asArray(record.categories).map(parseMenuCategory),
    featured,
    initial_items: initialItems,
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
  const items = filterMenuItems(asArray(record.items).map(parseMenuItemCard))

  return {
    filters: {
      category: getSafeText(filters.category),
      featured: Boolean(filters.featured),
      search: getSafeText(filters.search),
      availability: getSafeText(filters.availability),
    },
    items,
    empty: items.length === 0,
  }
}

export function parseMenuCollectionResponse(input: unknown): ApiMenuCollectionResponse & {
  categories: MenuCollectionCategory[]
  sections: Array<{ category: MenuCategory; items: MenuItemCard[] }>
  featured: MenuItemCard[]
} {
  const record = asRecord(input) as Partial<ApiMenuCollectionResponse>
  const meta = asRecord(record.meta)
  const categories = asArray(record.categories).map((category) => {
    const categoryRecord = asRecord(category)
    const items = filterMenuItems(asArray(categoryRecord.items).map(parseMenuItemCard))
    return {
      ...parseMenuCategory(categoryRecord),
      count: items.length,
      items,
    }
  })
  const sections = asArray(record.sections).map((section) => {
    const sectionRecord = asRecord(section)
    const items = filterMenuItems(asArray(sectionRecord.items).map(parseMenuItemCard))
    return {
      category: {
        ...parseMenuCategory(sectionRecord.category),
        count: items.length,
      },
      items,
    }
  })
  const featured = filterMenuItems(asArray(record.featured).map(parseMenuItemCard))
  const normalizedCategories = categories.length
    ? categories
    : sections.map((section) => ({
        ...section.category,
        items: section.items,
      }))

  return {
    meta: {
      version: getNonEmptyText(meta.version, 'v1'),
      empty: normalizedCategories.every((category) => category.items.length === 0),
    },
    categories: normalizedCategories,
    sections,
    featured,
  }
}

export function parseMenuItemDetailResponse(input: unknown): MenuItemDetail {
  const record = asRecord(input) as Partial<ApiMenuItemDetail>
  const base = parseMenuItemCard(record)
  const upsellProducts = filterMenuItems(asArray(record.upsell_products).map(parseMenuItemCard))

  return {
    ...base,
    categories: asArray(record.categories).map((category) => {
      const categoryRecord = asRecord(category)
      return {
        id: typeof categoryRecord.id === 'number' ? categoryRecord.id : 0,
        slug: getSafeText(categoryRecord.slug),
        name: decodeHtmlEntities(getSafeText(categoryRecord.name)),
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
        label: decodeHtmlEntities(getNonEmptyText(optionRecord.label, 'Option')),
        price_adjustment: typeof optionRecord.price_adjustment === 'string' ? optionRecord.price_adjustment : parseMoney(optionRecord.price_adjustment),
      }
    }),
    addon_groups: asArray(record.addon_groups || record.add_on_groups).map(parseAddonGroup),
    upsell_products: upsellProducts,
    estimated_prep_minutes: typeof record.estimated_prep_minutes === 'number' ? record.estimated_prep_minutes : undefined,
    empty_state: getSafeText(record.empty_state),
    allergens_enabled: record.allergens_enabled === true,
  }
}

export function parseCartResponse(input: unknown): CartResponse {
  const record = asRecord(input) as Partial<ApiCartResponse>
  const availableUpsells = filterMenuItems(asArray(record.available_upsells).map(parseMenuItemCard))

  return {
    items: asArray(record.items).map(parseCartItem),
    item_count: typeof record.item_count === 'number' ? record.item_count : 0,
    subtotal: parseMoney(record.subtotal),
    taxes: parseMoney(record.taxes),
    fees: parseMoney(record.fees),
    discount: parseMoney(record.discount),
    tip: parseMoney(record.tip),
    total: parseMoney(record.total),
    currency: getNonEmptyText(record.currency, 'USD'),
    available_upsells: availableUpsells,
    coupon_code: getSafeText(record.coupon_code),
  }
}

export function parseCheckoutConfigResponse(input: unknown): CheckoutConfig {
  const record = asRecord(input) as Partial<ApiCheckoutConfigResponse>
  const requiredFields = asRecord(record.required_fields)
  const estimatedTimes = asRecord(record.estimated_times)
  const notes = asRecord(record.notes)
  const store = asRecord(record.store)
  const storeLocation = asRecord(store.location)

  return {
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
    store: {
      pickup_address: getSafeText(store.pickup_address),
      delivery_radius_km: typeof store.delivery_radius_km === 'number' ? store.delivery_radius_km : 0,
      location:
        typeof storeLocation.lat === 'number' && typeof storeLocation.lng === 'number'
          ? { lat: storeLocation.lat, lng: storeLocation.lng }
          : null,
    },
    required_fields: {
      pickup: asArray(requiredFields.pickup).map((field) => getSafeText(field)).filter(Boolean),
      delivery: asArray(requiredFields.delivery).map((field) => getSafeText(field)).filter(Boolean),
    },
    estimated_times: {
      pickup: typeof estimatedTimes.pickup === 'number' ? estimatedTimes.pickup : 0,
      delivery: typeof estimatedTimes.delivery === 'number' ? estimatedTimes.delivery : 0,
    },
    notes: {
      payment: getSafeText(notes.payment),
      upi: getSafeText(notes.upi || notes.payment),
      auth: getSafeText(notes.auth),
    },
  }
}

export function parseDeliveryValidationResponse(input: unknown): DeliveryValidationResponse {
  const record = asRecord(input) as Partial<ApiDeliveryValidationResponse>
  const storeLocation = asRecord(record.store_location)

  return {
    available: record.available === true,
    distance_km: typeof record.distance_km === 'number' ? record.distance_km : 0,
    radius_km: typeof record.radius_km === 'number' ? record.radius_km : 0,
    pickup_address: getSafeText(record.pickup_address),
    store_location:
      typeof storeLocation.lat === 'number' && typeof storeLocation.lng === 'number'
        ? { lat: storeLocation.lat, lng: storeLocation.lng }
        : null,
    message: getSafeText(record.message),
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
    pricing: {
      subtotal: parseMoney(record.pricing ? asRecord(record.pricing).subtotal : undefined),
      discount: parseMoney(record.pricing ? asRecord(record.pricing).discount : undefined),
      tip: parseMoney(record.pricing ? asRecord(record.pricing).tip : undefined),
      total: parseMoney(record.pricing ? asRecord(record.pricing).total : undefined),
      coupon_code: record.pricing ? getSafeText(asRecord(record.pricing).coupon_code) : '',
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
    items: [],
    item_count: 0,
    subtotal: createEmptyMoney(currency),
    taxes: createEmptyMoney(currency),
    fees: createEmptyMoney(currency),
    discount: createEmptyMoney(currency),
    tip: createEmptyMoney(currency),
    total: createEmptyMoney(currency),
    currency,
    available_upsells: [],
    coupon_code: '',
  }
}
