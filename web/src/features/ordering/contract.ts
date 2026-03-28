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
  price?: number
  add_on_groups?: ApiMenuAddonGroup[]
  spice_options?: ApiMenuSpiceOption[]
  allergens_enabled?: boolean
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
  required?: boolean
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
  categories?: Array<ApiMenuCategory & { items: ApiMenuItemCard[] }>
  sections: Array<{
    category: ApiMenuCategory
    items: ApiMenuItemCard[]
  }>
  featured?: ApiMenuItemCard[]
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

export type ApiCartSelectedAddOn = {
  group_id: string
  option_id: string
  name: string
  price: ApiMoney
}

export type ApiCartItem = {
  key: string
  product_id: number
  slug?: string
  name: string
  image: string
  image_data?: ResponsiveImageAsset
  quantity: number
  base_price: ApiMoney
  line_subtotal: ApiMoney
  line_total: ApiMoney
  selected_add_ons?: ApiCartSelectedAddOn[]
  selected_options: {
    spice_level: ApiCartSelectedOption | null
    addons: ApiCartSelectedAddOn[]
    allergies_note?: string
  }
  summary_lines: string[]
  allergies_note?: string
  fulfillment_mode?: 'pickup' | 'delivery' | 'both'
}

export type ApiCartResponse = {
  items: ApiCartItem[]
  item_count: number
  subtotal: ApiMoney
  taxes: ApiMoney
  fees: ApiMoney
  discount?: ApiMoney
  tip?: ApiMoney
  total: ApiMoney
  currency: string
  available_upsells: ApiMenuItemCard[]
  coupon_code?: string
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
  fulfillment_modes: ApiCheckoutFulfillmentMode[]
  payment_methods: ApiCheckoutPaymentMethod[]
  delivery_methods: ApiCheckoutDeliveryMethod[]
  store: {
    pickup_address: string
    delivery_radius_km: number
    location: {
      lat: number
      lng: number
    } | null
  }
  required_fields: {
    pickup: string[]
    delivery: string[]
  }
  estimated_times: {
    pickup: number
    delivery: number
  }
  notes: {
    payment?: string
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
  coupon_code?: string
  tip_amount?: string
  cart_items?: Array<Record<string, unknown>>
}

export type ApiCheckoutValidationResponse = {
  valid: true
  cart: ApiCartResponse
  checkout: ApiCheckoutInput & {
    delivery_method: ApiCheckoutDeliveryMethod | null
    estimated_ready_time: string
  }
  pricing: {
    subtotal: ApiMoney
    discount: ApiMoney
    tip: ApiMoney
    total: ApiMoney
    coupon_code?: string
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
  item_id?: number
  itemId?: number
  product_id: number
  slug: string
  name: string
  image: string
  image_data?: ResponsiveImageAsset
  base_price: ApiMoney
  final_price?: ApiMoney
  quantity: number
  fulfillment_mode?: 'pickup' | 'delivery' | 'both'
  size?: ApiCartSelectedOption | null
  spice_level?: ApiCartSelectedOption | null
  addons?: ApiCartSelectedAddOn[]
  selected_add_ons?: ApiCartSelectedAddOn[]
  notes?: string
  allergies_note?: string
}

export type ApiDeliveryValidationResponse = {
  available: boolean
  distance_km: number
  radius_km: number
  pickup_address: string
  store_location: {
    lat: number
    lng: number
  } | null
  message: string
}

export type ApiUpdateCartItemInput = {
  key: string
  quantity: number
}
