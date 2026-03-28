export type CacheEntry<T> = {
  data: T
  timestamp: number
  ttl: number
  version?: string
}

const CACHE_PREFIX = 'frankies-cache:'
const memoryCache = new Map<string, CacheEntry<unknown>>()

function buildStorageKey(key: string) {
  return `${CACHE_PREFIX}${key}`
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function getCacheEntry<T>(key: string): CacheEntry<T> | null {
  const memoryEntry = memoryCache.get(key) as CacheEntry<T> | undefined
  if (memoryEntry) {
    return memoryEntry
  }

  if (!canUseStorage()) {
    return null
  }

  try {
    const raw = window.localStorage.getItem(buildStorageKey(key))
    if (!raw) {
      return null
    }

    const entry = JSON.parse(raw) as CacheEntry<T>
    if (!entry || typeof entry.timestamp !== 'number' || typeof entry.ttl !== 'number') {
      return null
    }

    memoryCache.set(key, entry as CacheEntry<unknown>)
    return entry
  } catch {
    return null
  }
}

export function getCache<T>(key: string): T | null {
  return getCacheEntry<T>(key)?.data ?? null
}

export function setCache<T>(key: string, data: T, ttl: number, version?: string) {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl,
    version,
  }

  memoryCache.set(key, entry as CacheEntry<unknown>)

  if (!canUseStorage()) {
    return
  }

  try {
    window.localStorage.setItem(buildStorageKey(key), JSON.stringify(entry))
  } catch {
    // Ignore localStorage quota and serialization failures.
  }
}

export function isCacheValid(key: string, version?: string) {
  const entry = getCacheEntry(key)
  if (!entry) {
    return false
  }

  if (version && entry.version && entry.version !== version) {
    return false
  }

  return Date.now() - entry.timestamp <= entry.ttl
}

export function clearCache(key: string) {
  memoryCache.delete(key)

  if (!canUseStorage()) {
    return
  }

  try {
    window.localStorage.removeItem(buildStorageKey(key))
  } catch {
    // Ignore storage cleanup failures.
  }
}
