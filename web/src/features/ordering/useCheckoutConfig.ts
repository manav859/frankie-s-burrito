import { useEffect, useMemo, useState } from 'react'
import { getCheckoutConfig } from './api'
import { getCache, setCache } from './cache'
import type { CartItem, CheckoutConfig } from './types'

const CHECKOUT_CONFIG_CACHE_TTL_MS = 5 * 60 * 1000

function buildCheckoutConfigCacheKey(items: CartItem[]) {
  const signature = items
    .map((item) =>
      [
        item.product_id,
        item.quantity,
        item.selected_options.spice_level?.key || '',
        item.selected_add_ons.map((addon) => `${addon.group_id}:${addon.option_id}`).sort().join(','),
      ].join(':'),
    )
    .join('|')

  return `ordering-checkout-config:v1:${signature || 'empty'}`
}

export function useCheckoutConfig(items: CartItem[], enabled: boolean) {
  const cacheKey = useMemo(() => buildCheckoutConfigCacheKey(items), [items])
  const [config, setConfig] = useState<CheckoutConfig | null>(() => getCache<CheckoutConfig>(cacheKey))
  const [loading, setLoading] = useState(() => enabled && !getCache<CheckoutConfig>(cacheKey))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !items.length) {
      setLoading(false)
      return
    }

    const controller = new AbortController()
    const cached = getCache<CheckoutConfig>(cacheKey)

    if (cached) {
      console.log('Loaded from cache')
      setConfig(cached)
      setLoading(false)
    } else {
      setLoading(true)
    }

    const loadConfig = async () => {
      try {
        console.log('Fetching fresh data')
        const response = await getCheckoutConfig(undefined, items, controller.signal)
        setConfig(response)
        setCache(cacheKey, response, CHECKOUT_CONFIG_CACHE_TTL_MS)
        setError(null)
      } catch (caughtError) {
        if (controller.signal.aborted) {
          return
        }

        if (!cached) {
          setError(caughtError instanceof Error ? caughtError.message : 'Unable to load checkout options.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadConfig()
    return () => controller.abort()
  }, [cacheKey, enabled, items])

  return {
    config,
    loading,
    error,
  }
}
