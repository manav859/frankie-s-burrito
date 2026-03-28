import generatedBootstrap from '../generated/site-bootstrap.json'
import type {
  BlogArchiveMeta,
  EntryAuthor,
  NavigationPayload,
  PageArchiveResponse,
  PageEntry,
  PostArchiveResponse,
  PostArchiveItem,
  PostEntry,
  SettingsPayload,
  SiteBootstrap,
  TaxonomyTerm,
} from '../types'
import { normalizeResponsiveImageAsset } from './media'

import { getBrowserOrigin, getWordPressOrigin, isProxyingWordPressThroughFrontend, WORDPRESS_BASE_URL as ENV_WORDPRESS_BASE } from './env'
const MEMORY_CACHE = new Map<string, { etag: string; data: unknown; cachedAt: number }>()
const REQUEST_CACHE_PREFIX = 'frankies-wp-cache:v3:'
const BROWSER_CACHE_HARD_TTL_MS = 15 * 60 * 1000

type PreviewState = {
  enabled: boolean
  token: string
}

type QueryValue = string | number | boolean | undefined

export function isAbortError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false
  }

  const candidate = error as { name?: string; message?: string }
  return candidate.name === 'AbortError' || candidate.message === 'signal is aborted without reason'
}

function normalizeWordPressUrl(value: string) {
  const browserOrigin = getBrowserOrigin()
  const wordpressBase = getWordPressOrigin()

  if (/^\/wp-(content|includes)\//i.test(value)) {
    if (!wordpressBase) {
      return value
    }

    return `${wordpressBase.replace(/\/$/, '')}${value}`
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

function normalizeTerm(term: Partial<TaxonomyTerm> | undefined): TaxonomyTerm | null {
  if (!term?.slug || !term?.name) {
    return null
  }

  return {
    id: typeof term.id === 'number' ? term.id : 0,
    name: term.name,
    slug: term.slug,
  }
}

function normalizeAuthor(author: Partial<EntryAuthor> | undefined): EntryAuthor | undefined {
  if (!author?.name) {
    return undefined
  }

  const fallbackSlug = author.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return {
    id: typeof author.id === 'number' ? author.id : undefined,
    name: author.name,
    slug: author.slug?.trim() || fallbackSlug || 'author',
  }
}

function normalizeArchiveMeta(archive: Partial<BlogArchiveMeta> | undefined): BlogArchiveMeta {
  const title = archive?.title?.trim() || 'Blog'
  const slug = archive?.slug?.trim() || 'blog'
  const url = archive?.url?.trim() || '/blog'
  const permalink = archive?.permalink?.trim() || url

  return {
    id: typeof archive?.id === 'number' ? archive.id : 0,
    title,
    slug,
    excerpt: archive?.excerpt?.trim() || '',
    url,
    permalink,
    featuredImage: archive?.featuredImage?.trim() || '',
    featuredImageAlt: archive?.featuredImageAlt?.trim() || title,
    featuredImageMedia: normalizeResponsiveImageAsset(archive?.featuredImageMedia),
    pageForPostsId: typeof archive?.pageForPostsId === 'number' ? archive.pageForPostsId : 0,
    isAssigned: Boolean(archive?.isAssigned),
    showOnFront: archive?.showOnFront?.trim() || 'posts',
    seo: archive?.seo || {
      title,
      description: archive?.excerpt?.trim() || '',
      canonicalUrl: permalink,
      ogImage: archive?.featuredImage?.trim() || '',
      noindex: false,
    },
  }
}

function normalizeArchiveItem(item: Partial<PostArchiveItem>): PostArchiveItem {
  const title = item.title?.trim() || 'Untitled post'
  const slug = item.slug?.trim() || ''
  const url = item.url?.trim() || (slug ? `/blog/${slug}` : '/blog')
  const permalink = item.permalink?.trim() || url

  return {
    title,
    slug,
    status: item.status?.trim() || undefined,
    url,
    permalink,
    excerpt: item.excerpt?.trim() || '',
    featuredImage: item.featuredImage?.trim() || '',
    featuredImageAlt: item.featuredImageAlt?.trim() || title,
    featuredImageMedia: normalizeResponsiveImageAsset(item.featuredImageMedia),
    publishedAt: item.publishedAt?.trim() || '',
    modifiedAt: item.modifiedAt?.trim() || undefined,
    author: normalizeAuthor(item.author),
    readingTimeMinutes:
      typeof item.readingTimeMinutes === 'number' && item.readingTimeMinutes > 0
        ? Math.round(item.readingTimeMinutes)
        : undefined,
    categories: (item.categories || []).map(normalizeTerm).filter(Boolean) as TaxonomyTerm[],
    tags: (item.tags || []).map(normalizeTerm).filter(Boolean) as TaxonomyTerm[],
    seo: item.seo || {
      title,
      description: item.excerpt?.trim() || '',
      canonicalUrl: permalink,
      ogImage: item.featuredImage?.trim() || '',
      noindex: false,
    },
  }
}

function normalizeArchiveResponse(payload: PostArchiveResponse): PostArchiveResponse {
  return {
    ...payload,
    archive: normalizeArchiveMeta(payload.archive),
    items: (payload.items || []).map(normalizeArchiveItem),
    categories: (payload.categories || []).map(normalizeTerm).filter(Boolean) as TaxonomyTerm[],
    tags: (payload.tags || []).map(normalizeTerm).filter(Boolean) as TaxonomyTerm[],
    filters: {
      category: payload.filters?.category || '',
      tag: payload.filters?.tag || '',
      search: payload.filters?.search || '',
    },
    pagination: {
      page: payload.pagination?.page || 1,
      perPage: payload.pagination?.perPage || Math.max(1, payload.items?.length || 0),
      totalItems: payload.pagination?.totalItems || payload.items?.length || 0,
      totalPages: payload.pagination?.totalPages || (payload.items?.length ? 1 : 0),
    },
  }
}

function normalizePostEntry(payload: PostEntry): PostEntry {
  const normalized = normalizeArchiveItem(payload)

  return {
    ...payload,
    ...normalized,
    type: 'post',
    content: payload.content || '',
    archive: normalizeArchiveMeta(payload.archive),
    related: (payload.related || []).map(normalizeArchiveItem),
  }
}

function normalizePageEntry(payload: PageEntry): PageEntry {
  return {
    ...payload,
    type: 'page',
    title: payload.title?.trim() || 'Untitled page',
    slug: payload.slug?.trim() || '',
    content: payload.content || '',
    featuredImage: payload.featuredImage?.trim() || '',
    featuredImageAlt: payload.featuredImageAlt?.trim() || payload.title?.trim() || 'Untitled page',
    featuredImageMedia: normalizeResponsiveImageAsset(payload.featuredImageMedia),
    modifiedAt: payload.modifiedAt?.trim() || undefined,
  }
}

function normalizePageArchiveResponse(payload: PageArchiveResponse): PageArchiveResponse {
  return {
    ...payload,
    items: (payload.items || []).map((item) => ({
      ...item,
      title: item.title?.trim() || 'Untitled page',
      slug: item.slug?.trim() || '',
      featuredImage: item.featuredImage?.trim() || '',
      featuredImageAlt: item.featuredImageAlt?.trim() || item.title?.trim() || 'Untitled page',
      featuredImageMedia: normalizeResponsiveImageAsset(item.featuredImageMedia),
      modifiedAt: item.modifiedAt?.trim() || undefined,
    })),
  }
}

// getWordPressBase is now getWordPressOrigin imported from env.ts

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
    return window.localStorage
  } catch {
    return null
  }
}

function clearCachedValue(key: string) {
  MEMORY_CACHE.delete(key)

  const storage = getStorage()
  if (!storage) {
    return
  }

  try {
    storage.removeItem(`${REQUEST_CACHE_PREFIX}${key}`)
  } catch {
    // Ignore storage issues while clearing stale cache entries.
  }
}

function isExpiredCacheEntry(entry: { cachedAt?: number }) {
  if (!entry.cachedAt) {
    return true
  }

  return Date.now() - entry.cachedAt > BROWSER_CACHE_HARD_TTL_MS
}

function readCachedValue<T>(key: string): { etag: string; data: T; cachedAt: number } | null {
  const inMemory = MEMORY_CACHE.get(key)
  if (inMemory) {
    if (isExpiredCacheEntry(inMemory)) {
      clearCachedValue(key)
      return null
    }

    return inMemory as { etag: string; data: T; cachedAt: number }
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

    const parsed = JSON.parse(raw) as { etag: string; data: T; cachedAt: number }
    if (isExpiredCacheEntry(parsed)) {
      clearCachedValue(key)
      return null
    }

    MEMORY_CACHE.set(key, parsed)
    return parsed
  } catch {
    clearCachedValue(key)
    return null
  }
}

function writeCachedValue<T>(key: string, entry: { etag: string; data: T }) {
  const cacheEntry = { ...entry, cachedAt: Date.now() }
  MEMORY_CACHE.set(key, cacheEntry)

  const storage = getStorage()
  if (!storage) {
    return
  }

  try {
    storage.setItem(`${REQUEST_CACHE_PREFIX}${key}`, JSON.stringify(cacheEntry))
  } catch {
    // Ignore storage quota issues and keep the in-memory cache.
  }
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

  // When the frontend dev server proxies WordPress, `/?rest_route=...` resolves
  // against the app origin and can return the SPA shell HTML instead of JSON.
  if (isProxyingWordPressThroughFrontend()) {
    return [pretty]
  }

  const fallbackParams = new URLSearchParams(params)
  fallbackParams.set('rest_route', normalizedRoute)
  const fallback = `/?${fallbackParams.toString()}`

  return [pretty, fallback]
}

function isJsonResponse(response: Response) {
  const contentType = response.headers.get('content-type') || ''
  return /\bapplication\/([\w.+-]*json)\b/i.test(contentType)
}

async function fetchWordPressJson<T>(
  route: string,
  options?: {
    signal?: AbortSignal
    query?: Record<string, QueryValue>
  },
): Promise<T> {
  const wordpressBase = getWordPressOrigin()

  if (!wordpressBase) {
    throw new Error('Missing VITE_WORDPRESS_BASE_URL or reachable local WordPress backend')
  }

  const previewState = getPreviewState()
  const cacheKey = buildRequestCacheKey(route, options?.query, previewState)
  const cachedEntry = previewState.enabled ? null : readCachedValue<T>(cacheKey)
  const headers = createHeaders(previewState)

  if (cachedEntry?.etag) {
    headers['If-None-Match'] = cachedEntry.etag
  }

  for (const endpoint of buildEndpointCandidates(route, options?.query)) {
    let response: Response

    try {
      response = await fetch(`${wordpressBase}${endpoint}`, {
        signal: options?.signal,
        headers,
        cache: previewState.enabled ? 'no-store' : 'no-cache',
      })
    } catch (error) {
      if (isAbortError(error)) {
        throw error
      }

      continue
    }

    if (response.status === 304 && cachedEntry) {
      return normalizeWordPressPayload(cachedEntry.data)
    }

    if (!response.ok) {
      continue
    }

    if (!isJsonResponse(response)) {
      continue
    }

    const payload = normalizeWordPressPayload((await response.json()) as T)

    if (!previewState.enabled) {
      const etag = response.headers.get('etag')
      if (etag) {
        writeCachedValue(cacheKey, { etag, data: payload })
      }
    }

    return payload
  }

  throw new Error(`WordPress request failed for route ${route}`)
}

export function getGeneratedBootstrap(): SiteBootstrap {
  return normalizeWordPressPayload(generatedBootstrap as unknown as SiteBootstrap)
}

export function getCachedBootstrap(): SiteBootstrap | null {
  const cached = readCachedValue<SiteBootstrap>(
    buildRequestCacheKey('/frankies/v1/bootstrap', undefined, { enabled: false, token: '' }),
  )

  return cached ? normalizeWordPressPayload(cached.data) : null
}

export function getInitialBootstrap(): SiteBootstrap {
  return getCachedBootstrap() ?? getGeneratedBootstrap()
}

export async function getSiteBootstrap(signal?: AbortSignal): Promise<SiteBootstrap> {
  if (!getWordPressOrigin()) {
    return getGeneratedBootstrap()
  }

  return fetchWordPressJson<SiteBootstrap>('/frankies/v1/bootstrap', { signal })
}

export async function getSettings(signal?: AbortSignal): Promise<SettingsPayload | null> {
  if (!getWordPressOrigin()) {
    return null
  }

  try {
    return await fetchWordPressJson<SettingsPayload>('/frankies/v1/settings', { signal })
  } catch {
    return null
  }
}

export async function getNavigation(signal?: AbortSignal): Promise<NavigationPayload | null> {
  if (!getWordPressOrigin()) {
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
  const payload = await fetchWordPressJson<PostArchiveResponse>('/frankies/v1/blog', { signal, query })
  return normalizeArchiveResponse(payload)
}

export async function getPostBySlug(slug: string, signal?: AbortSignal): Promise<PostEntry> {
  const payload = await fetchWordPressJson<PostEntry>(`/frankies/v1/blog/${encodeURIComponent(slug)}`, { signal })
  return normalizePostEntry(payload)
}

export async function getPages(signal?: AbortSignal): Promise<PageArchiveResponse> {
  return normalizePageArchiveResponse(await fetchWordPressJson<PageArchiveResponse>('/frankies/v1/pages', { signal }))
}

export async function getPageBySlug(slug: string, signal?: AbortSignal): Promise<PageEntry> {
  return normalizePageEntry(await fetchWordPressJson<PageEntry>(`/frankies/v1/pages/${encodeURIComponent(slug)}`, { signal }))
}

export function hasWordPressBase() {
  return Boolean(getWordPressOrigin())
}
