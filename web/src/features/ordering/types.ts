import type { ResponsiveImageAsset } from '../../lib/media'

export type Money = {
  raw: string
  formatted: string
  currency: string
  symbol: string
}

export type Availability = 'available' | 'unavailable'
export type FulfillmentType = 'pickup' | 'delivery'
export type FulfillmentMode = FulfillmentType | 'both'
export type PaymentMethodType = 'card' | 'upi' | 'cash_on_delivery'

export type MenuCategory = {
  id: number
  slug: string
  name: string
  image: string
  image_alt: string
  image_data?: ResponsiveImageAsset
  count: number
  sort_order: number
  description: string
  cta_label: string
}

export type MenuItemCard = {
  id: number
  slug: string
  name: string
  image: string
  image_alt: string
  image_data?: ResponsiveImageAsset
  short_description: string
  formatted_price: string
  base_price: string
  badge: string
  availability: Availability
  fulfillment_mode: FulfillmentMode
  sort_order: number
  price?: number
  add_on_groups: MenuAddonGroup[]
  spice_options?: MenuSpiceOption[]
  allergens_enabled: boolean
}

export type MenuSpiceOption = {
  key: string
  label: string
  price_adjustment: string | Money
}

export type MenuAddonOption = {
  key: string
  label: string
  price_adjustment: Money
}

export type MenuAddonGroup = {
  key: string
  label: string
  type: 'multiple' | 'single'
  required: boolean
  min: number
  max: number
  options: MenuAddonOption[]
}

export type MenuItemDetail = MenuItemCard & {
  categories: Array<Pick<MenuCategory, 'id' | 'slug' | 'name'>>
  gallery: string[]
  gallery_data?: ResponsiveImageAsset[]
  description: string
  spice_options: MenuSpiceOption[]
  addon_groups: MenuAddonGroup[]
  upsell_products: MenuItemCard[]
  estimated_prep_minutes?: number
  empty_state?: string
}

export type MenuBootstrap = {
  meta: {
    version: string
    brand: string
    menu_title: string
    initial_category: string
  }
  categories: MenuCategory[]
  featured: MenuItemCard[]
  initial_items: MenuItemCard[]
  cart: {
    item_count: number
    subtotal: Money
    total: Money
    currency: string
  }
}

export type MenuCollectionCategory = MenuCategory & {
  items: MenuItemCard[]
}

export type CartSelectedOption = {
  key: string
  label: string
  price_adjustment: Money
}

export type CartSelectedAddOn = {
  group_id: string
  option_id: string
  name: string
  price: Money
}

export type ItemCustomizationSelection = {
  selectedSize: CartSelectedOption | null
  selectedAddons: CartSelectedAddOn[]
  notes?: string
}

export type CartItem = {
  key: string
  product_id: number
  slug: string
  name: string
  image: string
  image_data?: ResponsiveImageAsset
  quantity: number
  base_price: Money
  final_price: Money
  selected_size: CartSelectedOption | null
  addons: CartSelectedAddOn[]
  notes?: string
  line_subtotal: Money
  line_total: Money
  selected_add_ons: CartSelectedAddOn[]
  selected_options: {
    spice_level: CartSelectedOption | null
    addons: CartSelectedAddOn[]
    allergies_note?: string
  }
  summary_lines: string[]
  allergies_note?: string
  fulfillment_mode?: FulfillmentMode
}

export type CartResponse = {
  items: CartItem[]
  item_count: number
  subtotal: Money
  taxes: Money
  fees: Money
  discount: Money
  tip: Money
  total: Money
  currency: string
  available_upsells: MenuItemCard[]
  coupon_code?: string
}

export type CheckoutDeliveryMethod = {
  id: string
  label: string
  price: Money
}

export type CheckoutPaymentMethod = {
  id: string
  type: PaymentMethodType
  label: string
  description: string
  enabled: boolean
}

export type CheckoutFulfillmentMode = {
  id: FulfillmentType
  label: string
  methods: CheckoutDeliveryMethod[]
}

export type CheckoutConfig = {
  fulfillment_modes: CheckoutFulfillmentMode[]
  payment_methods: CheckoutPaymentMethod[]
  delivery_methods: CheckoutDeliveryMethod[]
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
  estimated_times: Record<FulfillmentType, number>
  notes: {
    payment?: string
    upi: string
    auth: string
  }
}

export type CheckoutAddressInput = {
  street_address: string
  city: string
  state: string
  postcode: string
  country: string
}

export type CheckoutInput = {
  fulfillment_type: FulfillmentType
  full_name: string
  mobile_number: string
  payment_method?: string
  delivery_method?: string
  address: CheckoutAddressInput
  coupon_code?: string
  tip_amount?: string
  cart_items?: Array<Record<string, unknown>>
}

export type CheckoutValidationResponse = {
  valid: true
  cart: CartResponse
  checkout: Omit<CheckoutInput, 'delivery_method'> & {
    delivery_method: CheckoutDeliveryMethod | null
    estimated_ready_time: string
  }
  pricing: {
    subtotal: Money
    discount: Money
    tip: Money
    total: Money
    coupon_code?: string
  }
  message: string
}

export type OrderNextAction = {
  type: 'payment' | 'confirmation'
  label: string
  status: 'pending' | 'complete'
  url?: string
}

export type OrderSummaryItem = {
  name: string
  quantity: number
  total: Money
  image: string
  image_data?: ResponsiveImageAsset
  selected_options: CartItem['selected_options']
  summary_lines: string[]
}

export type OrderConfirmation = {
  order_id: number
  order_number: string
  payment_status: string
  status: string
  fulfillment_type: FulfillmentType
  customer_phone: string
  estimated_ready_time: string
  delivery_method: string
  subtotal: Money
  taxes: Money
  fees: Money
  total: Money
  item_summary: OrderSummaryItem[]
  next_actions: OrderNextAction[]
}

export type PlaceOrderResponse = {
  order_id: number
  order_number: string
  payment_status: string
  status: string
  confirmation_url: string
  next_actions: OrderNextAction[]
  confirmation: OrderConfirmation
}

export type AddToCartInput = {
  item_id?: number
  product_id: number
  slug: string
  name: string
  image: string
  image_data?: ResponsiveImageAsset
  base_price: Money
  final_price?: Money
  quantity: number
  fulfillment_mode?: FulfillmentMode
  size?: CartSelectedOption | null
  spice_level?: CartSelectedOption | null
  addons?: CartSelectedAddOn[]
  selected_add_ons?: CartSelectedAddOn[]
  notes?: string
  allergies_note?: string
}

export type UpdateCartItemCustomizationInput = AddToCartInput & {
  key: string
}

export type DeliveryValidationResponse = {
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

export type UpdateCartItemInput = {
  key: string
  quantity: number
}
