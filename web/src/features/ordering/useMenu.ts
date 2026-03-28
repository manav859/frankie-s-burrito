import { useEffect, useMemo, useState } from 'react'
import { getMenu } from './api'
import { clearCache, getCache, isCacheValid, setCache } from './cache'
import type { MenuCollectionCategory, MenuItemCard } from './types'

const MENU_CACHE_KEY = 'ordering-menu:available-24:v3'
const MENU_CACHE_TTL_MS = 5 * 60 * 1000
const MENU_QUERY = {
  availability: 'available' as const,
  limit: 24,
}

type MenuResponse = {
  meta: {
    version: string
    empty: boolean
  }
  categories: MenuCollectionCategory[]
  sections: Array<{
    category: {
      id: number
      slug: string
      name: string
      image: string
      image_alt: string
      count: number
      sort_order: number
      description: string
      cta_label: string
    }
    items: MenuItemCard[]
  }>
  featured: MenuItemCard[]
}

function hasCustomizationFields(item: MenuItemCard) {
  return Array.isArray(item.add_on_groups) && typeof item.allergens_enabled === 'boolean'
}

function isUsableMenuCache(value: MenuResponse | null): value is MenuResponse {
  if (!value || !Array.isArray(value.categories)) {
    return false
  }

  return value.categories.every((category) => Array.isArray(category.items) && category.items.every(hasCustomizationFields))
}

export function useMenu(enabled: boolean) {
  const [menu, setMenu] = useState<MenuResponse | null>(() => {
    const cached = getCache<MenuResponse>(MENU_CACHE_KEY)
    return isUsableMenuCache(cached) ? cached : null
  })
  const [loading, setLoading] = useState(() => {
    const cached = getCache<MenuResponse>(MENU_CACHE_KEY)
    return !isUsableMenuCache(cached)
  })
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshIndex, setRefreshIndex] = useState(0)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      setRefreshing(false)
      setError('The ordering API is not configured in this environment yet.')
      return
    }

    const controller = new AbortController()
    const cached = getCache<MenuResponse>(MENU_CACHE_KEY)
    const usableCached = isUsableMenuCache(cached) ? cached : null
    const cacheIsFresh = isCacheValid(MENU_CACHE_KEY)

    if (usableCached) {
      console.log('Loaded from cache')
      setMenu(usableCached)
      setLoading(false)
    } else {
      setLoading(true)
    }

    if (!cacheIsFresh && usableCached) {
      console.log('Loaded stale menu cache, revalidating in background')
    }

    const loadMenu = async () => {
      setRefreshing(true)

      try {
        console.log('Fetching fresh data')
        const response = await getMenu(MENU_QUERY, controller.signal, { bypassResponseCache: true })
        setMenu(response as MenuResponse)
        setCache(MENU_CACHE_KEY, response, MENU_CACHE_TTL_MS, response.meta.version)
        setError(null)
      } catch (caughtError) {
        if (controller.signal.aborted) {
          return
        }

        if (!usableCached) {
          setError(caughtError instanceof Error ? caughtError.message : 'Unable to load the menu.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    void loadMenu()

    return () => controller.abort()
  }, [enabled, refreshIndex])

  const refresh = () => {
    clearCache(MENU_CACHE_KEY)
    setRefreshIndex((current) => current + 1)
  }

  return useMemo(
    () => ({
      categories: menu?.categories || [],
      featured: menu?.featured || [],
      loading,
      refreshing,
      error,
      hasCachedData: Boolean(menu),
      refresh,
    }),
    [error, loading, menu, refreshing],
  )
}
