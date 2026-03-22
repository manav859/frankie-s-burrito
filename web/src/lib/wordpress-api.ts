import generatedBootstrap from '../generated/site-bootstrap.json'
import type {
  NavigationPayload,
  PageArchiveResponse,
  PageEntry,
  PostArchiveResponse,
  PostEntry,
  SettingsPayload,
  SiteBootstrap,
} from '../types'

const ENV_WORDPRESS_BASE = import.meta.env.VITE_WORDPRESS_BASE_URL?.replace(/\/$/, '')
const MEMORY_CACHE = new Map<string, { expiresAt: number; data: unknown }>()
const REQUEST_CACHE_PREFIX = 'frankies-wp-cache:'

type PreviewState = {
  enabled: boolean
  token: string
}

type QueryValue = string | number | boolean | undefined

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

function normalizeWordPressUrl(value: string) {
  const browserOrigin = getBrowserOrigin()
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

function normalizeWordPressPayload<T>(value: T): T {
  if (typeof value === 'string') {
    return normalizeWordPressUrl(value) as T
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeWordPressPayload(entry)) as T
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeWordPressPayload(entry)]),
    ) as T
  }

  return value
}

function getWordPressBase() {
  if (isProxyingWordPressThroughFrontend()) {
    return getBrowserOrigin()
  }

  if (ENV_WORDPRESS_BASE) {
    return ENV_WORDPRESS_BASE
  }

  if (typeof window !== 'undefined' && /^https?:$/i.test(window.location.protocol)) {
    const { protocol, hostname, port, origin } = window.location
    const normalizedOrigin = origin.replace(/\/$/, '')

    if ((hostname === 'localhost' || hostname === '127.0.0.1') && port !== '8080') {
      return `${protocol}//${hostname}:8080`
    }

    return normalizedOrigin
  }

  return ''
}

function resolveDefaultTtl(route: string) {
  if (route.includes('/bootstrap')) {
    return 0
  }

  if (route.includes('/posts/') || route.includes('/pages/')) {
    return 300_000
  }

  return 120_000
}

function buildRequestCacheKey(route: string, query?: Record<string, QueryValue>, previewState?: PreviewState) {
  const params = new URLSearchParams()

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === '') {
        continue
      }

      params.set(key, String(value))
    }
  }

  return `${route}?${params.toString()}|preview=${previewState?.enabled ? '1' : '0'}|token=${previewState?.token || ''}`
}

function getStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function readCachedValue<T>(key: string): T | null {
  const now = Date.now()
  const inMemory = MEMORY_CACHE.get(key)
  if (inMemory && inMemory.expiresAt > now) {
    return inMemory.data as T
  }

  const storage = getStorage()
  if (!storage) {
    return null
  }

  try {
    const raw = storage.getItem(`${REQUEST_CACHE_PREFIX}${key}`)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as { expiresAt: number; data: T }
    if (parsed.expiresAt <= now) {
      storage.removeItem(`${REQUEST_CACHE_PREFIX}${key}`)
      return null
    }

    MEMORY_CACHE.set(key, parsed)
    return parsed.data
  } catch {
    return null
  }
}

function writeCachedValue<T>(key: string, data: T, ttlMs: number) {
  const entry = {
    expiresAt: Date.now() + ttlMs,
    data,
  }

  MEMORY_CACHE.set(key, entry)

  const storage = getStorage()
  if (!storage) {
    return
  }

  try {
    storage.setItem(`${REQUEST_CACHE_PREFIX}${key}`, JSON.stringify(entry))
  } catch {
    // Ignore storage quota issues and keep the in-memory cache.
  }
}

function parseCacheControlMaxAge(cacheControl: string | null, route: string) {
  if (!cacheControl) {
    return resolveDefaultTtl(route)
  }

  const match = cacheControl.match(/max-age=(\d+)/i)
  if (!match) {
    return resolveDefaultTtl(route)
  }

  return Number(match[1]) * 1000
}

function getPreviewState(): PreviewState {
  if (typeof window === 'undefined') {
    return { enabled: false, token: '' }
  }

  const params = new URLSearchParams(window.location.search)
  return {
    enabled: params.get('preview') === '1',
    token: params.get('token') || '',
  }
}

function createHeaders(previewState: PreviewState): Record<string, string> {
  return previewState.enabled && previewState.token
    ? { 'x-frankies-preview-token': previewState.token }
    : {}
}

function buildEndpointCandidates(route: string, query?: Record<string, QueryValue>) {
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

  const prettyParams = params.toString()
  const pretty = `/wp-json${normalizedRoute}${prettyParams ? `?${prettyParams}` : ''}`

  const fallbackParams = new URLSearchParams(params)
  fallbackParams.set('rest_route', normalizedRoute)
  const fallback = `/?${fallbackParams.toString()}`

  return [pretty, fallback]
}

async function fetchWordPressJson<T>(
  route: string,
  options?: {
    signal?: AbortSignal
    query?: Record<string, QueryValue>
  },
): Promise<T> {
  const wordpressBase = getWordPressBase()

  if (!wordpressBase) {
    throw new Error('Missing VITE_WORDPRESS_BASE_URL')
  }

  const previewState = getPreviewState()
  const cacheKey = buildRequestCacheKey(route, options?.query, previewState)
  const cacheable = !previewState.enabled && !route.includes('/bootstrap') && !route.includes('/settings') && !route.includes('/navigation')

  if (cacheable) {
    const cached = readCachedValue<T>(cacheKey)
    if (cached) {
      return cached
    }
  }

  const headers = createHeaders(previewState)

  for (const endpoint of buildEndpointCandidates(route, options?.query)) {
    const response = await fetch(`${wordpressBase}${endpoint}`, {
      signal: options?.signal,
      headers,
      cache: cacheable ? 'default' : 'no-store',
    })

    if (!response.ok) {
      continue
    }

    const payload = normalizeWordPressPayload((await response.json()) as T)

    if (cacheable) {
      writeCachedValue(cacheKey, payload, parseCacheControlMaxAge(response.headers.get('cache-control'), route))
    }

    return payload
  }

  throw new Error(`WordPress request failed for route ${route}`)
}

export function getGeneratedBootstrap(): SiteBootstrap {
  return normalizeWordPressPayload(generatedBootstrap as unknown as SiteBootstrap)
}

export async function getSiteBootstrap(signal?: AbortSignal): Promise<SiteBootstrap> {
  if (!getWordPressBase()) {
    return getGeneratedBootstrap()
  }

  try {
    return await fetchWordPressJson<SiteBootstrap>('/frankies/v1/bootstrap', { signal })
  } catch {
    return getGeneratedBootstrap()
  }
}

export async function getSettings(signal?: AbortSignal): Promise<SettingsPayload | null> {
  if (!getWordPressBase()) {
    return null
  }

  try {
    return await fetchWordPressJson<SettingsPayload>('/frankies/v1/settings', { signal })
  } catch {
    return null
  }
}

export async function getNavigation(signal?: AbortSignal): Promise<NavigationPayload | null> {
  if (!getWordPressBase()) {
    return null
  }

  try {
    return await fetchWordPressJson<NavigationPayload>('/frankies/v1/navigation', { signal })
  } catch {
    return null
  }
}

export async function getPosts(
  query?: Record<string, QueryValue>,
  signal?: AbortSignal,
): Promise<PostArchiveResponse> {
  return fetchWordPressJson<PostArchiveResponse>('/frankies/v1/posts', { signal, query })
}

export async function getPostBySlug(slug: string, signal?: AbortSignal): Promise<PostEntry> {
  return fetchWordPressJson<PostEntry>(`/frankies/v1/posts/${encodeURIComponent(slug)}`, { signal })
}

export async function getPages(signal?: AbortSignal): Promise<PageArchiveResponse> {
  return fetchWordPressJson<PageArchiveResponse>('/frankies/v1/pages', { signal })
}

export async function getPageBySlug(slug: string, signal?: AbortSignal): Promise<PageEntry> {
  return fetchWordPressJson<PageEntry>(`/frankies/v1/pages/${encodeURIComponent(slug)}`, { signal })
}

export function hasWordPressBase() {
  return Boolean(getWordPressBase())
}
