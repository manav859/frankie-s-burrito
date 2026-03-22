import { useEffect, useState } from 'react'
import { getAppRoute, type AppRoute } from './routing'

export function useCurrentRoute() {
  const [route, setRoute] = useState<AppRoute>(() =>
    typeof window === 'undefined' ? { kind: 'home' } : getAppRoute(window.location.pathname),
  )

  useEffect(() => {
    const onPopState = () => setRoute(getAppRoute(window.location.pathname))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  return route
}
