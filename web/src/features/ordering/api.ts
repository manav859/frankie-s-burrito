import type {
  ApiAddToCartInput,
  ApiCheckoutAddressInput,
  ApiCheckoutInput,
  ApiMenuBootstrapResponse,
  ApiMenuCategoriesResponse,
  ApiMenuCollectionResponse,
  ApiMenuItemDetail,
  ApiMenuItemsResponse,
  ApiOrderConfirmationResponse,
  ApiPlaceOrderResponse,
  ApiUpdateCartItemInput,
} from './contract'
import {
  parseCartResponse,
  parseCheckoutConfigResponse,
  parseCheckoutValidationResponse,
  parseMenuBootstrapResponse,
  parseMenuCategoriesResponse,
  parseMenuCollectionResponse,
  parseMenuItemDetailResponse,
  parseMenuItemsResponse,
  parseOrderConfirmationResponse,
  parsePlaceOrderResponse,
} from './parsers'
import { clearCartToken, persistCartTokenFromResponse, readCartToken } from './token'
import type {
  AddToCartInput,
  CartResponse,
  CheckoutAddressInput,
  CheckoutConfig,
  CheckoutInput,
  CheckoutValidationResponse,
  MenuBootstrap,
  MenuCategory,
  MenuItemCard,
  MenuItemDetail,
  OrderConfirmation,
  PlaceOrderResponse,
} from './types'

const ENV_WORDPRESS_BASE = import.meta.env.VITE_WORDPRESS_BASE_URL?.replace(/\/$/, '')
const API_NAMESPACE = '/frankies-headless/v1'
const DEFAULT_COUNTRY = 'US'

type QueryValue = string | number | boolean | undefined

type ApiErrorPayload = {
  code?: string
  message?: string
  data?: {
    status?: number
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST'
  body?: unknown
  signal?: AbortSignal
  query?: Record<string, QueryValue>
  includeCartToken?: boolean
}

export class FrankiesHeadlessError extends Error {
  status: number
  code: string

  constructor(message: string, status = 500, code = 'frankies_request_failed') {
    super(message)
    this.name = 'FrankiesHeadlessError'
    this.status = status
    this.code = code
  }
}

function getBrowserOrigin() {
  if (typeof window === 'undefined' || !/^https?:$/i.test(window.location.protocol)) {
    return ''
  }

  return window.location.origin.replace(/\/$/, '')
}

function getLocalWordPressOrigin() {
  if (typeof window === 'undefined' || !/^https?:$/i.test(window.location.protocol)) {
    return ''
  }

  const { protocol, hostname } = window.location
  return `${protocol}//${hostname}:8080`
}

function isProxyingWordPressThroughFrontend() {
  if (!import.meta.env.DEV) {
    return false
  }

  const browserOrigin = getBrowserOrigin()
  return Boolean(browserOrigin) && !browserOrigin.endsWith(':8080')
}

function getWordPressBase() {
  if (isProxyingWordPressThroughFrontend()) {
    return getBrowserOrigin()
  }

  if (ENV_WORDPRESS_BASE) {
    return ENV_WORDPRESS_BASE
  }

  if (typeof window !== 'undefined' && /^https?:$/i.test(window.location.protocol)) {
    const { protocol, hostname, port } = window.location

    if ((hostname === 'localhost' || hostname === '127.0.0.1') && port !== '8080') {
      return `${protocol}//${hostname}:8080`
    }
  }

  return ''
}

function normalizeWordPressUrl(value: string) {
  const browserOrigin = getBrowserOrigin()
  const wordpressBase =
    ENV_WORDPRESS_BASE ||
    (isProxyingWordPressThroughFrontend() ? browserOrigin : '') ||
    getLocalWordPressOrigin()

  if (/^\/wp-(content|includes)\//i.test(value)) {
    return wordpressBase ? `${wordpressBase}${value}` : value
  }

  if (!browserOrigin || !isProxyingWordPressThroughFrontend()) {
    return value
  }

  try {
    const parsed = new URL(value)
    const knownOrigins = new Set<string>(
      [
        ENV_WORDPRESS_BASE,
        getLocalWordPressOrigin(),
        browserOrigin,
        'http://localhost:8080',
        'https://localhost:8080',
        'http://127.0.0.1:8080',
        'https://127.0.0.1:8080',
      ].filter(Boolean),
    )

    if (!knownOrigins.has(parsed.origin) || parsed.origin === browserOrigin) {
      return value
    }

    return `${browserOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return value
  }
}

function normalizePayload<T>(value: T): T {
  if (typeof value === 'string') {
    return normalizeWordPressUrl(value) as T
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizePayload(entry)) as T
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, normalizePayload(entry)])) as T
  }

  return value
}

function buildEndpoint(route: string, query?: Record<string, QueryValue>) {
  const normalizedRoute = route.startsWith('/') ? route : `/${route}`
  const params = new URLSearchParams()

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === '') {
        continue
      }

      params.set(key, String(value))
    }
  }

  const suffix = params.toString()
  return `/wp-json${API_NAMESPACE}${normalizedRoute}${suffix ? `?${suffix}` : ''}`
}

async function readError(response: Response) {
  let payload: ApiErrorPayload | null = null

  try {
    payload = (await response.json()) as ApiErrorPayload
  } catch {
    payload = null
  }

  throw new FrankiesHeadlessError(payload?.message || `Request failed with status ${response.status}.`, payload?.data?.status || response.status, payload?.code)
}

async function requestJson<T>(route: string, options: RequestOptions = {}): Promise<T> {
  const wordpressBase = getWordPressBase()

  if (!wordpressBase) {
    throw new FrankiesHeadlessError('Missing WordPress base URL for the headless ordering API.', 500, 'missing_wordpress_base')
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const query = { ...(options.query || {}) }
  let body = options.body

  if (options.includeCartToken !== false) {
    const cartToken = readCartToken()
    if (cartToken) {
      query.cartToken = cartToken

      if (body && typeof body === 'object' && !Array.isArray(body)) {
        body = { ...(body as Record<string, unknown>), cartToken }
      }
    }
  }

  const response = await fetch(`${wordpressBase}${buildEndpoint(route, query)}`, {
    method: options.method || 'GET',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: options.signal,
    cache: 'no-store',
  })

  if (!response.ok) {
    await readError(response)
  }

  const payload = normalizePayload((await response.json()) as T)
  persistCartTokenFromResponse(payload)
  return payload
}

async function requestAndParse<TRaw, TParsed>(route: string, parser: (input: unknown) => TParsed, options: RequestOptions = {}) {
  const payload = await requestJson<TRaw>(route, options)
  return parser(payload)
}

export function getDefaultCheckoutAddress(): CheckoutAddressInput {
  return {
    street_address: '',
    city: '',
    state: '',
    postcode: '',
    country: DEFAULT_COUNTRY,
  }
}

export function hasOrderingApiBase() {
  return Boolean(getWordPressBase())
}

export function clearPersistedCartToken() {
  clearCartToken()
}

export const menuApi = {
  getBootstrap(signal?: AbortSignal) {
    return requestAndParse<ApiMenuBootstrapResponse, MenuBootstrap>('/menu/bootstrap', parseMenuBootstrapResponse, { signal })
  },

  getCategories(signal?: AbortSignal) {
    return requestAndParse<ApiMenuCategoriesResponse, { items: MenuCategory[] }>('/menu/categories', parseMenuCategoriesResponse, { signal })
  },

  getItems(
    query: {
      category?: string
      featured?: boolean
      search?: string
      availability?: 'available' | 'unavailable'
      limit?: number
    },
    signal?: AbortSignal,
  ) {
    return requestAndParse<ApiMenuItemsResponse, { filters: Record<string, unknown>; items: MenuItemCard[]; empty: boolean }>(
      '/menu/items',
      parseMenuItemsResponse,
      { query, signal },
    )
  },

  getItem(idOrSlug: string, signal?: AbortSignal) {
    return requestAndParse<ApiMenuItemDetail, MenuItemDetail>(`/menu/items/${encodeURIComponent(idOrSlug)}`, parseMenuItemDetailResponse, {
      signal,
    })
  },

  getMenu(
    query?: {
      category?: string
      featured?: boolean
      search?: string
      availability?: 'available' | 'unavailable'
      limit?: number
    },
    signal?: AbortSignal,
  ) {
    return requestAndParse<ApiMenuCollectionResponse, { meta: { version: string; empty: boolean }; sections: Array<{ category: MenuCategory; items: MenuItemCard[] }> }>(
      '/menu',
      parseMenuCollectionResponse,
      { query, signal },
    )
  },
}

export const cartApi = {
  get(signal?: AbortSignal) {
    return requestAndParse<unknown, CartResponse>('/cart', parseCartResponse, { signal })
  },

  add(input: ApiAddToCartInput, signal?: AbortSignal) {
    return requestAndParse<unknown, CartResponse>('/cart/add', parseCartResponse, { method: 'POST', body: input, signal })
  },

  update(input: ApiUpdateCartItemInput, signal?: AbortSignal) {
    return requestAndParse<unknown, CartResponse>('/cart/update', parseCartResponse, { method: 'POST', body: input, signal })
  },

  remove(key: string, signal?: AbortSignal) {
    return requestAndParse<unknown, CartResponse>('/cart/remove', parseCartResponse, { method: 'POST', body: { key }, signal })
  },

  clear(signal?: AbortSignal) {
    return requestAndParse<unknown, CartResponse>('/cart/clear', parseCartResponse, { method: 'POST', body: {}, signal })
  },
}

export const checkoutApi = {
  getConfig(address?: ApiCheckoutAddressInput, signal?: AbortSignal) {
    const query = address
      ? {
          'address[street_address]': address.street_address,
          'address[city]': address.city,
          'address[state]': address.state,
          'address[postcode]': address.postcode,
          'address[country]': address.country,
        }
      : undefined

    return requestAndParse<unknown, CheckoutConfig>('/checkout/config', parseCheckoutConfigResponse, { signal, query })
  },

  validate(input: ApiCheckoutInput, signal?: AbortSignal) {
    return requestAndParse<unknown, CheckoutValidationResponse>('/checkout/validate', parseCheckoutValidationResponse, {
      method: 'POST',
      body: input,
      signal,
    })
  },

  placeOrder(input: ApiCheckoutInput, signal?: AbortSignal) {
    return requestAndParse<ApiPlaceOrderResponse, PlaceOrderResponse>('/checkout/place-order', parsePlaceOrderResponse, {
      method: 'POST',
      body: input,
      signal,
    })
  },
}

export const orderApi = {
  getConfirmation(orderId: string, orderKey: string, signal?: AbortSignal) {
    return requestAndParse<ApiOrderConfirmationResponse, OrderConfirmation>(
      `/orders/${encodeURIComponent(orderId)}/confirmation`,
      parseOrderConfirmationResponse,
      {
        signal,
        query: { key: orderKey },
        includeCartToken: false,
      },
    )
  },
}

export async function getMenuBootstrap(signal?: AbortSignal) {
  return menuApi.getBootstrap(signal)
}

export async function getMenuCategories(signal?: AbortSignal) {
  return menuApi.getCategories(signal)
}

export async function getMenuItems(
  query: {
    category?: string
    featured?: boolean
    search?: string
    availability?: 'available' | 'unavailable'
    limit?: number
  },
  signal?: AbortSignal,
) {
  return menuApi.getItems(query, signal)
}

export async function getMenuItem(idOrSlug: string, signal?: AbortSignal) {
  return menuApi.getItem(idOrSlug, signal)
}

export async function getMenu(
  query?: {
    category?: string
    featured?: boolean
    search?: string
    availability?: 'available' | 'unavailable'
    limit?: number
  },
  signal?: AbortSignal,
) {
  return menuApi.getMenu(query, signal)
}

export async function getCart(signal?: AbortSignal) {
  return cartApi.get(signal)
}

export async function addToCart(input: AddToCartInput, signal?: AbortSignal) {
  return cartApi.add(input, signal)
}

export async function updateCartItem(input: { key: string; quantity: number }, signal?: AbortSignal) {
  return cartApi.update(input, signal)
}

export async function removeCartItem(key: string, signal?: AbortSignal) {
  return cartApi.remove(key, signal)
}

export async function clearCart(signal?: AbortSignal) {
  return cartApi.clear(signal)
}

export async function getCheckoutConfig(address?: CheckoutAddressInput, signal?: AbortSignal) {
  return checkoutApi.getConfig(address, signal)
}

export async function validateCheckout(input: CheckoutInput, signal?: AbortSignal) {
  return checkoutApi.validate(input, signal)
}

export async function placeOrder(input: CheckoutInput, signal?: AbortSignal) {
  return checkoutApi.placeOrder(input, signal)
}

export async function getOrderConfirmation(orderId: string, orderKey: string, signal?: AbortSignal) {
  return orderApi.getConfirmation(orderId, orderKey, signal)
}

export type { OrderConfirmation } from './types'
