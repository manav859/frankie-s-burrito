import { useEffect, useState } from 'react'
import { getLocationChangeEventName } from './navigation'
import { getAppRoute, type AppRoute } from './routing'

export function useCurrentRoute() {
  const [route, setRoute] = useState<AppRoute>(() =>
    typeof window === 'undefined' ? { kind: 'home' } : getAppRoute(window.location.pathname),
  )

  useEffect(() => {
    const onPopState = () => setRoute(getAppRoute(window.location.pathname))
    const onLocationChange = () => setRoute(getAppRoute(window.location.pathname))

    window.addEventListener('popstate', onPopState)
    window.addEventListener(getLocationChangeEventName(), onLocationChange)

    return () => {
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener(getLocationChangeEventName(), onLocationChange)
    }
  }, [])

  return route
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  )

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)

    update()

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update)
      return () => media.removeEventListener('change', update)
    }

    media.addListener(update)
    return () => media.removeListener(update)
  }, [query])

  return matches
}
