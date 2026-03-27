import type { ResponsiveImageAsset } from '../../lib/media'

export type ApiMoney = {
  raw: string
  formatted: string
  currency: string
  symbol: string
}

export type ApiMenuCategory = {
  id: number
  slug: string
  name: string
  image: string
  image_alt?: string
  image_data?: ResponsiveImageAsset
  count: number
  sort_order: number
  description?: string
  cta_label?: string
}

export type ApiMenuItemCard = {
  id: number
  slug: string
  name: string
  image: string
  image_alt?: string
  image_data?: ResponsiveImageAsset
  short_description?: string
  formatted_price: string
  base_price: string
  badge?: string
  availability: 'available' | 'unavailable'
  fulfillment_mode: 'pickup' | 'delivery' | 'both'
  sort_order: number
}

export type ApiMenuSpiceOption = {
  key: string
  label: string
  price_adjustment: string | ApiMoney
}

export type ApiMenuAddonOption = {
  key: string
  label: string
  price_adjustment: ApiMoney
}

export type ApiMenuAddonGroup = {
  key: string
  label: string
  type: string
  min: number
  max: number
  options: ApiMenuAddonOption[]
}

export type ApiMenuItemDetail = ApiMenuItemCard & {
  categories: Array<Pick<ApiMenuCategory, 'id' | 'slug' | 'name'>>
  gallery: string[]
  gallery_data?: ResponsiveImageAsset[]
  description?: string
  spice_options: ApiMenuSpiceOption[]
  addon_groups: ApiMenuAddonGroup[]
  upsell_products: ApiMenuItemCard[]
  estimated_prep_minutes?: number
  empty_state?: string
}

export type ApiMenuBootstrapResponse = {
  meta: {
    version: string
    brand: string
    menu_title: string
    initial_category: string
  }
  categories: ApiMenuCategory[]
  featured: ApiMenuItemCard[]
  initial_items: ApiMenuItemCard[]
  cart: {
    item_count: number
    subtotal: ApiMoney
    total: ApiMoney
    currency: string
  }
}

export type ApiMenuCollectionResponse = {
  meta: {
    version: string
    empty: boolean
  }
  sections: Array<{
    category: ApiMenuCategory
    items: ApiMenuItemCard[]
  }>
}

export type ApiMenuCategoriesResponse = {
  items: ApiMenuCategory[]
}

export type ApiMenuItemsResponse = {
  filters: {
    category: string
    featured: boolean
    search: string
    availability: string
  }
  items: ApiMenuItemCard[]
  empty: boolean
}

export type ApiCartSelectedOption = {
  key: string
  label: string
  price_adjustment: ApiMoney
}

export type ApiCartItem = {
  key: string
  product_id: number
  name: string
  image: string
  image_data?: ResponsiveImageAsset
  quantity: number
  unit_price: ApiMoney
  line_subtotal: ApiMoney
  line_total: ApiMoney
  selected_options: {
    spice_level: ApiCartSelectedOption | null
    addons: ApiCartSelectedOption[]
  }
  summary_lines: string[]
}

export type ApiCartResponse = {
  cart_token: string
  items: ApiCartItem[]
  item_count: number
  subtotal: ApiMoney
  taxes: ApiMoney
  fees: ApiMoney
  total: ApiMoney
  currency: string
  available_upsells: ApiMenuItemCard[]
  integration?: {
    cart_token_header?: string
    guest_cart?: boolean
    nonce?: string
  }
}

export type ApiCheckoutDeliveryMethod = {
  id: string
  label: string
  price: ApiMoney
}

export type ApiCheckoutPaymentMethod = {
  id: string
  type: 'card' | 'upi' | 'cash_on_delivery'
  label: string
  description?: string
  enabled: boolean
}

export type ApiCheckoutFulfillmentMode = {
  id: 'pickup' | 'delivery'
  label: string
  methods: ApiCheckoutDeliveryMethod[]
}

export type ApiCheckoutConfigResponse = {
  cart: ApiCartResponse
  fulfillment_modes: ApiCheckoutFulfillmentMode[]
  payment_methods: ApiCheckoutPaymentMethod[]
  delivery_methods: ApiCheckoutDeliveryMethod[]
  required_fields: {
    pickup: string[]
    delivery: string[]
  }
  estimated_times: {
    pickup: number
    delivery: number
  }
  notes: {
    upi: string
    auth: string
  }
}

export type ApiCheckoutAddressInput = {
  street_address: string
  city: string
  state: string
  postcode: string
  country: string
}

export type ApiCheckoutInput = {
  fulfillment_type: 'pickup' | 'delivery'
  full_name: string
  mobile_number: string
  payment_method?: string
  delivery_method?: string
  address: ApiCheckoutAddressInput
}

export type ApiCheckoutValidationResponse = {
  valid: true
  cart: ApiCartResponse
  checkout: ApiCheckoutInput & {
    delivery_method: ApiCheckoutDeliveryMethod | null
    estimated_ready_time: string
  }
  message: string
}

export type ApiOrderNextAction = {
  type: 'payment' | 'confirmation'
  label: string
  status: 'pending' | 'complete'
  url?: string
}

export type ApiOrderSummaryItem = {
  name: string
  quantity: number
  total: ApiMoney
  image: string
  image_data?: ResponsiveImageAsset
  selected_options: ApiCartResponse['items'][number]['selected_options']
  summary_lines: string[]
}

export type ApiOrderConfirmationResponse = {
  order_id: number
  order_number: string
  payment_status: string
  status: string
  fulfillment_type: 'pickup' | 'delivery'
  customer_phone: string
  estimated_ready_time: string
  delivery_method: string
  subtotal: ApiMoney
  taxes: ApiMoney
  fees: ApiMoney
  total: ApiMoney
  item_summary: ApiOrderSummaryItem[]
  next_actions: ApiOrderNextAction[]
}

export type ApiPlaceOrderResponse = {
  order_id: number
  order_number: string
  payment_status: string
  status: string
  confirmation_url: string
  next_actions: ApiOrderNextAction[]
  confirmation: ApiOrderConfirmationResponse
}

export type ApiAddToCartInput = {
  product_id: number
  quantity: number
  spice_level?: string
  addons?: string[]
}

export type ApiUpdateCartItemInput = {
  key: string
  quantity: number
}
