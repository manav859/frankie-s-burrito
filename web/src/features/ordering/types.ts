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
  type: 'checkbox' | 'single'
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

export type CartSelectedOption = {
  key: string
  label: string
  price_adjustment: Money
}

export type CartItem = {
  key: string
  product_id: number
  name: string
  image: string
  image_data?: ResponsiveImageAsset
  quantity: number
  unit_price: Money
  line_subtotal: Money
  line_total: Money
  selected_options: {
    spice_level: CartSelectedOption | null
    addons: CartSelectedOption[]
  }
  summary_lines: string[]
}

export type CartResponse = {
  cart_token: string
  items: CartItem[]
  item_count: number
  subtotal: Money
  taxes: Money
  fees: Money
  total: Money
  currency: string
  available_upsells: MenuItemCard[]
  integration?: {
    cart_token_header?: string
    guest_cart?: boolean
    nonce?: string
  }
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
  cart: CartResponse
  fulfillment_modes: CheckoutFulfillmentMode[]
  payment_methods: CheckoutPaymentMethod[]
  delivery_methods: CheckoutDeliveryMethod[]
  required_fields: {
    pickup: string[]
    delivery: string[]
  }
  estimated_times: Record<FulfillmentType, number>
  notes: {
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
}

export type CheckoutValidationResponse = {
  valid: true
  cart: CartResponse
  checkout: Omit<CheckoutInput, 'delivery_method'> & {
    delivery_method: CheckoutDeliveryMethod | null
    estimated_ready_time: string
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
  product_id: number
  quantity: number
  spice_level?: string
  addons?: string[]
}

export type UpdateCartItemInput = {
  key: string
  quantity: number
}
