import { useEffect, useMemo, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { CartLineItems } from '../components/ordering/CartLineItems'
import { OrderEmptyState, OrderErrorState, OrderLoadingState } from '../components/ordering/OrderState'
import { useCart } from '../features/ordering/cart'
import { getCheckoutConfig, getDefaultCheckoutAddress } from '../features/ordering/api'
import type {
  CartResponse,
  CheckoutConfig,
  CheckoutInput,
  FulfillmentType,
} from '../features/ordering/types'
import { withBase } from '../lib/base-path'

const ORDER_CONFIRMATION_CACHE_KEY = 'frankies-last-order-confirmation:v1'

type CheckoutFieldErrors = Partial<Record<'full_name' | 'mobile_number' | 'street_address' | 'city' | 'state' | 'postcode' | 'country' | 'payment_method' | 'delivery_method', string>>

export function CheckoutPage() {
  const { cart, ready, error, mutation, validateCurrentCheckout, submitOrder } = useCart()
  const [config, setConfig] = useState<CheckoutConfig | null>(null)
  const [debouncedAddress, setDebouncedAddress] = useState(getDefaultCheckoutAddress())
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<CheckoutFieldErrors>({})
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const [formState, setFormState] = useState<CheckoutInput>({
    fulfillment_type: 'delivery',
    full_name: '',
    mobile_number: '',
    address: getDefaultCheckoutAddress(),
  })

  useEffect(() => {
    if (formState.fulfillment_type !== 'delivery') {
      setDebouncedAddress(getDefaultCheckoutAddress())
      return
    }

    const timeoutId = window.setTimeout(() => setDebouncedAddress(formState.address), 250)
    return () => window.clearTimeout(timeoutId)
  }, [formState.address, formState.fulfillment_type])

  useEffect(() => {
    if (!ready || !cart?.items.length) {
      setLoadingConfig(false)
      return
    }

    const controller = new AbortController()

    const loadConfig = async () => {
      setLoadingConfig(true)

      try {
        const response = await getCheckoutConfig(formState.fulfillment_type === 'delivery' ? debouncedAddress : undefined, controller.signal)
        setConfig(response)
        setFormError(null)
      } catch (caughtError) {
        if (controller.signal.aborted) {
          return
        }

        setFormError(caughtError instanceof Error ? caughtError.message : 'Unable to load checkout options.')
      } finally {
        if (!controller.signal.aborted) {
          setLoadingConfig(false)
        }
      }
    }

    void loadConfig()
    return () => controller.abort()
  }, [cart?.item_count, debouncedAddress, formState.fulfillment_type, ready])

  const availableFulfillmentModes = useMemo(() => config?.fulfillment_modes || [], [config])
  const activeDeliveryMethods = useMemo(() => {
    if (formState.fulfillment_type !== 'delivery' || !config) {
      return []
    }

    const activeMode = config.fulfillment_modes.find((mode) => mode.id === formState.fulfillment_type)
    return activeMode?.methods.length ? activeMode.methods : config.delivery_methods || []
  }, [config, formState.fulfillment_type])
  const requiredFields = useMemo(
    () => (config ? config.required_fields[formState.fulfillment_type] : []),
    [config, formState.fulfillment_type],
  )

  useEffect(() => {
    if (!availableFulfillmentModes.length) {
      return
    }

    const availableModeIds = new Set(availableFulfillmentModes.map((mode) => mode.id))
    if (!availableModeIds.has(formState.fulfillment_type)) {
      setFormState((current) => ({ ...current, fulfillment_type: availableFulfillmentModes[0].id }))
    }
  }, [availableFulfillmentModes, formState.fulfillment_type])

  useEffect(() => {
    if (formState.fulfillment_type !== 'delivery') {
      if (formState.delivery_method) {
        setFormState((current) => ({ ...current, delivery_method: undefined }))
      }
      return
    }

    if (!activeDeliveryMethods.length) {
      return
    }

    const existingMethod = activeDeliveryMethods.find((method) => method.id === formState.delivery_method)
    if (!existingMethod) {
      setFormState((current) => ({ ...current, delivery_method: activeDeliveryMethods[0].id }))
    }
  }, [activeDeliveryMethods, formState.delivery_method, formState.fulfillment_type])

  const updateFulfillmentType = (fulfillmentType: FulfillmentType) => {
    setFieldErrors((current) => ({ ...current, delivery_method: undefined }))
    setValidationMessage(null)
    setFormState((current) => ({ ...current, fulfillment_type: fulfillmentType }))
  }

  const updateFieldError = (field: keyof CheckoutFieldErrors, value?: string) => {
    setFieldErrors((current) => ({ ...current, [field]: value }))
  }

  const handleTextFieldChange = (field: 'full_name' | 'mobile_number', value: string) => {
    setValidationMessage(null)
    updateFieldError(field, undefined)
    setFormState((current) => ({ ...current, [field]: value }))
  }

  const handleAddressFieldChange = (
    field: 'street_address' | 'city' | 'state' | 'postcode' | 'country',
    value: string,
  ) => {
    setValidationMessage(null)
    updateFieldError(field, undefined)
    setFormState((current) => ({ ...current, address: { ...current.address, [field]: value } }))
  }

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

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handlePlaceOrder = async () => {
    if (!validateLocally()) {
      return
    }

    setSubmitting(true)
    setFormError(null)
    setValidationMessage(null)

    try {
      const validation = await validateCurrentCheckout(formState)
      setValidationMessage(validation.message || 'Checkout details look good.')

      const response = await submitOrder(formState)
      try {
        window.sessionStorage.setItem(ORDER_CONFIRMATION_CACHE_KEY, JSON.stringify(response.confirmation))
      } catch {
        // Ignore session storage issues and continue to confirmation.
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

  if (!ready) {
    return <OrderLoadingState label="Loading checkout..." />
  }

  if (!cart?.items.length) {
    return <OrderEmptyState title="Cart required" body="Add something to your cart before heading to checkout." actionLabel="Browse menu" />
  }

  if (loadingConfig && !config) {
    return <OrderLoadingState label="Loading checkout options..." />
  }

  return (
    <div className="mx-auto max-w-[1140px] space-y-6">
      <div className="space-y-2">
        <div className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--orange)]">Step 2</div>
        <h1 className="font-western text-[42px] leading-[0.95] text-[var(--cocoa)]">Checkout</h1>
        <p className="max-w-[56ch] text-sm leading-[1.7] text-[var(--muted)]">
          Choose pickup or delivery, confirm your details, and place the order. Online payment is intentionally disabled for now.
        </p>
      </div>

      {error ? <OrderErrorState message={error} /> : null}
      {formError ? <OrderErrorState message={formError} /> : null}
      {validationMessage ? (
        <div className="rounded-[22px] border border-[rgba(61,107,53,0.18)] bg-[rgba(61,107,53,0.08)] px-4 py-3 text-sm font-medium text-[var(--sage)]">
          {validationMessage}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-5 rounded-[32px] border border-[rgba(106,45,31,0.12)] bg-white p-5 shadow-[0_24px_52px_rgba(31,25,21,0.08)] md:p-7">
          <div className="rounded-[28px] border border-[rgba(106,45,31,0.12)] bg-[var(--paper)] p-1.5">
            <div className="grid grid-cols-2 gap-1.5">
              {availableFulfillmentModes.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => updateFulfillmentType(mode.id)}
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

          <div className="space-y-5">
            <section className="space-y-4 rounded-[24px] border border-[rgba(106,45,31,0.1)] bg-[var(--card)] p-5">
              <div>
                <h2 className="font-western text-[28px] text-[var(--cocoa)]">
                  {formState.fulfillment_type === 'delivery' ? 'Delivery Details' : 'Pickup Details'}
                </h2>
                <p className="mt-2 text-sm leading-[1.6] text-[var(--muted)]">
                  {formState.fulfillment_type === 'delivery'
                    ? 'Enter the delivery details required by the current storefront configuration.'
                    : 'We only need a few details to get your pickup order moving.'}
                </p>
              </div>

              <InputField
                label="Full Name"
                value={formState.full_name}
                onChange={(value) => handleTextFieldChange('full_name', value)}
                placeholder="John Doe"
                error={fieldErrors.full_name}
                required={requiredFields.includes('full_name')}
                autoComplete="name"
              />

              <InputField
                label="Mobile Number"
                value={formState.mobile_number}
                onChange={(value) => handleTextFieldChange('mobile_number', value)}
                placeholder="+1 (555) 000-0000"
                error={fieldErrors.mobile_number}
                required={requiredFields.includes('mobile_number')}
                autoComplete="tel"
                inputMode="tel"
              />

              {formState.fulfillment_type === 'delivery' ? (
                <>
                  <InputField
                    label="Street Address"
                    value={formState.address.street_address}
                    onChange={(value) => handleAddressFieldChange('street_address', value)}
                    placeholder="123 Spicy Taco Blvd."
                    error={fieldErrors.street_address}
                    required={requiredFields.includes('street_address')}
                    autoComplete="address-line1"
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <InputField
                      label="City"
                      value={formState.address.city}
                      onChange={(value) => handleAddressFieldChange('city', value)}
                      placeholder="Agoura Hills"
                      error={fieldErrors.city}
                      required={requiredFields.includes('city')}
                      autoComplete="address-level2"
                    />
                    <InputField
                      label="State"
                      value={formState.address.state}
                      onChange={(value) => handleAddressFieldChange('state', value)}
                      placeholder="CA"
                      error={fieldErrors.state}
                      required={requiredFields.includes('state')}
                      autoComplete="address-level1"
                    />
                    <InputField
                      label="Postcode"
                      value={formState.address.postcode}
                      onChange={(value) => handleAddressFieldChange('postcode', value)}
                      placeholder="91301"
                      error={fieldErrors.postcode}
                      required={requiredFields.includes('postcode')}
                      autoComplete="postal-code"
                    />
                    <InputField
                      label="Country"
                      value={formState.address.country}
                      onChange={(value) => handleAddressFieldChange('country', value)}
                      placeholder="US"
                      error={fieldErrors.country}
                      required={requiredFields.includes('country')}
                      autoComplete="country"
                    />
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
                                onChange={() => {
                                  updateFieldError('delivery_method', undefined)
                                  setFormState((current) => ({ ...current, delivery_method: method.id }))
                                }}
                              />
                              <span>
                                <span className="block text-sm font-semibold text-[var(--cocoa)]">{method.label}</span>
                                <span className="block text-xs text-[var(--muted)]">Dynamic delivery option from the storefront</span>
                              </span>
                            </span>
                            <span className="text-sm font-semibold text-[var(--red)]">{method.price.formatted}</span>
                          </label>
                        ))}
                      </div>
                    </FieldSection>
                  ) : null}
                </>
              ) : null}
            </section>

            <section className="space-y-4 rounded-[24px] border border-[rgba(106,45,31,0.1)] bg-[var(--card)] p-5">
              <div>
                <h2 className="font-western text-[28px] text-[var(--cocoa)]">Payment</h2>
                <p className="mt-2 text-sm leading-[1.6] text-[var(--muted)]">
                  Payment collection is disabled for now. Orders will be submitted as pending confirmation until payment options are finalized with the client.
                </p>
              </div>

              <div className="rounded-[18px] border border-[rgba(106,45,31,0.12)] bg-white px-4 py-4 text-sm leading-[1.6] text-[var(--muted)]">
                Payment integration has been paused. The store can still accept pickup or delivery orders through this flow and follow up manually.
              </div>
            </section>
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
          <div className="rounded-[30px] bg-[var(--footer)] px-5 py-4 text-[var(--cream)] shadow-[0_18px_36px_rgba(31,25,21,0.14)]">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgba(255,248,239,0.72)]">Order summary</div>
            <div className="mt-2 font-western text-[30px] text-white">
              {formState.fulfillment_type === 'delivery' ? 'Delivery' : 'Pickup'}
            </div>
            {config ? (
              <div className="mt-2 text-sm leading-[1.7] text-[rgba(255,248,239,0.82)]">
                Estimated ready time: {config.estimated_times[formState.fulfillment_type]} minutes
              </div>
            ) : null}
          </div>

          <div className="rounded-[28px] border border-[rgba(106,45,31,0.12)] bg-white p-5 shadow-[0_18px_38px_rgba(31,25,21,0.08)]">
            <div className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brick)]">Cart items</div>
            <div className="mt-4">
              <CartLineItems items={cart.items} compact />
            </div>
          </div>

          <CheckoutTotalsCard
            cart={cart}
            config={config}
            fulfillmentType={formState.fulfillment_type}
            submitting={submitting || mutation.type === 'checkout'}
            canPlaceOrder
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

function CheckoutTotalsCard({
  cart,
  config,
  fulfillmentType,
  submitting,
  canPlaceOrder,
  onPlaceOrder,
}: {
  cart: CartResponse
  config: CheckoutConfig | null
  fulfillmentType: FulfillmentType
  submitting: boolean
  canPlaceOrder: boolean
  onPlaceOrder: () => void
}) {
  return (
    <div className="rounded-[28px] border border-[rgba(106,45,31,0.12)] bg-white p-5 shadow-[0_18px_38px_rgba(31,25,21,0.08)]">
      <div className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brick)]">Order total</div>
      <div className="mt-1 text-[32px] font-semibold text-[var(--red)]">{cart.total.formatted}</div>

      <div className="mt-4 space-y-2 text-sm text-[var(--muted)]">
        <div className="flex items-center justify-between">
          <span>Subtotal</span>
          <span>{cart.subtotal.formatted}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Taxes</span>
          <span>{cart.taxes.formatted}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Fees</span>
          <span>{cart.fees.formatted}</span>
        </div>
        <div className="flex items-center justify-between border-t border-[rgba(106,45,31,0.08)] pt-3 text-base font-semibold text-[var(--cocoa)]">
          <span>Total</span>
          <span>{cart.total.formatted}</span>
        </div>
      </div>

      {config ? (
        <div className="mt-4 rounded-[18px] bg-[var(--paper)] px-4 py-3 text-sm leading-[1.6] text-[var(--muted)]">
          Estimated {fulfillmentType} time: {config.estimated_times[fulfillmentType]} minutes
        </div>
      ) : null}

      <button
        type="button"
        onClick={onPlaceOrder}
        disabled={submitting || !canPlaceOrder}
        className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[var(--red)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(185,49,47,0.22)] disabled:cursor-not-allowed disabled:bg-[rgba(185,49,47,0.45)]"
      >
        {submitting ? 'Placing order...' : 'Place Order'}
      </button>
      {!canPlaceOrder ? (
        <p className="mt-3 text-sm leading-[1.6] text-[var(--muted)]">
          Checkout needs at least one enabled payment method before the order can be placed.
        </p>
      ) : null}
    </div>
  )
}
