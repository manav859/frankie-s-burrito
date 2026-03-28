import type {
  ApiAddToCartInput,
  ApiCheckoutAddressInput,
  ApiCheckoutInput,
  ApiDeliveryValidationResponse,
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
  parseDeliveryValidationResponse,
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
  DeliveryValidationResponse,
  MenuBootstrap,
  MenuCollectionCategory,
  MenuCategory,
  MenuItemCard,
  MenuItemDetail,
  OrderConfirmation,
  PlaceOrderResponse,
} from './types'

import { getBrowserOrigin, getWordPressOrigin, isProxyingWordPressThroughFrontend, WORDPRESS_BASE_URL as ENV_WORDPRESS_BASE } from '../../lib/env'
const API_NAMESPACE = '/frankies-headless/v1'
const DEFAULT_COUNTRY = 'US'
const GET_RESPONSE_CACHE_TTL_MS = 5 * 60 * 1000
const responseCache = new Map<string, { expiresAt: number; data: unknown }>()
const inflightGetRequests = new Map<string, Promise<unknown>>()

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
  cacheTtlMs?: number
  bypassResponseCache?: boolean
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

// getBrowserOrigin, getLocalWordPressOrigin and isProxyingWordPressThroughFrontend 
// are now handled via lib/env.ts imports.

// isProxyingWordPressThroughFrontend is now imported from env.ts

function getWordPressBase() {
  return getWordPressOrigin()
}

function normalizeWordPressUrl(value: string) {
  const browserOrigin = getBrowserOrigin()
  const wordpressBase = getWordPressOrigin()

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
        browserOrigin,
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

function getResponseCacheKey(wordpressBase: string, route: string, options: RequestOptions) {
  const method = options.method || 'GET'
  return `${method}:${wordpressBase}${buildEndpoint(route, options.query)}`
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
  const method = options.method || 'GET'
  const cacheKey = getResponseCacheKey(wordpressBase, route, { ...options, method, query })
  const shouldUseResponseCache = method === 'GET' && !options.bypassResponseCache
  const shouldDeduplicateInflight = shouldUseResponseCache && !options.signal
  const cacheTtlMs = options.cacheTtlMs ?? GET_RESPONSE_CACHE_TTL_MS

  if (shouldUseResponseCache) {
    const cached = responseCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T
    }
  }

  if (shouldDeduplicateInflight) {
    const inflight = inflightGetRequests.get(cacheKey)
    if (inflight) {
      return (await inflight) as T
    }
  }

  if (options.includeCartToken !== false) {
    const cartToken = readCartToken()
    if (cartToken) {
      query.cartToken = cartToken

      if (body && typeof body === 'object' && !Array.isArray(body)) {
        body = { ...(body as Record<string, unknown>), cartToken }
      }
    }
  }

  const request = (async () => {
    const response = await fetch(`${wordpressBase}${buildEndpoint(route, query)}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: options.signal,
      cache: method === 'GET' && !options.bypassResponseCache ? 'default' : 'no-store',
    })

    if (!response.ok) {
      await readError(response)
    }

    const payload = normalizePayload((await response.json()) as T)
    persistCartTokenFromResponse(payload)

    if (shouldUseResponseCache) {
      responseCache.set(cacheKey, {
        expiresAt: Date.now() + cacheTtlMs,
        data: payload,
      })
    }

    return payload
  })()

  if (shouldDeduplicateInflight) {
    inflightGetRequests.set(cacheKey, request as Promise<unknown>)
  }

  try {
    return await request
  } finally {
    if (shouldDeduplicateInflight) {
      inflightGetRequests.delete(cacheKey)
    }
  }
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
    return requestAndParse<ApiMenuBootstrapResponse, MenuBootstrap>('/menu/bootstrap', parseMenuBootstrapResponse, {
      signal,
      includeCartToken: false,
    })
  },

  getCategories(signal?: AbortSignal) {
    return requestAndParse<ApiMenuCategoriesResponse, { items: MenuCategory[] }>('/menu/categories', parseMenuCategoriesResponse, {
      signal,
      includeCartToken: false,
    })
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
      { query, signal, includeCartToken: false },
    )
  },

  getItem(idOrSlug: string, signal?: AbortSignal) {
    return requestAndParse<ApiMenuItemDetail, MenuItemDetail>(`/menu/items/${encodeURIComponent(idOrSlug)}`, parseMenuItemDetailResponse, {
      signal,
      includeCartToken: false,
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
    options?: {
      bypassResponseCache?: boolean
    },
  ) {
    return requestAndParse<ApiMenuCollectionResponse, { meta: { version: string; empty: boolean }; categories: MenuCollectionCategory[]; sections: Array<{ category: MenuCategory; items: MenuItemCard[] }>; featured: MenuItemCard[] }>(
      '/menu',
      parseMenuCollectionResponse,
      { query, signal, includeCartToken: false, bypassResponseCache: options?.bypassResponseCache },
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
  getConfig(address?: ApiCheckoutAddressInput, cartItems?: unknown[], signal?: AbortSignal) {
    return requestAndParse<unknown, CheckoutConfig>('/checkout/config', parseCheckoutConfigResponse, {
      method: 'POST',
      body: {
        address,
        cart_items: cartItems,
      },
      signal,
    })
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

export const deliveryApi = {
  validate(location: { latitude: number; longitude: number }, signal?: AbortSignal) {
    return requestAndParse<ApiDeliveryValidationResponse, DeliveryValidationResponse>(
      '/delivery/validate',
      parseDeliveryValidationResponse,
      {
        method: 'POST',
        body: { location },
        signal,
      },
    )
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
  options?: {
    bypassResponseCache?: boolean
  },
) {
  return menuApi.getMenu(query, signal, options)
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

export async function getCheckoutConfig(address?: CheckoutAddressInput, cartItems?: unknown[], signal?: AbortSignal) {
  return checkoutApi.getConfig(address, cartItems, signal)
}

export async function validateCheckout(input: CheckoutInput, signal?: AbortSignal) {
  return checkoutApi.validate(input, signal)
}

export async function placeOrder(input: CheckoutInput, signal?: AbortSignal) {
  return checkoutApi.placeOrder(input, signal)
}

export async function validateDelivery(location: { latitude: number; longitude: number }, signal?: AbortSignal) {
  return deliveryApi.validate(location, signal)
}

export async function getOrderConfirmation(orderId: string, orderKey: string, signal?: AbortSignal) {
  return orderApi.getConfirmation(orderId, orderKey, signal)
}

export type { OrderConfirmation } from './types'
