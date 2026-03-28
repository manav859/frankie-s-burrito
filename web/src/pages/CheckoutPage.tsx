import { useEffect, useMemo, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { CartLineItems } from '../components/ordering/CartLineItems'
import { OrderEmptyState, OrderErrorState } from '../components/ordering/OrderState'
import { useCart } from '../features/ordering/cart'
import { getDefaultCheckoutAddress, validateDelivery } from '../features/ordering/api'
import { createEmptyMoney, moneyFromRaw } from '../features/ordering/helpers'
import type {
  CartResponse,
  CheckoutConfig,
  CheckoutInput,
  CheckoutValidationResponse,
  DeliveryValidationResponse,
  FulfillmentType,
  Money,
} from '../features/ordering/types'
import { useCheckoutConfig } from '../features/ordering/useCheckoutConfig'
import { withBase } from '../lib/base-path'

const ORDER_CONFIRMATION_CACHE_KEY = 'frankies-last-order-confirmation:v1'

type CheckoutFieldErrors = Partial<Record<'full_name' | 'mobile_number' | 'street_address' | 'city' | 'state' | 'postcode' | 'country' | 'payment_method' | 'delivery_method', string>>

type TipChoice = '0' | '10' | '15' | '20' | 'custom'

export function CheckoutPage() {
  const { cart, ready, error, mutation, validateCurrentCheckout, submitOrder } = useCart()
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<CheckoutFieldErrors>({})
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryValidationResponse | null>(null)
  const [deliveryLoading, setDeliveryLoading] = useState(false)
  const [pricingPreview, setPricingPreview] = useState<CheckoutValidationResponse['pricing'] | null>(null)
  const [couponCode, setCouponCode] = useState('')
  const [tipChoice, setTipChoice] = useState<TipChoice>('0')
  const [customTip, setCustomTip] = useState('')
  const [formState, setFormState] = useState<CheckoutInput>({
    fulfillment_type: 'pickup',
    full_name: '',
    mobile_number: '',
    payment_method: 'cod',
    address: getDefaultCheckoutAddress(),
  })
  const { config, loading: loadingConfig, error: configError } = useCheckoutConfig(cart.items, ready && cart.items.length > 0)

  const fallbackConfig = useMemo<CheckoutConfig>(
    () => ({
      fulfillment_modes: [
        { id: 'pickup', label: 'Pickup', methods: [{ id: 'pickup', label: 'Pickup', price: moneyFromRaw(0, cart.currency) }] },
        { id: 'delivery', label: 'Delivery', methods: [{ id: 'delivery', label: 'Delivery', price: moneyFromRaw(0, cart.currency) }] },
      ],
      payment_methods: [
        {
          id: 'cod',
          type: 'cash_on_delivery',
          label: 'Cash on Delivery',
          description: 'Fallback method shown while live payment methods load.',
          enabled: true,
        },
      ],
      delivery_methods: [{ id: 'delivery', label: 'Delivery', price: moneyFromRaw(0, cart.currency) }],
      store: {
        pickup_address: '',
        delivery_radius_km: 0,
        location: null,
      },
      required_fields: {
        pickup: ['full_name', 'mobile_number', 'payment_method'],
        delivery: ['full_name', 'mobile_number', 'street_address', 'city', 'state', 'postcode', 'delivery_method', 'payment_method'],
      },
      estimated_times: {
        pickup: 20,
        delivery: 40,
      },
      notes: {
        payment: 'Live payment methods are loading in the background.',
        upi: '',
        auth: '',
      },
    }),
    [cart.currency],
  )
  const effectiveConfig = config || fallbackConfig

  useEffect(() => {
    if (!effectiveConfig.fulfillment_modes.length) {
      return
    }

    if (!effectiveConfig.fulfillment_modes.some((mode) => mode.id === formState.fulfillment_type)) {
      setFormState((current) => ({ ...current, fulfillment_type: effectiveConfig.fulfillment_modes[0].id }))
    }
  }, [effectiveConfig.fulfillment_modes, formState.fulfillment_type])

  useEffect(() => {
    if (!effectiveConfig.payment_methods.length) {
      return
    }

    if (!effectiveConfig.payment_methods.some((method) => method.id === formState.payment_method)) {
      setFormState((current) => ({ ...current, payment_method: effectiveConfig.payment_methods[0].id }))
    }
  }, [effectiveConfig.payment_methods, formState.payment_method])

  useEffect(() => {
    if (formState.fulfillment_type !== 'delivery') {
      setDeliveryStatus(null)
      return
    }

    const address = `${formState.address.street_address}, ${formState.address.city}, ${formState.address.state}, ${formState.address.postcode}, ${formState.address.country}`.trim()
    if (!formState.address.street_address || !formState.address.city || !formState.address.state || !formState.address.postcode) {
      setDeliveryStatus(null)
      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      setDeliveryLoading(true)

      try {
        const coordinates = await geocodeAddress(address, controller.signal)

        if (!coordinates) {
          setDeliveryStatus({
            available: false,
            distance_km: 0,
            radius_km: effectiveConfig.store.delivery_radius_km || 0,
            pickup_address: effectiveConfig.store.pickup_address || '',
            store_location: effectiveConfig.store.location || null,
            message: 'We could not confirm this delivery address yet.',
          })
          return
        }

        const result = await validateDelivery(
          { latitude: coordinates.lat, longitude: coordinates.lng },
          controller.signal,
        )
        setDeliveryStatus(result)
      } catch (caughtError) {
        if (controller.signal.aborted) {
          return
        }

        setDeliveryStatus({
          available: false,
          distance_km: 0,
          radius_km: effectiveConfig.store.delivery_radius_km || 0,
          pickup_address: effectiveConfig.store.pickup_address || '',
          store_location: effectiveConfig.store.location || null,
          message: caughtError instanceof Error ? caughtError.message : 'Unable to validate delivery right now.',
        })
      } finally {
        if (!controller.signal.aborted) {
          setDeliveryLoading(false)
        }
      }
    }, 500)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [effectiveConfig.store.delivery_radius_km, effectiveConfig.store.location, effectiveConfig.store.pickup_address, formState.address, formState.fulfillment_type])

  const requiredFields = useMemo(
    () => effectiveConfig.required_fields[formState.fulfillment_type] || [],
    [effectiveConfig, formState.fulfillment_type],
  )
  const activeDeliveryMethods = useMemo(() => {
    if (formState.fulfillment_type !== 'delivery') {
      return []
    }

    return effectiveConfig.fulfillment_modes.find((mode) => mode.id === 'delivery')?.methods || effectiveConfig.delivery_methods
  }, [effectiveConfig, formState.fulfillment_type])
  const tipAmount = useMemo(() => {
    const subtotal = Number(cart.subtotal.raw)
    if (!Number.isFinite(subtotal)) {
      return 0
    }

    if (tipChoice === 'custom') {
      const custom = Number(customTip)
      return Number.isFinite(custom) && custom > 0 ? custom : 0
    }

    const percent = Number(tipChoice)
    return percent > 0 ? subtotal * (percent / 100) : 0
  }, [cart.subtotal.raw, customTip, tipChoice])
  const displayTotals = useMemo(() => {
    if (pricingPreview) {
      return pricingPreview
    }

    const subtotal = Number(cart.subtotal.raw)
    const safeSubtotal = Number.isFinite(subtotal) ? subtotal : 0
    const total = safeSubtotal + tipAmount

    return {
      subtotal: cart.subtotal,
      discount: createEmptyMoney(cart.currency),
      tip: moneyFromRaw(tipAmount, cart.currency),
      total: moneyFromRaw(total, cart.currency),
      coupon_code: couponCode,
    }
  }, [cart.currency, cart.subtotal, couponCode, pricingPreview, tipAmount])

  const validateLocally = () => {
    const nextErrors: CheckoutFieldErrors = {}

    if (requiredFields.includes('full_name') && !formState.full_name.trim()) {
      nextErrors.full_name = 'Full name is required.'
    }

    if (requiredFields.includes('mobile_number') && !formState.mobile_number.trim()) {
      nextErrors.mobile_number = 'Mobile number is required.'
    }

    if (requiredFields.includes('street_address') && !formState.address.street_address.trim()) {
      nextErrors.street_address = 'Street address is required.'
    }

    if (requiredFields.includes('city') && !formState.address.city.trim()) {
      nextErrors.city = 'City is required.'
    }

    if (requiredFields.includes('state') && !formState.address.state.trim()) {
      nextErrors.state = 'State is required.'
    }

    if (requiredFields.includes('postcode') && !formState.address.postcode.trim()) {
      nextErrors.postcode = 'Postcode is required.'
    }

    if (requiredFields.includes('country') && !formState.address.country.trim()) {
      nextErrors.country = 'Country is required.'
    }

    if (requiredFields.includes('payment_method') && !(formState.payment_method || '').trim()) {
      nextErrors.payment_method = 'Choose a payment method.'
    }

    if (requiredFields.includes('delivery_method') && !formState.delivery_method?.trim()) {
      nextErrors.delivery_method = 'Choose a delivery method.'
    }

    if (formState.fulfillment_type === 'delivery' && deliveryStatus && !deliveryStatus.available) {
      nextErrors.street_address = deliveryStatus.message || 'Delivery is unavailable for this address.'
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const buildCheckoutPayload = (): CheckoutInput => ({
    ...formState,
    coupon_code: couponCode.trim() || undefined,
    tip_amount: tipAmount > 0 ? tipAmount.toFixed(2) : undefined,
  })

  const handlePreviewPricing = async () => {
    if (!validateLocally()) {
      return
    }

    setFormError(null)

    try {
      const validation = await validateCurrentCheckout(buildCheckoutPayload())
      setPricingPreview(validation.pricing)
      setValidationMessage(validation.message || 'Checkout details look good.')
    } catch (caughtError) {
      setFormError(caughtError instanceof Error ? caughtError.message : 'Unable to validate checkout.')
    }
  }

  const handlePlaceOrder = async () => {
    if (!validateLocally()) {
      return
    }

    setSubmitting(true)
    setFormError(null)

    try {
      const validation = await validateCurrentCheckout(buildCheckoutPayload())
      setPricingPreview(validation.pricing)
      setValidationMessage(validation.message || 'Checkout details look good.')

      const response = await submitOrder(buildCheckoutPayload())
      try {
        window.sessionStorage.setItem(ORDER_CONFIRMATION_CACHE_KEY, JSON.stringify(response.confirmation))
      } catch {
        // Ignore session storage failures.
      }

      const confirmationUrl = new URL(response.confirmation_url, window.location.origin)
      const orderKey = confirmationUrl.searchParams.get('key') || ''
      window.location.assign(withBase(`/order-success?order_id=${response.order_id}&key=${encodeURIComponent(orderKey)}`))
    } catch (caughtError) {
      setFormError(caughtError instanceof Error ? caughtError.message : 'Unable to place your order.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!cart.items.length) {
    return <OrderEmptyState title="Cart required" body="Add something to your cart before heading to checkout." actionLabel="Browse menu" />
  }

  return (
    <div className="w-full space-y-6 xl:mx-auto xl:max-w-[1140px]">
      <div className="space-y-2">
        <div className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--orange)]">Step 2</div>
        <h1 className="font-western text-[42px] leading-[0.95] text-[var(--cocoa)]">Checkout</h1>
        <p className="max-w-[56ch] text-sm leading-[1.7] text-[var(--muted)]">
          Delivery and payment are validated against the live WooCommerce backend, while the cart stays fast and local in the storefront.
        </p>
      </div>

      {error ? <OrderErrorState message={error} /> : null}
      {configError ? <OrderErrorState message={configError} /> : null}
      {formError ? <OrderErrorState message={formError} /> : null}
      {validationMessage ? (
        <div className="rounded-[22px] border border-[rgba(61,107,53,0.18)] bg-[rgba(61,107,53,0.08)] px-4 py-3 text-sm font-medium text-[var(--sage)]">
          {validationMessage}
        </div>
      ) : null}
      {loadingConfig ? (
        <div className="rounded-[22px] border border-[rgba(106,45,31,0.12)] bg-[rgba(255,249,241,0.9)] px-4 py-3 text-sm text-[var(--muted)]">
          Loading live payment and store settings in the background.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-5 rounded-[32px] border border-[rgba(106,45,31,0.12)] bg-white p-5 shadow-[0_24px_52px_rgba(31,25,21,0.08)] md:p-7">
          <div className="rounded-[28px] border border-[rgba(106,45,31,0.12)] bg-[var(--paper)] p-1.5">
            <div className="grid grid-cols-2 gap-1.5">
              {effectiveConfig.fulfillment_modes.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setFormState((current) => ({ ...current, fulfillment_type: mode.id }))}
                  aria-pressed={formState.fulfillment_type === mode.id}
                  className={[
                    'rounded-full px-4 py-3 text-sm font-semibold transition',
                    formState.fulfillment_type === mode.id
                      ? 'bg-white text-[var(--cocoa)] shadow-[0_10px_18px_rgba(31,25,21,0.08)]'
                      : 'text-[var(--muted)]',
                  ].join(' ')}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <section className="space-y-4 rounded-[24px] border border-[rgba(106,45,31,0.1)] bg-[var(--card)] p-5">
            <div>
              <h2 className="font-western text-[28px] text-[var(--cocoa)]">
                {formState.fulfillment_type === 'delivery' ? 'Delivery Details' : 'Pickup Details'}
              </h2>
              <p className="mt-2 text-sm leading-[1.6] text-[var(--muted)]">
                {formState.fulfillment_type === 'delivery'
                  ? 'We geocode the address client-side and validate it against the store delivery radius before the order is placed.'
                  : effectiveConfig.store.pickup_address || 'Pickup is available at the store location.'}
              </p>
            </div>

            <InputField
              label="Full Name"
              value={formState.full_name}
              onChange={(value) => setFormState((current) => ({ ...current, full_name: value }))}
              placeholder="John Doe"
              error={fieldErrors.full_name}
              required={requiredFields.includes('full_name')}
              autoComplete="name"
            />

            <InputField
              label="Mobile Number"
              value={formState.mobile_number}
              onChange={(value) => setFormState((current) => ({ ...current, mobile_number: value }))}
              placeholder="+1 (555) 000-0000"
              error={fieldErrors.mobile_number}
              required={requiredFields.includes('mobile_number')}
              autoComplete="tel"
              inputMode="tel"
            />

            {formState.fulfillment_type === 'pickup' ? (
              <StoreMapCard config={effectiveConfig} />
            ) : (
              <>
                <InputField
                  label="Street Address"
                  value={formState.address.street_address}
                  onChange={(value) => setFormState((current) => ({ ...current, address: { ...current.address, street_address: value } }))}
                  placeholder="123 Spicy Taco Blvd."
                  error={fieldErrors.street_address}
                  required={requiredFields.includes('street_address')}
                  autoComplete="address-line1"
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <InputField
                    label="City"
                    value={formState.address.city}
                    onChange={(value) => setFormState((current) => ({ ...current, address: { ...current.address, city: value } }))}
                    placeholder="Agoura Hills"
                    error={fieldErrors.city}
                    required={requiredFields.includes('city')}
                    autoComplete="address-level2"
                  />
                  <InputField
                    label="State"
                    value={formState.address.state}
                    onChange={(value) => setFormState((current) => ({ ...current, address: { ...current.address, state: value } }))}
                    placeholder="CA"
                    error={fieldErrors.state}
                    required={requiredFields.includes('state')}
                    autoComplete="address-level1"
                  />
                  <InputField
                    label="Postcode"
                    value={formState.address.postcode}
                    onChange={(value) => setFormState((current) => ({ ...current, address: { ...current.address, postcode: value } }))}
                    placeholder="91301"
                    error={fieldErrors.postcode}
                    required={requiredFields.includes('postcode')}
                    autoComplete="postal-code"
                  />
                  <InputField
                    label="Country"
                    value={formState.address.country}
                    onChange={(value) => setFormState((current) => ({ ...current, address: { ...current.address, country: value } }))}
                    placeholder="US"
                    error={fieldErrors.country}
                    required={requiredFields.includes('country')}
                    autoComplete="country"
                  />
                </div>

                <div className="rounded-[18px] border border-[rgba(106,45,31,0.12)] bg-white px-4 py-4 text-sm leading-[1.6] text-[var(--muted)]">
                  {deliveryLoading ? 'Checking delivery radius...' : deliveryStatus?.message || 'Enter a full delivery address to validate coverage.'}
                </div>

                {activeDeliveryMethods.length ? (
                  <FieldSection title="Delivery Method" error={fieldErrors.delivery_method}>
                    <div className="space-y-3">
                      {activeDeliveryMethods.map((method) => (
                        <label
                          key={method.id}
                          className={[
                            'flex cursor-pointer items-center justify-between gap-3 rounded-[18px] border px-4 py-3 transition',
                            formState.delivery_method === method.id
                              ? 'border-[var(--red)] bg-[rgba(185,49,47,0.04)]'
                              : 'border-[rgba(106,45,31,0.14)] bg-white',
                          ].join(' ')}
                        >
                          <span className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="delivery_method"
                              checked={formState.delivery_method === method.id}
                              onChange={() => setFormState((current) => ({ ...current, delivery_method: method.id }))}
                            />
                            <span className="block text-sm font-semibold text-[var(--cocoa)]">{method.label}</span>
                          </span>
                          <span className="text-sm font-semibold text-[var(--red)]">{method.price.formatted}</span>
                        </label>
                      ))}
                    </div>
                  </FieldSection>
                ) : null}
              </>
            )}
          </section>

          <section className="space-y-4 rounded-[24px] border border-[rgba(106,45,31,0.1)] bg-[var(--card)] p-5">
            <div>
              <h2 className="font-western text-[28px] text-[var(--cocoa)]">Payment</h2>
              <p className="mt-2 text-sm leading-[1.6] text-[var(--muted)]">
                {config?.notes.payment || 'Choose how the customer will pay for this order.'}
              </p>
            </div>

            <FieldSection title="Payment Method" error={fieldErrors.payment_method}>
              <div className="space-y-3">
                {effectiveConfig.payment_methods.map((method) => (
                  <label
                    key={method.id}
                    className={[
                      'flex cursor-pointer items-center justify-between gap-3 rounded-[18px] border px-4 py-3 transition',
                      formState.payment_method === method.id
                        ? 'border-[var(--red)] bg-[rgba(185,49,47,0.04)]'
                        : 'border-[rgba(106,45,31,0.14)] bg-white',
                    ].join(' ')}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment_method"
                        checked={formState.payment_method === method.id}
                        onChange={() => setFormState((current) => ({ ...current, payment_method: method.id }))}
                      />
                      <span>
                        <span className="block text-sm font-semibold text-[var(--cocoa)]">{method.label}</span>
                        {method.description ? <span className="block text-xs text-[var(--muted)]">{method.description}</span> : null}
                      </span>
                    </span>
                    <span className="rounded-full bg-[var(--paper)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--brick)]">
                      {method.type.replaceAll('_', ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </FieldSection>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <FieldSection title="Coupon">
              <div className="flex gap-3">
                <input
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                  className="w-full rounded-[18px] border border-[rgba(106,45,31,0.14)] bg-white px-4 py-3 text-sm outline-none"
                  placeholder="Enter coupon code"
                />
                <button
                  type="button"
                  onClick={() => void handlePreviewPricing()}
                  className="rounded-full border border-[rgba(106,45,31,0.14)] px-4 py-3 text-sm font-semibold text-[var(--brick)]"
                >
                  Apply
                </button>
              </div>
            </FieldSection>

            <FieldSection title="Tip">
              <div className="grid grid-cols-4 gap-2">
                {(['10', '15', '20', 'custom'] as const).map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => setTipChoice(choice)}
                    className={[
                      'rounded-full px-3 py-3 text-sm font-semibold transition',
                      tipChoice === choice ? 'bg-[var(--red)] text-white' : 'bg-[var(--paper)] text-[var(--brick)]',
                    ].join(' ')}
                  >
                    {choice === 'custom' ? 'Custom' : `${choice}%`}
                  </button>
                ))}
              </div>
              {tipChoice === 'custom' ? (
                <input
                  value={customTip}
                  onChange={(event) => setCustomTip(event.target.value)}
                  className="mt-3 w-full rounded-[18px] border border-[rgba(106,45,31,0.14)] bg-white px-4 py-3 text-sm outline-none"
                  placeholder="0.00"
                  inputMode="decimal"
                />
              ) : null}
            </FieldSection>
          </section>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
          <div className="rounded-[28px] border border-[rgba(106,45,31,0.12)] bg-white p-5 shadow-[0_18px_38px_rgba(31,25,21,0.08)]">
            <div className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brick)]">Cart items</div>
            <div className="mt-4">
              <CartLineItems items={cart.items} compact />
            </div>
          </div>

          <CheckoutTotalsCard
            cart={cart}
            totals={displayTotals}
            fulfillmentType={formState.fulfillment_type}
            submitting={submitting || mutation.type === 'checkout'}
            onPreview={handlePreviewPricing}
            onPlaceOrder={handlePlaceOrder}
          />
        </aside>
      </div>
    </div>
  )
}

function FieldSection({
  title,
  error,
  children,
}: {
  title: string
  error?: string
  children: ReactNode
}) {
  return (
    <div>
      {title ? <label className="mb-2 block text-sm font-semibold text-[var(--cocoa)]">{title}</label> : null}
      {children}
      {error ? <p className="mt-2 text-sm font-medium text-[var(--red)]">{error}</p> : null}
    </div>
  )
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  error,
  required = false,
  autoComplete,
  inputMode,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  error?: string
  required?: boolean
  autoComplete?: string
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode']
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-[var(--cocoa)]">
        {label}
        {required ? <span className="ml-1 text-[var(--red)]">*</span> : null}
      </label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={[
          'w-full rounded-[18px] border bg-white px-4 py-3 text-sm outline-none ring-0 transition',
          error ? 'border-[rgba(185,49,47,0.5)]' : 'border-[rgba(106,45,31,0.14)]',
        ].join(' ')}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={Boolean(error)}
      />
      {error ? <p className="mt-2 text-sm font-medium text-[var(--red)]">{error}</p> : null}
    </div>
  )
}

function StoreMapCard({ config }: { config: CheckoutConfig | null }) {
  const location = config?.store.location
  const mapUrl = location
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${location.lng - 0.01}%2C${location.lat - 0.01}%2C${location.lng + 0.01}%2C${location.lat + 0.01}&layer=mapnik&marker=${location.lat}%2C${location.lng}`
    : ''

  return (
    <div className="overflow-hidden rounded-[22px] border border-[rgba(106,45,31,0.12)] bg-white">
      {mapUrl ? <iframe title="Store location" src={mapUrl} className="h-56 w-full border-0" loading="lazy" /> : null}
      <div className="space-y-2 px-4 py-4 text-sm leading-[1.6] text-[var(--muted)]">
        <div className="font-semibold text-[var(--cocoa)]">Pickup location</div>
        <div>{config?.store.pickup_address || 'Store address unavailable.'}</div>
      </div>
    </div>
  )
}

function CheckoutTotalsCard({
  cart,
  totals,
  fulfillmentType,
  submitting,
  onPreview,
  onPlaceOrder,
}: {
  cart: CartResponse
  totals: {
    subtotal: Money
    discount: Money
    tip: Money
    total: Money
    coupon_code?: string
  }
  fulfillmentType: FulfillmentType
  submitting: boolean
  onPreview: () => void
  onPlaceOrder: () => void
}) {
  return (
    <div className="rounded-[28px] border border-[rgba(106,45,31,0.12)] bg-white p-5 shadow-[0_18px_38px_rgba(31,25,21,0.08)]">
      <div className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brick)]">Order total</div>
      <div className="mt-1 text-[32px] font-semibold text-[var(--red)]">{totals.total.formatted}</div>

      <div className="mt-4 space-y-2 text-sm text-[var(--muted)]">
        <div className="flex items-center justify-between">
          <span>Subtotal</span>
          <span>{totals.subtotal.formatted}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Discount</span>
          <span>-{totals.discount.formatted}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Tip</span>
          <span>{totals.tip.formatted}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Items</span>
          <span>{cart.item_count}</span>
        </div>
        <div className="flex items-center justify-between border-t border-[rgba(106,45,31,0.08)] pt-3 text-base font-semibold text-[var(--cocoa)]">
          <span>Total</span>
          <span>{totals.total.formatted}</span>
        </div>
      </div>

      <div className="mt-4 rounded-[18px] bg-[var(--paper)] px-4 py-3 text-sm leading-[1.6] text-[var(--muted)]">
        Estimated {fulfillmentType} time updates after backend validation.
      </div>

      <button
        type="button"
        onClick={onPreview}
        className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-[rgba(106,45,31,0.14)] px-5 py-3 text-sm font-semibold text-[var(--brick)]"
      >
        Preview totals
      </button>

      <button
        type="button"
        onClick={onPlaceOrder}
        disabled={submitting}
        className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-[var(--red)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(185,49,47,0.22)] disabled:cursor-not-allowed disabled:bg-[rgba(185,49,47,0.45)]"
      >
        {submitting ? 'Placing order...' : 'Place Order'}
      </button>
    </div>
  )
}

async function geocodeAddress(address: string, signal?: AbortSignal) {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', address)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '1')

  const response = await fetch(url.toString(), {
    signal,
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Unable to geocode this delivery address.')
  }

  const payload = (await response.json()) as Array<{ lat?: string; lon?: string }>
  const match = payload[0]

  if (!match?.lat || !match?.lon) {
    return null
  }

  return {
    lat: Number(match.lat),
    lng: Number(match.lon),
  }
}
